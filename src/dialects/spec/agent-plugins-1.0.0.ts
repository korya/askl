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
    note: "coherence rules live here although the spec is silent on vendor manifests: metadata agreement across the files different runtimes read is a packaging/portability concern, which is this dialect's domain",
  },
  rules: {
    "plugin/manifest-location": { severity: "error" },
    "plugin/manifest-schema": { severity: "error" },
    "plugin/skills-discovery": { severity: "warn" },
    "plugin/manifest-coherence": { severity: "warn" },
    "plugin/description-coherence": { severity: "warn", pedantic: true },
  },
});
