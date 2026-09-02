import { defineDialect } from "../types.js";

/**
 * Claude Code as of 2026-09. Frozen once released — new behavior gets a new snapshot.
 * Ground truth: code.claude.com/docs/en/{plugins-reference,skills,plugin-marketplaces}.md.
 * The 1536-char figure is the documented combined description + when_to_use display
 * truncation; Claude Code truncates rather than rejects, hence warn.
 */
export default defineDialect({
  id: "claude-code@2026-09",
  extends: "agentskills@1.0.0",
  meta: {
    source: "code.claude.com/docs (snapshot 2026-09)",
    note: "manifest at .claude-plugin/plugin.json OR discovery via a marketplace entry; components at plugin root",
  },
  rules: {
    "skill/description-length": {
      severity: "warn",
      max: 1536,
      includeWhenToUse: true,
    },
    "claude/manifest-layout": { severity: "error" },
    "claude/component-location": { severity: "error" },
    "claude/marketplace-schema": { severity: "error" },
  },
});
