import { describe, expect, it } from "vitest";
import { brief, lint } from "./helpers.js";

describe("plugin rules against the agent-plugins spec", () => {
  it("accepts a valid plugin and its skills", () => {
    expect(lint("plugins/valid")).toEqual([]);
  });

  it("errors when plugin.json is missing at the root", () => {
    const out = brief(lint("plugins/no-manifest"));
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("error plugin/manifest-location");
  });

  it("reports schema violations with instance paths", () => {
    const out = brief(lint("plugins/bad-manifest"));
    const schemaFindings = out.filter((l) => l.includes("plugin/manifest-schema"));
    expect(schemaFindings.length).toBeGreaterThanOrEqual(2); // bad name pattern + unknown field
    expect(out.some((l) => l.includes("plugin/skills-discovery"))).toBe(true); // junk dir
  });

  it("tags spec findings with the objecting dialect", () => {
    const [d] = lint("plugins/no-manifest");
    expect(d?.dialects).toEqual(["agent-plugins@1.0.0"]);
  });
});
