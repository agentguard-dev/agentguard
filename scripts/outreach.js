// Outreach-Tool: findet öffentliche Repos, die Coding-Agents nutzen
// (AGENTS.md), lädt sie als Tarball herunter, scannt sie und erzeugt
// einen Befund-Ordner für deinen Outreach.
//
// Nutzung:
//   GITHUB_TOKEN=ghp_xxx node scripts/outreach.js --limit 10
//
// Hinweis: Die Code-Suche der GitHub-API benötigt einen Token; ohne Token
// wird auf die Repository-Suche (höheres Rauschen) zurückgefallen.
import fs from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scanRepo } from "../src/scanner.js";
import { formatMarkdown } from "../src/findings.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "outreach");

function argValue(args, name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
}

function readToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  // Fallback: Datei außerhalb des Repos, damit der Token nie im Repo landet.
  const p = path.join(process.env.HOME ?? "", ".config", "agentguard", "github-token");
  try {
    return fs.readFileSync(p, "utf8").trim();
  } catch {
    return undefined;
  }
}

async function api(url, token) {
  const headers = { Accept: "application/vnd.github+json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GitHub API HTTP ${res.status}`);
  return res.json();
}

async function findRepos(limit, token) {
  try {
    const query = encodeURIComponent("AGENTS.md in:path");
    const data = await api(`https://api.github.com/search/code?q=${query}&per_page=${limit}`, token);
    return (data.items ?? []).map((i) => ({
      repo: i.repository.full_name,
      branch: null, // code search results carry no default_branch — resolved below
    }));
  } catch {
    // Fallback: Repository-Suche über README-Erwähnungen.
    const q = encodeURIComponent("AGENTS.md in:readme");
    const data = await api(`https://api.github.com/search/repositories?q=${q}&per_page=${limit}`, token);
    return (data.items ?? []).map((r) => ({ repo: r.full_name, branch: r.default_branch }));
  }
}

async function resolveBranch(repo, branch, token) {
  if (branch) return branch;
  try {
    const data = await api(`https://api.github.com/repos/${repo}`, token);
    return data.default_branch ?? "main";
  } catch {
    return "main";
  }
}

async function downloadAndExtract(repoName, branch, dir) {
  const res = await fetch(`https://codeload.github.com/${repoName}/tar.gz/${branch}`);
  if (!res.ok) throw new Error(`download failed (HTTP ${res.status})`);
  fs.writeFileSync(path.join(dir, "repo.tar.gz"), Buffer.from(await res.arrayBuffer()));
  execSync("tar xzf repo.tar.gz --strip-components=1", { cwd: dir, stdio: "ignore" });
}

async function main() {
  const args = process.argv.slice(2);
  const limit = Number(argValue(args, "--limit", "10"));
  const token = readToken();

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const repos = await findRepos(limit, token);
  console.log(`Found ${repos.length} candidate repos`);

  const results = [];
  const resolved = await Promise.all(
    repos.map((r) => resolveBranch(r.repo, r.branch, token).then((branch) => ({ ...r, branch })))
  );
  for (const { repo, branch } of resolved) {
    const dir = path.join(OUT_DIR, repo.replace("/", "__"));
    fs.mkdirSync(dir, { recursive: true });
    try {
      process.stdout.write(`scanning ${repo}… `);
      await downloadAndExtract(repo, branch, dir);
      const report = scanRepo(dir, { useEngine: false, customExcludes: ["node_modules", ".git"] });
      const critical = report.summary.bySeverity.critical;
      fs.writeFileSync(path.join(dir, "report.md"), `# ${repo}\n\n${formatMarkdown(report)}`);
      console.log(`grade ${report.summary.grade}, ${report.summary.count} findings (${critical} critical)`);
      results.push({ repo, grade: report.summary.grade, count: report.summary.count, critical });
    } catch (e) {
      console.log(`FAILED: ${e.message}`);
    }
  }

  fs.writeFileSync(
    path.join(OUT_DIR, "summary.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)
  );
  console.log(`\nDone. Ergebnisse: ${OUT_DIR}/summary.json`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
