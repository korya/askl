import { defineDialect } from "../types.js";

/**
 * Codex as of 2026-09. Frozen once released — new behavior gets a new snapshot.
 * Ground truth: openai/codex codex-rs/ext/skills/src/render.rs constants, verified
 * live against codex-cli 0.152.0 (2026-09-01):
 *  - descriptions >1024 chars are silently truncated with "...", not rejected;
 *    counting is characters (the historical byte-counting bug is fixed)
 *  - SKILL.md contents are hard-truncated at 8,000 BYTES on activation
 *  - the skills listing budget is 2% of the context window (approx tokens = bytes/4,
 *    fallback 8,000 chars); longest descriptions are shortened first, silently
 *  - plugins carry a .codex-plugin/plugin.json overlay (PLUGIN_METADATA_DIR)
 */
export default defineDialect({
  id: "codex@2026-09",
  extends: "agentskills@1.0.0",
  meta: {
    source: "openai/codex codex-rs/ext/skills/src/render.rs · verified codex-cli 0.152.0",
  },
  rules: {
    "skill/description-length": { severity: "warn" }, // truncation, not rejection
    "codex/skill-body-budget": { severity: "warn", maxBytes: 8000 },
    "codex/skills-list-budget": { severity: "warn", max: 8000 },
    "codex/agents-dir-sync": { severity: "warn", pedantic: true },
    "codex/agents-dir-sync-marketplace": { severity: "warn", pedantic: true },
  },
});
