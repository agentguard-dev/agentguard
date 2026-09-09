// AgentGuard Pro-Server — GitHub-App Webhook-Handler (keine externen Deps).
//
// Ablauf bei einem Pull-Request:
//   Webhook (HMAC-verifiziert) → Tarball-Checkout des PR-Head → Scan
//   → Check-Run (merge gate) → PR-Kommentar mit Note + Findings.
//
// Konfiguration (~/.config/agentguard/app-config.json oder Umgebungsvariablen):
//   appId            AGENTGUARD_APP_ID
//   privateKeyPath   AGENTGUARD_PRIVATE_KEY_PATH  (GitHub-App private key)
//   webhookSecret    AGENTGUARD_WEBHOOK_SECRET
//   port             AGENTGUARD_PORT (default 4000)
//
// Demo-Modus (kein GitHub, kein Netzwerk):
//   node server/app.js --demo     → verarbeitet das Fixture-Repo lokal
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import crypto from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { scanRepo } from "../src/scanner.js";
import { formatMarkdown } from "../src/findings.js";
import { downloadWithLimit, extractTarball } from "../src/tarutil.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API = "https://api.github.com";
const MAX_WEBHOOK_BODY = 1024 * 1024; // 1 MB — GitHub-Webhooks sind ~10–50 KB groß

function loadConfig() {
  const cfgPath = path.join(os.homedir(), ".config", "agentguard", "app-config.json");
  let fileCfg = {};
  try {
    fileCfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  } catch {}
  return {
    appId: process.env.AGENTGUARD_APP_ID || fileCfg.appId,
    privateKeyPath: process.env.AGENTGUARD_PRIVATE_KEY_PATH || fileCfg.privateKeyPath,
    webhookSecret: process.env.AGENTGUARD_WEBHOOK_SECRET || fileCfg.webhookSecret,
    port: Number(process.env.AGENTGUARD_PORT || fileCfg.port || 4000),
  };
}

// --- GitHub App Auth (RS256-JWT → Installation-Token) ----------------------
function appJwt(cfg) {
  const key = fs.readFileSync(cfg.privateKeyPath, "utf8");
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = { iat: now - 30, exp: now + 540, iss: Number(cfg.appId) };
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const data = `${b64(header)}.${b64(payload)}`;
  const sig = crypto.sign("RSA-SHA256", Buffer.from(data), key).toString("base64url");
  return `${data}.${sig}`;
}

async function installationToken(cfg, repo) {
  const jwt = appJwt(cfg);
  // Installation gezielt für das Webhook-Repo auflösen — nie blind die erste
  // Installation nehmen (Multi-Installation-Apps würden sonst das falsche
  // Repo scannen und kommentieren).
  const instRes = await fetch(`${API}/repos/${repo}/installation`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  if (!instRes.ok) throw new Error(`Keine Installation für ${repo} gefunden (HTTP ${instRes.status})`);
  const inst = await instRes.json();
  const tokenRes = await fetch(`${API}/app/installations/${inst.id}/access_tokens`, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
  });
  if (!tokenRes.ok) throw new Error(`Access-Token fehlgeschlagen (HTTP ${tokenRes.status})`);
  const tokenData = await tokenRes.json();
  return tokenData.token;
}

// --- Webhook-HMAC (X-Hub-Signature-256) -------------------------------------
export function verifySignature(rawBody, signature, secret) {
  if (!signature || !secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const given = signature.replace(/^sha256=/, "");
  // Länge/Format VOR timingSafeEqual prüfen: bei unterschiedlichen
  // Pufferlängen wirft timingSafeEqual und reißt den Handler mit (DoS).
  if (!/^[0-9a-f]{64}$/i.test(given)) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(given));
}

// --- Event-Interpretation ----------------------------------------------------
export function parseWebhookEvent(payload) {
  if (!["opened", "synchronize"].includes(payload?.action)) return null;
  const pr = payload.pull_request;
  if (!pr || !pr.head?.sha) return null;
  return {
    repo: payload.repository.full_name,
    sha: pr.head.sha,
    number: pr.number,
    title: pr.title,
  };
}

// --- Scan + Kommentar ----------------------------------------------------------
async function checkoutAndScan(repo, sha, tmpBase) {
  const dir = fs.mkdtempSync(path.join(tmpBase, `ag-${repo.replace("/", "__")}-`));
  try {
    const tar = path.join(dir, "repo.tar.gz");
    const res = await fetch(`https://codeload.github.com/${repo}/tar.gz/${sha}`);
    if (!res.ok) throw new Error(`checkout failed (HTTP ${res.status})`);
    await downloadWithLimit(res, tar);
    extractTarball(tar, dir, { stripComponents: 1 });
    // PR-Heads sind untrusted: .agentguard-ignore aus dem PR nie honorieren.
    const report = scanRepo(dir, { useEngine: false, honorIgnoreFile: false, customExcludes: ["node_modules", ".git"] });
    return report;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function commentBody(report, repo) {
  const top = report.findings.slice(0, 10);
  const rows = top
    .map((f) => `| ${f.severity} | \`${f.id}\` | \`${f.file}\` | ${f.description} |`)
    .join("\n");
  return `## 🛡️ AgentGuard — Note ${report.summary.grade} (${report.summary.count} Findings)

| Severity | Regel | Datei | Befund |
|---|---|---|---|
${rows || "| - | - | - | keine Findings |"}

_Automatisch generiert · Free-Report, Pro blockt kritische Findings · [AgentGuard](https://github.com/agentguard-dev/agentguard)_`;
}

async function postReport(token, event, report) {
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" };
  // Check-Run als Merge-Gate
  const body = {
    name: "AgentGuard",
    head_sha: event.sha,
    status: "completed",
    conclusion: report.summary.bySeverity.critical > 0 ? "failure" : "success",
    output: {
      title: `AgentGuard: ${report.summary.grade} (${report.summary.count} findings)`,
      summary: formatMarkdown(report).slice(0, 6000),
    },
  };
  const crRes = await fetch(`${API}/repos/${event.repo}/check-runs`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!crRes.ok) throw new Error(`Check-Run fehlgeschlagen (HTTP ${crRes.status})`);
  // PR-Kommentar (idempotent über Marker)
  const listRes = await fetch(`${API}/repos/${event.repo}/issues/${event.number}/comments`, { headers });
  if (!listRes.ok) throw new Error(`Kommentar-Liste fehlgeschlagen (HTTP ${listRes.status})`);
  const list = await listRes.json();
  const already = (Array.isArray(list) ? list : []).some((c) => c.body?.includes("## 🛡️ AgentGuard"));
  if (already) return "already-commented";
  const commentRes = await fetch(`${API}/repos/${event.repo}/issues/${event.number}/comments`, {
    method: "POST",
    headers,
    body: JSON.stringify({ body: commentBody(report, event.repo) }),
  });
  if (!commentRes.ok) throw new Error(`Kommentar fehlgeschlagen (HTTP ${commentRes.status})`);
  return "posted";
}

// --- Demo (lokal, ohne GitHub) ------------------------------------------------
export async function runDemo() {
  const outDir = path.join(__dirname, "demo-output");
  fs.mkdirSync(outDir, { recursive: true });
  const fixture = path.join(__dirname, "..", "test", "fixtures", "vulnerable");
  const report = scanRepo(fixture, { useEngine: false });
  fs.writeFileSync(path.join(outDir, "scan-report.md"), formatMarkdown(report));
  fs.writeFileSync(path.join(outDir, "pr-comment.md"), commentBody(report, "demo/repo"));
  fs.writeFileSync(
    path.join(outDir, "check-run.json"),
    JSON.stringify({ name: "AgentGuard", conclusion: report.summary.bySeverity.critical > 0 ? "failure" : "success" }, null, 2)
  );
  return outDir;
}

// --- Server --------------------------------------------------------------------
async function main() {
  const demo = process.argv.includes("--demo");
  if (demo) {
    const out = await runDemo();
    console.log(`✅ Demo ohne GitHub ausgeführt. Output: ${out}`);
    return;
  }

  const cfg = loadConfig();
  if (!cfg.webhookSecret) throw new Error("AGENTGUARD_WEBHOOK_SECRET / config fehlt");

  const server = http.createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/ping") {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ status: "ok", service: "agentguard-pro" }));
    }
    if (req.method === "POST" && req.url === "/webhook") {
      try {
        const chunks = [];
        let size = 0;
        for await (const c of req) {
          size += c.length;
          if (size > MAX_WEBHOOK_BODY) {
            res.writeHead(413);
            return res.end("payload too large");
          }
          chunks.push(c);
        }
        const raw = Buffer.concat(chunks);
        const sig = req.headers["x-hub-signature-256"];
        if (!verifySignature(raw, sig, cfg.webhookSecret)) {
          res.writeHead(401);
          return res.end("invalid signature");
        }
        const event = req.headers["x-github-event"];
        if (event !== "pull_request") {
          res.writeHead(200);
          return res.end("ignored");
        }
        const payload = JSON.parse(raw.toString());
        const eventData = parseWebhookEvent(payload);
        if (!eventData) {
          res.writeHead(200);
          return res.end("ignored action");
        }
        res.writeHead(202);
        res.end("accepted");
        const token = await installationToken(cfg, eventData.repo);
        const report = await checkoutAndScan(eventData.repo, eventData.sha, os.tmpdir());
        const status = await postReport(token, eventData, report);
        console.log(`[${eventData.repo}#${eventData.number}] ${report.summary.grade} — ${status}`);
      } catch (e) {
        // Der Handler darf nie als unhandled rejection den Prozess beenden.
        console.error("❌ webhook failed:", e.message);
        if (!res.headersSent) {
          res.writeHead(500);
          res.end("internal error");
        } else {
          res.end();
        }
      }
      return;
    }
    res.writeHead(404);
    res.end();
  });

  server.listen(cfg.port, () => {
    console.log(`AgentGuard Pro-Server läuft auf http://localhost:${cfg.port} (ping → /ping, webhook → /webhook)`);
  });
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((e) => {
    console.error("❌ " + e.message);
    process.exit(1);
  });
}
