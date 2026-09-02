import type { Severity } from "../diagnostic.js";

/** Per-rule setting inside a dialect: parameter/severity deltas, or "off" to disable. */
export type RuleSetting = ({ severity?: Severity } & Record<string, unknown>) | "off";

export interface DialectDef {
  /** Versioned id, e.g. "agentskills@1.0.0" or "codex@2026-09". */
  id: string;
  /** Single-level extends, always to a spec base. */
  extends?: string;
  /** Provenance: where each fact comes from. Not used at runtime. */
  meta?: Record<string, string>;
  rules: Record<string, RuleSetting>;
}

export function defineDialect(def: DialectDef): DialectDef {
  return def;
}
