import { defineConfig } from "tsup";

export default defineConfig({
  entry: { cli: "src/cli.ts" },
  format: ["esm"],
  platform: "node",
  target: "node20",
  clean: true,
  // The createRequire shim lets bundled CJS deps (yaml, ajv) require node builtins
  // from within the ESM bundle.
  banner: {
    js: [
      "#!/usr/bin/env node",
      "import { createRequire as __createRequire } from 'node:module';",
      "const require = __createRequire(import.meta.url);",
    ].join("\n"),
  },
  // The GitHub Action runs dist/cli.js from a bare checkout with no node_modules,
  // so the bundle must be fully self-contained (tsup externalizes deps by default).
  noExternal: [/^(yaml|ajv|picocolors)$/, /^ajv\//],
});
