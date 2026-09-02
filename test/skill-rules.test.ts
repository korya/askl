import { describe, expect, it } from "vitest";
import { brief, lint } from "./helpers.js";

describe("skill rules against the agentskills spec", () => {
  it("accepts a valid skill", () => {
    expect(lint("skills/valid")).toEqual([]);
  });

  it("rejects invalid name characters", () => {
    const out = brief(lint("skills/Bad--Name"));
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("error skill/name-format");
    expect(out[0]).toContain("Bad--Name");
  });

  it("rejects a name that does not match the directory", () => {
    const out = brief(lint("skills/mismatch"));
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("must match the skill directory name");
  });

  it("rejects a description over 1024 chars", () => {
    const out = brief(lint("skills/long-desc"));
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("error skill/description-length");
    expect(out[0]).toContain("1100 chars (max 1024)");
  });

  it("warns on a body over 500 lines", () => {
    const out = brief(lint("skills/long-body"));
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("warn skill/body-size");
  });

  it("errors on missing frontmatter", () => {
    const out = brief(lint("skills/no-fm"));
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("missing YAML frontmatter");
  });

  it("attaches a position to positioned findings", () => {
    const [d] = lint("skills/long-desc");
    expect(d?.range?.start.line).toBe(3);
  });
});
