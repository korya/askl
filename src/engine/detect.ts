import { readdirSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import type { MarketplaceDoc, Target } from "./model.js";
import { agentsSkillsDirOf, readManifest, readPlugin, readSkill } from "./parse.js";

function exists(path: string, kind: "file" | "dir"): boolean {
  try {
    const st = statSync(path);
    return kind === "file" ? st.isFile() : st.isDirectory();
  } catch {
    return false;
  }
}

function hasAnyPluginManifest(dir: string): boolean {
  return (
    exists(join(dir, "plugin.json"), "file") ||
    exists(join(dir, ".claude-plugin", "plugin.json"), "file") ||
    exists(join(dir, ".codex-plugin", "plugin.json"), "file")
  );
}

function readMarketplace(root: string): MarketplaceDoc {
  const manifest = readManifest(join(root, ".claude-plugin", "marketplace.json"));
  const plugins = [];
  const json = manifest.json as { plugins?: unknown } | undefined;
  if (Array.isArray(json?.plugins)) {
    for (const entry of json.plugins) {
      const source = (entry as { source?: unknown }).source;
      // Only local relative sources can be linted in-repo; remote sources are skipped.
      if (typeof source === "string" && source.startsWith("./")) {
        const dir = resolve(root, source);
        if (exists(dir, "dir")) plugins.push(readPlugin(dir, true));
      }
    }
  }
  const agentsSkillsDir = agentsSkillsDirOf(root);
  return {
    kind: "marketplace",
    root,
    manifest,
    plugins,
    ...(agentsSkillsDir !== undefined ? { agentsSkillsDir } : {}),
  };
}

/**
 * Decide what a path is and produce lint targets:
 * - a SKILL.md file or a directory containing one → a skill
 * - a directory with any plugin manifest, or a manifest-less `skills/` layout → a plugin
 * - a directory with `.claude-plugin/marketplace.json` → a marketplace (lints its local plugins)
 * - a directory whose immediate children are skill directories → those skills
 */
export function detectTargets(inputPath: string): Target[] {
  const path = resolve(inputPath);

  if (exists(path, "file")) {
    if (basename(path) === "SKILL.md") return [readSkill(dirname(path))];
    throw new Error(`not a lintable file: ${inputPath} (expected SKILL.md or a directory)`);
  }
  if (!exists(path, "dir")) {
    throw new Error(`path not found: ${inputPath}`);
  }

  if (exists(join(path, "SKILL.md"), "file")) return [readSkill(path)];
  // Marketplace first: a repo can be both a marketplace and a plugin (an entry
  // with source "./" points at itself); the marketplace view covers both.
  if (exists(join(path, ".claude-plugin", "marketplace.json"), "file")) {
    return [readMarketplace(path)];
  }
  if (hasAnyPluginManifest(path) || exists(join(path, "skills"), "dir")) {
    return [readPlugin(path)];
  }

  const childSkills: Target[] = [];
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const dir = join(path, entry.name);
    if (exists(dir, "dir") && exists(join(dir, "SKILL.md"), "file")) {
      childSkills.push(readSkill(dir));
    }
  }
  if (childSkills.length > 0) return childSkills;

  throw new Error(
    `nothing to lint at ${inputPath}: no SKILL.md, plugin manifest, skills/ directory, or marketplace found`,
  );
}
