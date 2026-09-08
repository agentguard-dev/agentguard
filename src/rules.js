// AgentGuard — deterministic attack-pattern rules for agent configs in repos.
// Pure functions over file content: no I/O, no dependencies, fully testable.

export const ALLOWED_MCP_HOSTS = [
  "github.com",
  "api.github.com",
  "raw.githubusercontent.com",
  "api.deepseek.com",
  "platform.deepseek.com",
  "registry.npmjs.org",
  "api.openai.com",
  "openai.com",
  "api.anthropic.com",
  "anthropic.com",
  "mcp.ai.azure.com",
  "learn.microsoft.com",
  "context7.com",
];

const ALLOWED_IMAGE_HOSTS =
  /^(img\.shields\.io|badge\.fury\.io|github\.com|raw\.githubusercontent\.com|mybinder\.org)$/i;

// Phrase used by attackers to override the agent's actual instructions.
// Deliberately strict: generic phrases like "you are now" are everyday
// prose, not attack signals.
const OVERRIDE_PHRASE =
  /(ignore\s+all\s+previous\s+instructions|disregard(?:ing)?\s+previous\s+instructions|this is a new context|do not (?:tell|reveal|mention).{0,30}user|system prompt override|new instructions follow|override\s+the\s+above)/i;

// Operations an attacker would want the agent to run.
const DANGEROUS_OP =
  /(curl\s+-|rm\s+-rf\s+[~/]|git\s+push\s+--force|base64\s+-d|\|\s*(?:ba|z)?sh\b|bash\s+-c|sh\s+-c|nc\s+-e)/i;

// Host pattern used by MCP typo-squatting (e.g. api-github-helper.com).
const SQUAT_HOST =
  /^(?:api|www|dev|app)?-?(?:github|claude|codex|anthropic|openai|deepseek)[a-z0-9-]*\.(?:com|net|io|org|xyz|dev)$/i;

const EXFIL_URL =
  /(curl|wget)\s+[^\n]*https?:\/\/[^\s'")>]+[^\n]{0,160}(--data|--data-raw|-d\s|key|\/tmp|\/etc|token|\.env|id_rsa)/i;

const ZERO_WIDTH = /[\u200B\u200C\u200D\u2060]/;

function lineOf(content, index) {
  return content.slice(0, index).split("\n").length;
}

function finding(id, severity, description, evidence) {
  return { id, severity, description, evidence };
}

function isMarkdown(rel) {
  return /\.md$/i.test(rel);
}

function under(rel, dir) {
  return rel === dir || rel.startsWith(dir + "/");
}

function hasOverrideAndOp(content) {
  if (!OVERRIDE_PHRASE.test(content)) return null;
  if (DANGEROUS_OP.test(content) || EXFIL_URL.test(content)) return "critical";
  return "high";
}

function stripBom(content) {
  return content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
}

// ---------------------------------------------------------------------------
// Rule 1 — Instruction override in instruction/markdown files (AGENTS.md & co.)
export const INSTR_OVR_001 = {
  id: "INSTR-OVR-001",
  severity: null, // computed per finding (critical or high)
  description:
    "Instruction-override phrase combined with a dangerous operation in an agent-facing file (AGENTS.md, skills, docs).",
  scan({ rel, content }) {
    if (!isMarkdown(rel) && !/agent|instructions/i.test(rel)) return null;
    const severity = hasOverrideAndOp(stripBom(content));
    if (!severity) return null;
    return finding(
      this.id,
      severity,
      "File contains an instruction-override phrase ('ignore previous instructions') together with a dangerous operation",
      content.match(OVERRIDE_PHRASE)?.[0] ?? "override phrase"
    );
  },
};

// Attack-relevant zero-width chars that are NOT part of multi-codepoint emoji.
// Attack pattern: invisible char woven into ASCII text ("curl<ZWSP> -s ...").
// Legit pattern: ZWJ between two non-ASCII emoji codepoints (🧑🚀).
function isAttackZeroWidth(content) {
  for (let i = 0; i < content.length; i++) {
    const c = content.charCodeAt(i);
    if (c !== 0x200b && c !== 0x200c && c !== 0x200d && c !== 0x2060) continue;
    const prev = content[i - 1];
    const next = content[i + 1];
    const nearAscii =
      (prev !== undefined && prev.charCodeAt(0) < 128) ||
      (next !== undefined && next.charCodeAt(0) < 128);
    if (nearAscii) return true;
  }
  return false;
}

// Rule 2 — Unicode zero-width characters hide instructions from human review.
export const UNICODE_001 = {
  id: "UNICODE-001",
  severity: "critical",
  description:
    "Zero-width characters in a text file can hide instructions from human review while the agent still reads them.",
  scan({ rel, content }) {
    if (!isMarkdown(rel) && !/\.(json|ya?ml|toml|txt)$/i.test(rel)) return null;
    if (!isAttackZeroWidth(stripBom(content))) return null;
    return finding(
      this.id,
      "critical",
      "Zero-width Unicode characters adjacent to text (invisible instruction injection)",
      "U+200B/U+200C/U+200D/U+2060 detected"
    );
  },
};

// Actual agent MCP config files (not e.g. docs data catalogs of MCP servers).
const MCP_CONFIG_FILE =
  /(^|\/)(\.?mcp\.json|mcp\.json|claude-mcp\.json)$/i;

// Rule 3 — MCP server endpoint that is not the official host (typo-squatting).
export const MCP_001 = {
  id: "MCP-001",
  severity: "critical",
  description:
    "MCP server URL points to an unverified host; agents will trust and call it.",
  scan({ rel, content }) {
    const isConfigFile =
      MCP_CONFIG_FILE.test(rel) ||
      rel.startsWith(".mcp/") ||
      (/settings\.json$/i.test(rel) && /"mcpServers"/.test(content));
    if (!isConfigFile) return null;
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return null;
    }
    const servers = parsed?.mcpServers;
    if (!servers || typeof servers !== "object") return null;
    for (const [name, cfg] of Object.entries(servers)) {
      const url = typeof cfg === "string" ? cfg : cfg?.url;
      if (!url) continue;
      let host;
      try {
        host = new URL(url).hostname;
      } catch {
        return finding(this.id, "critical", `MCP server '${name}' has an invalid URL`, url.slice(0, 120));
      }
      if (ALLOWED_MCP_HOSTS.includes(host.toLowerCase())) continue;
      if (SQUAT_HOST.test(host)) {
        return finding(
          this.id,
          "critical",
          `MCP server '${name}' uses a typo-squatted host that impersonates an official service`,
          `url: ${url}`
        );
      }
      return finding(
        this.id,
        "medium",
        `MCP server '${name}' uses an unverified host (not in allowlist)`,
        `url: ${url}`
      );
    }
    return null;
  },
};

// Rule 4 — Hook that pipes remote content into a shell (exfiltration/backdoor).
export const HOOK_001 = {
  id: "HOOK-001",
  severity: "critical",
  description:
    "Hook executes remote content or pipes network output into a shell.",
  scan({ rel, content }) {
    if (!under(rel, ".claude/hooks") && !under(rel, ".cursor/hooks") && !under(rel, ".codex/hooks")) return null;
    if (!/(curl|wget)\s+[^\n]*(\|\s*(?:ba|z)?sh)|\|base64\s*-d\s*\|/i.test(content)) return null;
    return finding(
      this.id,
      "critical",
      "Hook pipes network content into a shell — remote code execution vector",
      content.match(/(curl|wget)\s+[^\n]{0,120}/)?.[0]?.trim() ?? "curl | bash"
    );
  },
};

// Rule 5 — API keys/secrets committed (outside *.example templates).
export const SECRET_001 = {
  id: "SECRET-001",
  severity: "critical",
  description: "High-entropy credential pattern committed to the repository.",
  scan({ rel, content }) {
    if (/(\.example|\.sample|\.template|\.bak|\.orig|\.fixture)$/i.test(rel)) return null;
    const patterns = {
      "sk-…": /sk-[A-Za-z0-9]{20,}/g,
      "ghp_…": /ghp_[A-Za-z0-9]{25,}/g,
      "AIza…": /AIza[0-9A-Za-z_-]{30,}/g,
      "AKIA…": /AKIA[0-9A-Z]{16}/g,
      "xox…": /xox[baprs]-[A-Za-z0-9]{10,}/g,
    };
    const detected = [];
    let firstLine = null;
    for (const [kind, re] of Object.entries(patterns)) {
      re.lastIndex = 0;
      if (re.test(content)) {
        detected.push(kind);
        if (firstLine === null) {
          const idx = content.search(re);
          firstLine = idx >= 0 ? lineOf(content, idx) : null;
        }
      }
    }
    if (detected.length === 0) return null;
    return finding(
      this.id,
      "critical",
      `Possible credentials detected in committed file (${detected.join(", ")})`,
      detected.length > 1 ? `${detected.length} credential types, line ${firstLine ?? "?"}` : `line ${firstLine ?? "?"}`
    );
  },
};

// Rule 6 — Tool/skill description containing prompt-judo ("when user asks X, run rm -rf").
export const TOOL_001 = {
  id: "TOOL-001",
  severity: "critical",
  description:
    "Tool/skill description contains instructions to execute destructive commands.",
  scan({ rel, content }) {
    // Agent tool/skill descriptions are markdown; shell scripts with killall
    // or pkill are legitimate debugging tools, not prompt-judo.
    if (!isMarkdown(rel)) return null;
    if (!under(rel, "tools") && !under(rel, "skills") && !under(rel, ".claude/agents")) return null;
    const m =
      /(when the user (?:asks|requests)[^\n]{0,120}?(?:run|execute|delete|exfiltrate|ignore))|(rm\s+-rf\s+\/)|\b(pkill|killall)\b/i.exec(
        content
      );
    if (!m) return null;
    return finding(
      this.id,
      "critical",
      "Description instructs the agent to run destructive/unwanted commands",
      m[0].slice(0, 120)
    );
  },
};

// Badge/tracking hosts that can fingerprint visitors or leak repo metadata.
const SUSPICIOUS_TLDS = ["xyz", "top", "club", "tk", "ml", "ga", "cf", "gq"];

// Rule 7 — README badge/image pointing to a suspicious host.
export const BADGE_001 = {
  id: "BADGE-001",
  severity: "medium",
  description: "README badge/image points to a suspicious host (insecure or fingerprinting).",
  scan({ rel, content }) {
    if (rel.toLowerCase() !== "readme.md") return null;
    const re = /!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/gi;
    let m;
    while ((m = re.exec(content))) {
      let url;
      try {
        url = new URL(m[1]);
      } catch {
        continue;
      }
      const host = url.hostname.toLowerCase();
      const tld = host.split(".").pop();
      const suspicious =
        url.protocol === "http:" ||
        SUSPICIOUS_TLDS.includes(tld) ||
        /track|analytics|beacon/.test(host) ||
        host.endsWith(".example.com") ||
        host.endsWith(".example.org");
      if (suspicious && !ALLOWED_IMAGE_HOSTS.test(host)) {
        return finding(
          this.id,
          "medium",
          `README badge/image uses suspicious host '${host}'`,
          m[1].slice(0, 120)
        );
      }
    }
    return null;
  },
};

// Rule 8 — Agent definition with unrestricted Bash/Write tool access.
export const AGENT_001 = {
  id: "AGENT-001",
  severity: "critical",
  description:
    "Agent definition grants shell or unrestricted write access — a compromised prompt becomes RCE.",
  scan({ rel, content }) {
    if (
      !under(rel, ".claude/agents") &&
      !under(rel, ".codex/agents") &&
      !under(rel, ".cursor/agents")
    ) {
      return null;
    }
    if (/\btools:\s*[^\n]*\bBash\b/i.test(content) || /permissions:[\s\S]{0,200}?allow:[\s\S]{0,200}?Bash/i.test(content)) {
      return finding(
        this.id,
        "critical",
        "Agent has Bash (shell) access — prompt injection becomes remote code execution",
        content.match(/\btools:\s*[^\n]*/i)?.[0]?.slice(0, 120) ?? "tools: Bash"
      );
    }
    return null;
  },
};

// Rule 9 — Command shim containing sudo / destructive permission changes.
export const SUDO_001 = {
  id: "SUDO-001",
  severity: "medium",
  description: "Command shim escalates privileges or changes file permissions.",
  scan({ rel, content }) {
    if (
      !under(rel, ".claude/commands") &&
      !under(rel, ".cursor/commands") &&
      !under(rel, ".codex/commands")
    ) {
      return null;
    }
    const m = /\bsudo\b|chmod\s*777|chown\s+-R\s*0:0|pkill\s+-9/i.exec(content);
    if (!m) return null;
    return finding(
      this.id,
      "medium",
      "Command shim escalates privileges",
      m[0]
    );
  },
};

// Rule 10 — Skill/tool file that exfiltrates via curl with data payload.
export const EXFIL_001 = {
  id: "EXFIL-001",
  severity: "critical",
  description:
    "Skill/tool file contains an outbound data-exfiltration command.",
  scan({ rel, content }) {
    if (!under(rel, "skills") && !under(rel, "tools") && !under(rel, ".claude/commands")) return null;
    const m = EXFIL_URL.exec(content);
    if (!m) return null;
    return finding(
      this.id,
      "critical",
      "Skill sends data to an external host (exfiltration)",
      m[0].slice(0, 140)
    );
  },
};

// Rule 11 — External include/import reference in instruction files.
export const INCLUDE_001 = {
  id: "INCLUDE-001",
  severity: "high",
  description:
    "Instruction file pulls remote content that will be interpreted as instructions.",
  scan({ rel, content }) {
    if (!isMarkdown(rel)) return null;
    const m = /(!include|@import|#include)[^\n]{0,20}https?:\/\/[^\s)\]>]+/i.exec(content);
    if (!m) return null;
    return finding(
      this.id,
      "high",
      "External include reference loads remote prompts — remote instruction injection",
      m[0].slice(0, 140)
    );
  },
};

// Rule 12 — Nested AGENTS.md files (multi-level instruction shadowing).
export const NESTED_AGENTS_001 = {
  id: "NESTED-AGENTS-001",
  severity: "info",
  description:
    "Nested AGENTS.md found: instructions at multiple levels can shadow or override each other.",
  scan({ rel, content }) {
    if (!/AGENTS\.md$/i.test(rel) || !rel.includes("/")) return null;
    const severity = hasOverrideAndOp(stripBom(content));
    if (!severity) return null;
    return finding(
      this.id,
      severity,
      "Nested AGENTS.md contains instruction-override content",
      content.match(OVERRIDE_PHRASE)?.[0] ?? "override phrase"
    );
  },
};

export const RULES = [
  INSTR_OVR_001,
  UNICODE_001,
  MCP_001,
  HOOK_001,
  SECRET_001,
  TOOL_001,
  BADGE_001,
  AGENT_001,
  SUDO_001,
  EXFIL_001,
  INCLUDE_001,
  NESTED_AGENTS_001,
];

export const RULE_INDEX = Object.fromEntries(RULES.map((r) => [r.id, r]));
