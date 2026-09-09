// Tests für das sichere Tarball-Handling (deterministisch, ohne tar-Binary).
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTarListing, validateTarNames } from "../src/tarutil.js";

test("symlink/hardlink/device/fifo entries are rejected", () => {
  const listing = [
    "-rw-r--r-- owner/group 0 2025-01-01 12:00 normal.txt",
    "lrwxrwxrwx owner/group 0 2025-01-01 12:00 link -> /etc/passwd",
  ].join("\n");
  assert.throws(() => parseTarListing(listing), /unzulässigen Eintrag/);
  assert.throws(() => parseTarListing("hrw-r--r-- owner/group 0 2025-01-01 12:00 hardlink"), /unzulässigen Eintrag/);
  assert.throws(() => parseTarListing("prw-r--r-- owner/group 0 2025-01-01 12:00 fifo"), /unzulässigen Eintrag/);
});

test("regular entries pass the listing check", () => {
  const listing = [
    "-rw-r--r-- owner/group 0 2025-01-01 12:00 a.txt",
    "drwxr-xr-x owner/group 0 2025-01-01 12:00 dir",
  ].join("\n");
  assert.doesNotThrow(() => parseTarListing(listing));
});

test("path traversal names are rejected", () => {
  assert.throws(() => validateTarNames("../../etc/passwd\n"), /Pfad-Traversal/);
  assert.throws(() => validateTarNames("/etc/passwd\n"), /Pfad-Traversal/);
  assert.throws(() => validateTarNames("a/../b.txt\n"), /Pfad-Traversal/);
});

test("normal names pass", () => {
  assert.doesNotThrow(() => validateTarNames("src/rules.js\nAGENTS.md\n"));
});
