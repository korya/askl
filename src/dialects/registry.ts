import agentPlugins100 from "./spec/agent-plugins-1.0.0.js";
import agentSkills100 from "./spec/agentskills-1.0.0.js";
import type { DialectDef, RuleSetting } from "./types.js";

const defs = new Map<string, DialectDef>();
for (const def of [agentSkills100, agentPlugins100]) {
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

export function resolveDialect(id: string): ResolvedDialect {
  const def = defs.get(id);
  if (!def) throw new Error(`unknown dialect id \`${id}\``);
  const base = def.extends ? resolveDialect(def.extends).rules : {};
  const rules: ResolvedDialect["rules"] = { ...base };
  for (const [ruleId, setting] of Object.entries(def.rules)) {
    if (setting === "off") {
      delete rules[ruleId];
    } else {
      rules[ruleId] = { ...rules[ruleId], ...setting };
    }
  }
  return { id, rules };
}

export function defaultSelection(): string[] {
  // Spec dialects always run; vendor dialects join automatically once registered
  // and their layout is detected (claude-code, codex — step 6 of the plan).
  return resolveSelection(["spec"]);
}
