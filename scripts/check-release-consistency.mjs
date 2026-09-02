#!/usr/bin/env node
// Assert that a release tag agrees with every place the version is written.
// The release workflow runs this before anything irreversible: a tag that
// disagrees with src/main.ts would ship a CLI whose --version lies.
import { readFileSync } from "node:fs";

const version = process.argv[2];

if (!version) {
  console.error("usage: check-release-consistency.mjs <version>");
  process.exit(2);
}

const sources = [
  {
    name: "package.json",
    value: JSON.parse(readFileSync("package.json", "utf8")).version,
  },
  {
    name: "src/main.ts",
    value: readFileSync("src/main.ts", "utf8").match(/const VERSION = "([^"]+)"/)?.[1],
  },
];

const mismatched = sources.filter((s) => s.value !== version);

for (const s of mismatched) {
  console.error(`${s.name} declares ${s.value ?? "no version"}, tag says ${version}`);
}

if (mismatched.length > 0) {
  console.error("bump every version source to match the tag, then re-tag");
  process.exit(1);
}

console.log(`version ${version} agrees across ${sources.map((s) => s.name).join(", ")}`);
