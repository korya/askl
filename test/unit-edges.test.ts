import { describe, expect, it } from "vitest";
import { compareDiagnostics, type Diagnostic } from "../src/diagnostic.js";
import {
  applyRuleSettings,
  defaultSelection,
  resolveDialect,
  resolveSelection,
} from "../src/dialects/registry.js";
import { parseFrontmatter } from "../src/engine/parse.js";
import { mustGetRule } from "../src/engine/run.js";
import { descriptionLength } from "../src/rules/skill.js";
import { bool, num, str } from "../src/rules/types.js";

const diag = (over: Partial<Diagnostic>): Diagnostic => ({
  rule: "r",
  dialects: ["d"],
  severity: "warn",
  file: "f",
  message: "m",
  ...over,
});

describe("diagnostic ordering", () => {
  it("sorts by file, then line, then severity, then rule", () => {
    const a = diag({ file: "a" });
    const b = diag({ file: "b" });
    expect(compareDiagnostics(a, b)).toBeLessThan(0);
    expect(compareDiagnostics(b, a)).toBeGreaterThan(0);

    const l1 = diag({ range: { start: { line: 1, col: 1 }, end: { line: 1, col: 1 } } });
    const l9 = diag({ range: { start: { line: 9, col: 1 }, end: { line: 9, col: 1 } } });
    expect(compareDiagnostics(l1, l9)).toBeLessThan(0);

    expect(compareDiagnostics(diag({ severity: "error" }), diag({ severity: "warn" }))).toBe(-1);
    expect(compareDiagnostics(diag({ severity: "warn" }), diag({ severity: "error" }))).toBe(1);
    expect(compareDiagnostics(diag({ rule: "a" }), diag({ rule: "b" }))).toBeLessThan(0);
    expect(compareDiagnostics(diag({ rule: "b" }), diag({ rule: "a" }))).toBeGreaterThan(0);
    expect(compareDiagnostics(diag({ rule: "a" }), diag({ rule: "a" }))).toBe(0);
  });
});

describe("dialect registry edges", () => {
  it("resolveDialect rejects unknown ids", () => {
    expect(() => resolveDialect("nope@1.0.0")).toThrow(/unknown dialect id/);
  });

  it("a dialect can switch an inherited rule off", () => {
    // Not used by any shipped dialect yet; the merge semantics must support it.
    const base = resolveDialect("codex@2026-09");
    expect(base.rules["skill/name-format"]).toBeDefined();
    const overlaid = applyRuleSettings(base.rules, {
      "skill/name-format": "off",
      "skill/body-size": { maxLines: 100 },
    });
    expect(overlaid["skill/name-format"]).toBeUndefined();
    expect(overlaid["skill/body-size"]).toEqual({ maxLines: 100 });
  });

  it("defaultSelection includes requested vendors after the spec pair", () => {
    expect(defaultSelection(["codex"])).toEqual([
      "agentskills@1.0.0",
      "agent-plugins@1.0.0",
      "codex@2026-09",
    ]);
  });

  it("`all` expands to every registered dialect, deduplicated", () => {
    const all = resolveSelection(["all", "spec"]);
    expect(new Set(all).size).toBe(all.length);
    expect(all).toContain("claude-code@2026-09");
  });

  it("mustGetRule rejects rule ids no dialect should reference", () => {
    expect(() => mustGetRule("skill/nope", "d@1")).toThrow(/unknown rule skill\/nope/);
  });
});

describe("frontmatter parsing edges", () => {
  it("non-mapping frontmatter yields no key ranges", () => {
    const fm = parseFrontmatter("---\njust a scalar\n---\n");
    expect(fm.present).toBe(true);
    expect(fm.valueRange("name")).toBeUndefined();
  });

  it("a non-scalar value anchors its range on the key", () => {
    const fm = parseFrontmatter("---\nname:\n  - a\n  - b\n---\n");
    expect(fm.valueRange("name")?.start.line).toBe(2);
  });

  it("missing keys have no range", () => {
    const fm = parseFrontmatter("---\nname: x\n---\n");
    expect(fm.valueRange("nope")).toBeUndefined();
  });

  it("an empty frontmatter block parses to an empty mapping", () => {
    const fm = parseFrontmatter("---\n\n---\n");
    expect(fm.present).toBe(true);
    expect(fm.data).toEqual({});
  });

  it("absent frontmatter answers valueRange with undefined", () => {
    const fm = parseFrontmatter("# no frontmatter\n");
    expect(fm.present).toBe(false);
    expect(fm.valueRange("name")).toBeUndefined();
  });
});

describe("rule parameter plumbing", () => {
  it("byte-unit measurement is supported for future dialect facts", () => {
    // Codex 0.152.0 counts chars, but the historical behavior counted bytes;
    // the parameter stays supported and tested for the day a runtime needs it.
    const findings: string[] = [];
    descriptionLength.check({
      target: {
        kind: "skill",
        dir: "/x",
        path: "/x/SKILL.md",
        dirName: "x",
        raw: "",
        lines: 1,
        bytes: 0,
        fm: {
          present: true,
          data: { description: "日".repeat(400) }, // 400 chars, 1200 bytes
          valueRange: () => undefined,
        },
      },
      dialect: "test",
      severity: "warn",
      params: { max: 1024, unit: "bytes" },
      report: (f) => findings.push(f.message),
    });
    expect(findings).toEqual(["description is 1200 bytes (max 1024)"]);
  });

  it("param readers fall back on wrong types", () => {
    expect(num({ v: "x" }, "v", 7)).toBe(7);
    expect(str({ v: 1 }, "v", "s")).toBe("s");
    expect(bool({ v: 1 }, "v", true)).toBe(true);
  });
});
