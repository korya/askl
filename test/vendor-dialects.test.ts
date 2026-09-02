import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveSelection } from "../src/dialects/registry.js";
import { detectTargets } from "../src/engine/detect.js";
import { run } from "../src/engine/run.js";
import { brief, fixtures, lint } from "./helpers.js";

describe("codex dialect (codex@2026-09)", () => {
  it("catches the easy-speak body over Codex's 8000-byte activation cap", () => {
    const out = brief(lint("real/toastmasters-mini", ["spec", "codex"]));
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("warn codex/skill-body-budget");
    expect(out[0]).toContain("11913 bytes");
  });

  it("downgrades description-length to a warning (codex truncates, not rejects)", () => {
    const out = brief(lint("skills/long-desc", ["codex"]));
    expect(out).toEqual(
      expect.arrayContaining([expect.stringContaining("warn skill/description-length")]),
    );
  });

  it("flags drifted .agents/skills copies only in pedantic mode", () => {
    const targets = detectTargets(join(fixtures, "real/toastmasters-root"));
    const quiet = run(targets, resolveSelection(["codex"]));
    expect(brief(quiet).some((l) => l.includes("agents-dir-sync"))).toBe(false);
    const pedantic = run(targets, resolveSelection(["codex"]), { pedantic: true });
    const drift = brief(pedantic).filter((l) => l.includes("agents-dir-sync"));
    expect(drift).toHaveLength(1);
    expect(drift[0]).toContain("has drifted");
  });
});

describe("claude-code dialect (claude-code@2026-09)", () => {
  it("accepts marketplace-covered plugins without .claude-plugin/plugin.json", () => {
    const out = brief(lint("real/swd-mini", ["claude"]));
    // Only the pre-existing YAML true positive; no manifest-layout complaint.
    expect(out.some((l) => l.includes("claude/manifest-layout"))).toBe(false);
  });

  it("errors when Claude Code cannot discover a plugin at all", () => {
    const out = brief(lint("plugins/valid", ["claude"]));
    expect(out.some((l) => l.includes("error claude/manifest-layout"))).toBe(true);
  });
});

describe("union semantics", () => {
  it("emits dual-layout guidance when one side of the union is unsatisfied", () => {
    const out = brief(lint("plugins/valid", ["spec", "claude"]));
    const conflict = out.filter((l) => l.includes("conflict/dual-layout"));
    expect(conflict).toHaveLength(1);
    expect(conflict[0]).toContain("conflict/dual-layout");
  });

  it("stays silent on the dual-layout toastmasters plugin", () => {
    const out = brief(lint("real/toastmasters-mini", ["spec", "claude", "codex"]));
    expect(out.some((l) => l.includes("conflict/"))).toBe(false);
  });

  it("merges identical findings across dialects into one tagged line", () => {
    const out = lint("skills/long-body", ["spec", "codex"]);
    const bodyFindings = out.filter((d) => d.rule === "skill/body-size");
    expect(bodyFindings).toHaveLength(1);
    expect(bodyFindings[0]?.dialects).toEqual(["agentskills@1.0.0", "codex@2026-09"]);
  });
});
