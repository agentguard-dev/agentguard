// Sicheres Herunterladen + Entpacken von Tarballs.
// PR-Head-Tarballs sind untrusted: Größenlimit beim Download und
// Traversal-/Symlink-Prüfung vor dem Entpacken.
import fs from "node:fs";
import { execFileSync } from "node:child_process";

// Default-Grenze für Tarball-Downloads: 100 MB (komprimiert).
export const DEFAULT_MAX_TARBALL_BYTES = 100 * 1024 * 1024;

// Streamt die Response auf die Platte und bricht bei Überschreiten des
// Limits ab (verhindert Tarball-Bomben und Speicher-DoS).
export async function downloadWithLimit(res, destPath, maxBytes = DEFAULT_MAX_TARBALL_BYTES) {
  const out = fs.createWriteStream(destPath);
  let total = 0;
  try {
    for await (const chunk of res.body) {
      total += chunk.length;
      if (total > maxBytes) {
        out.destroy();
        throw new Error(`Tarball überschreitet das Größenlimit (${maxBytes} Bytes)`);
      }
      out.write(chunk);
    }
  } finally {
    out.end();
  }
  return total;
}

// Validiert die Ausgabe von `tar -tvzf`: Symlinks, Hardlinks, Devices und
// FIFOs werden abgelehnt — sie sind der klassische Traversal-Vektor
// (Eintrag "link" -> /etc, danach "link/evil.txt").
export function parseTarListing(stdout) {
  for (const line of stdout.split("\n")) {
    if (!line.trim()) continue;
    // Erstes Zeichen jeder Zeile ist der Eintragstyp:
    // l=Symlink, h=Hardlink, b/c=Devices, p=FIFO.
    if (/^[bchlp]/.test(line)) {
      throw new Error(`Tarball enthält unzulässigen Eintrag (Symlink/Hardlink/Device/FIFO): ${line.slice(0, 80)}`);
    }
  }
}

// Prüft die Namensliste von `tar -tzf`: keine absoluten Pfade, keine
// ".."-Segmente (Pfad-Traversal).
export function validateTarNames(namesText) {
  for (const name of namesText.split("\n")) {
    if (!name) continue;
    if (name.startsWith("/") || name.split("/").includes("..")) {
      throw new Error(`Tarball enthält Pfad-Traversal: ${name.slice(0, 80)}`);
    }
  }
}

// Entpackt einen Tarball sicher in destDir:
// 1. Listing prüfen (keine Links/Devices), 2. Namen prüfen (keine absoluten
// Pfade, keine ".."-Segmente), 3. erst dann entpacken.
export function extractTarball(tarPath, destDir, { stripComponents = 1 } = {}) {
  const listing = execFileSync("tar", ["-tvzf", tarPath], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  parseTarListing(listing);

  const names = execFileSync("tar", ["-tzf", tarPath], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  validateTarNames(names);

  execFileSync("tar", ["-xzf", tarPath, "--strip-components", String(stripComponents)], {
    cwd: destDir,
    stdio: "ignore",
  });
}
