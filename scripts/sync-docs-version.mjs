import { readFileSync, writeFileSync } from "node:fs";

const DOCS = new URL("../docs/index.html", import.meta.url);
const PKG = new URL("../package.json", import.meta.url);

const { version } = JSON.parse(readFileSync(PKG, "utf8"));
const check = process.argv.includes("--check");

/* Both spots the site prints the version: topbar wordmark and footer. */
const targets = [
  /(class="dim">\s*)(\d+\.\d+\.\d+)/,
  /(<span>hushlog )(\d+\.\d+\.\d+)/,
];

const html = readFileSync(DOCS, "utf8");
let updated = html;
const found = [];

for (const pattern of targets) {
  const match = updated.match(pattern);
  if (!match) {
    console.error(
      `sync-docs-version: no match for ${pattern} — docs/index.html markup changed, update this script`
    );
    process.exit(1);
  }
  found.push(match[2]);
  updated = updated.replace(pattern, `$1${version}`);
}

if (check) {
  const stale = found.filter((v) => v !== version);
  if (stale.length) {
    console.error(
      `sync-docs-version: docs show ${found.join(", ")} but package.json is ${version}`
    );
    process.exit(1);
  }
  console.log(`sync-docs-version: docs match ${version}`);
} else if (updated === html) {
  console.log(`sync-docs-version: already ${version}`);
} else {
  writeFileSync(DOCS, updated);
  console.log(`sync-docs-version: ${found.join(", ")} -> ${version}`);
}
