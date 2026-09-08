// Directory walking with sane defaults: skip VCS/vendor/binary, cap file size.
import fs from "node:fs";
import path from "node:path";

export const DEFAULT_EXCLUDED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "vendor",
  "coverage",
  ".next",
  ".nuxt",
  "__pycache__",
  ".venv",
  "venv",
  ".idea",
  ".DS_Store",
]);

const BINARY_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".zip", ".gz",
  ".tar", ".7z", ".woff", ".woff2", ".ttf", ".otf", ".eot", ".mp3", ".mp4",
  ".mov", ".wav", ".ogg", ".exe", ".dylib", ".so", ".dll", ".bin",
]);

const MAX_FILE_BYTES = 1_000_000;

export function* walkFiles(rootDir, { excludeDirs = [], customExcludes = [] } = {}) {
  const excluded = new Set([...DEFAULT_EXCLUDED_DIRS, ...excludeDirs]);
  const custom = customExcludes.map((g) => new RegExp(g));

  function* visit(absDir) {
    let entries;
    try {
      entries = fs.readdirSync(absDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const abs = path.join(absDir, entry.name);
      if (entry.isDirectory()) {
        if (!excluded.has(entry.name)) yield* visit(abs);
        continue;
      }
      if (!entry.isFile()) continue;
      const rel = path.relative(rootDir, abs);
      if (custom.some((re) => re.test(rel))) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (BINARY_EXT.has(ext)) continue;
      let stat;
      try {
        stat = fs.statSync(abs);
      } catch {
        continue;
      }
      if (stat.size > MAX_FILE_BYTES) continue;
      yield { abs, rel, stat };
    }
  }

  yield* visit(rootDir);
}

export function readText(abs) {
  try {
    return fs.readFileSync(abs, "utf8");
  } catch {
    return "";
  }
}
