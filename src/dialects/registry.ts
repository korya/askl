import claudeCode202609 from "./claude-code/2026-09.js";
import codex202609 from "./codex/2026-09.js";
import agentPlugins100 from "./spec/agent-plugins-1.0.0.js";
import agentSkills100 from "./spec/agentskills-1.0.0.js";
import type { DialectDef, RuleSetting } from "./types.js";

const defs = new Map<string, DialectDef>();
for (const def of [agentSkills100, agentPlugins100, claudeCode202609, codex202609]) {
  defs.set(def.id, def);
}

/**
 * Bare names resolve to the newest registered version; `spec` fans out to both
 * spec dialects; `all` to every registered dialect. Aliases move only on a
 * release of this tool — resolved ids are always reported back to the user.
 */
const aliases: Record<string, string[]> = {
  agentskills: ["agentskills@1.0.0"],
  "agent-plugins": ["agent-plugins@1.0.0"],
  claude: ["claude-code@2026-09"],
  "claude-code": ["claude-code@2026-09"],
  codex: ["codex@2026-09"],
  spec: ["agentskills@1.0.0", "agent-plugins@1.0.0"],
  all: [...defs.keys()],
};

export interface ResolvedDialect {
  id: string;
  rules: Record<string, Exclude<RuleSetting, "off">>;
}

export function resolveSelection(names: string[]): string[] {
  const ids: string[] = [];
  for (const name of names) {
    const expanded = aliases[name] ?? [name];
    for (const id of expanded) {
      if (!defs.has(id)) {
        const known = [...defs.keys(), ...Object.keys(aliases)].sort().join(", ");
        throw new Error(`unknown dialect \`${name}\` (known: ${known})`);
      }
      if (!ids.includes(id)) ids.push(id);
    }
  }
  return ids;
}

/** Overlay a dialect's rule settings onto an inherited base; "off" removes a rule. */
export function applyRuleSettings(
  base: ResolvedDialect["rules"],
  overlay: Record<string, RuleSetting>,
): ResolvedDialect["rules"] {
  const rules: ResolvedDialect["rules"] = { ...base };
  for (const [ruleId, setting] of Object.entries(overlay)) {
    if (setting === "off") {
      delete rules[ruleId];
    } else {
      rules[ruleId] = { ...rules[ruleId], ...setting };
    }
  }
  return rules;
}

export function resolveDialect(id: string): ResolvedDialect {
  const def = defs.get(id);
  if (!def) throw new Error(`unknown dialect id \`${id}\``);
  const base = def.extends ? resolveDialect(def.extends).rules : {};
  return { id, rules: applyRuleSettings(base, def.rules) };
}

export function defaultSelection(vendors: string[] = []): string[] {
  // Spec dialects always run; detected vendor dialects join automatically.
  return resolveSelection(["spec", ...vendors]);
}
