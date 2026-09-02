import { defineDialect } from "../types.js";

/**
 * The Agent Plugins open standard. Frozen: 1.0.0.
 * Ground truth: https://agent-plugins.org/ specification and the official JSON Schemas
 * vendored under src/schemas/agent-plugins/1.0.0/ (the spec forbids runtime retrieval).
 */
export default defineDialect({
  id: "agent-plugins@1.0.0",
  meta: {
    source: "https://agent-plugins.org/",
    schemas: "src/schemas/agent-plugins/1.0.0",
  },
  rules: {
    "plugin/manifest-location": { severity: "error" },
    "plugin/manifest-schema": { severity: "error" },
    "plugin/skills-discovery": { severity: "warn" },
  },
});
