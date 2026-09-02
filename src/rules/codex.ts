import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { MarketplaceDoc, PluginDoc, SkillDoc } from "../engine/model.js";
import type { Finding, MarketplaceRule, PluginRule, SkillRule } from "./types.js";
import { num } from "./types.js";

export const skillBodyBudget: SkillRule = {
  id: "codex/skill-body-budget",
  appliesTo: "skill",
  defaultSeverity: "warn",
  check({ target, params, report }) {
    const maxBytes = num(params, "maxBytes", 8000);
    if (target.bytes > maxBytes) {
      report({
        file: target.path,
        message:
          `SKILL.md is ${target.bytes} bytes, and Codex silently truncates skill contents at ` +
          `${maxBytes} bytes on activation (MAX_SKILL_PROMPT_BYTES); instructions past the ` +
          "cut are lost",
      });
    }
  },
};

export const skillsListBudget: PluginRule = {
  id: "codex/skills-list-budget",
  appliesTo: "plugin",
  defaultSeverity: "warn",
  check({ target, params, report }) {
    const max = num(params, "max", 8000);
    const total = target.skills.reduce((sum, skill) => {
      const d = skill.fm.data.description;
      return sum + (typeof d === "string" ? [...d].length : 0);
    }, 0);
    if (total > max) {
      report({
        file: target.root,
        message:
          `combined skill descriptions are ~${total} chars, near or over Codex's skills ` +
          "listing budget; the longest descriptions get shortened first (budget is " +
          "context-window-relative, so this is advisory)",
      });
    }
  },
};

function checkAgentsDrift(
  agentsSkillsDir: string,
  skills: SkillDoc[],
  report: (f: Finding) => void,
): void {
  const byName = new Map(skills.map((s) => [s.dirName, s]));
  for (const name of readdirSync(agentsSkillsDir)) {
    const canonical = byName.get(name);
    if (!canonical) continue;
    const copyPath = join(agentsSkillsDir, name, "SKILL.md");
    let copy: string;
    try {
      copy = readFileSync(copyPath, "utf8");
    } catch {
      continue;
    }
    if (copy !== canonical.raw) {
      report({
        file: copyPath,
        message:
          `.agents/skills/${name} has drifted from ${canonical.path}: Codex repo-scope ` +
          "users get a different skill than plugin users; sync the copies or replace the " +
          "copy with a symlink (Codex follows them)",
      });
    }
  }
}

export const agentsDirSyncPlugin: PluginRule = {
  id: "codex/agents-dir-sync",
  appliesTo: "plugin",
  defaultSeverity: "warn",
  check({ target, report }) {
    if (target.agentsSkillsDir) checkAgentsDrift(target.agentsSkillsDir, target.skills, report);
  },
};

export const agentsDirSyncMarketplace: MarketplaceRule = {
  id: "codex/agents-dir-sync-marketplace",
  appliesTo: "marketplace",
  defaultSeverity: "warn",
  check({ target, report }) {
    if (!target.agentsSkillsDir) return;
    const allSkills = target.plugins.flatMap((p: PluginDoc) => p.skills);
    checkAgentsDrift((target as MarketplaceDoc).agentsSkillsDir!, allSkills, report);
  },
};

export const codexRules = [
  skillBodyBudget,
  skillsListBudget,
  agentsDirSyncPlugin,
  agentsDirSyncMarketplace,
];
