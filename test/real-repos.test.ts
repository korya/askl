import { describe, expect, it } from "vitest";
import { brief, lint } from "./helpers.js";

// First-user acceptance: trimmed copies of the actual repos this linter serves.
describe("real user repos (trimmed copies)", () => {
  it("swd-skills: one true positive — examine's description is invalid YAML", () => {
    // `description: ...report: done well...` — a bare `: ` inside a plain scalar.
    // Claude Code and Codex tolerate it via lenient parsing; strict YAML does not.
    // Found by the linter on its first run against a real repo.
    const out = brief(lint("real/swd-mini"));
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("error skill/frontmatter-schema");
    expect(out[0]).toContain("not valid YAML");
  });

  it("toastmasters-skills (triple-manifest layout) lints clean against the spec dialects", () => {
    // The known easy-speak defect (11,913 bytes > Codex's 8,000-byte activation cap)
    // is a codex-dialect finding — asserted once the codex dialect lands (plan step 6).
    expect(brief(lint("real/toastmasters-mini"))).toEqual([]);
  });
});
