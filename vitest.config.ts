import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // model.ts is types only — every line is erased at runtime, so v8 has
      // nothing to instrument and would report it as 0%.
      exclude: ["src/engine/model.ts"],
      // 100% is the repo policy (see AGENTS.md): a linter's product is correctness.
      thresholds: {
        lines: 100,
        statements: 100,
        functions: 100,
        branches: 100,
      },
    },
  },
});
