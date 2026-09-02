import { defineDialect } from "../types.js";

/**
 * The Agent Skills open standard. Frozen: 1.0.0.
 * Ground truth: https://agentskills.io/specification (normative field constraints).
 */
export default defineDialect({
  id: "agentskills@1.0.0",
  meta: {
    source: "https://agentskills.io/specification",
  },
  rules: {
    "skill/frontmatter-schema": { severity: "error" },
    "skill/name-format": { severity: "error" },
    "skill/description-length": { severity: "error", max: 1024, unit: "chars" },
    "skill/body-size": { maxLines: 500 }, // severity: the rule default (warn)
  },
});
