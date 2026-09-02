#!/usr/bin/env node
// Print the CHANGELOG.md section for one version, for use as release notes.
// Deterministic and dependency-free: the release workflow runs this, so a bad
// extraction must fail loudly rather than publish empty or wrong notes.
import { readFileSync } from "node:fs";

const [version, file = "CHANGELOG.md"] = process.argv.slice(2);

if (!version) {
  console.error("usage: changelog-section.mjs <version> [changelog path]");
  process.exit(2);
}

const lines = readFileSync(file, "utf8").split("\n");
// Heading form per Keep a Changelog: "## [1.0.1] - 2026-09-02"
const isVersionHeading = (line) => /^## \[[^\]]+\]/.test(line);
const start = lines.findIndex((l) => l.startsWith(`## [${version}]`));

if (start === -1) {
  console.error(`no section for version ${version} in ${file}`);
  process.exit(1);
}

const rest = lines.slice(start + 1);
const nextHeading = rest.findIndex(isVersionHeading);
const body = (nextHeading === -1 ? rest : rest.slice(0, nextHeading))
  // Drop the link-reference block that trails the final section.
  .filter((l) => !/^\[[^\]]+\]: https?:\/\//.test(l))
  .join("\n")
  .trim();

if (body === "") {
  console.error(`section for version ${version} in ${file} is empty`);
  process.exit(1);
}

console.log(body);
