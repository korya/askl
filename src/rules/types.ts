import type { Range, Severity } from "../diagnostic.js";
import type { MarketplaceDoc, PluginDoc, SkillDoc } from "../engine/model.js";

export type TargetKind = "skill" | "plugin" | "marketplace";

export interface Finding {
  file: string;
  message: string;
  range?: Range | undefined;
}

export interface RuleContext<T> {
  target: T;
  dialect: string;
  severity: Severity;
  params: Record<string, unknown>;
  report: (finding: Finding) => void;
}

interface RuleBase<K extends TargetKind, T> {
  id: string;
  appliesTo: K;
  defaultSeverity: Severity;
  check: (ctx: RuleContext<T>) => void;
}

export type SkillRule = RuleBase<"skill", SkillDoc>;
export type PluginRule = RuleBase<"plugin", PluginDoc>;
export type MarketplaceRule = RuleBase<"marketplace", MarketplaceDoc>;
export type Rule = SkillRule | PluginRule | MarketplaceRule;

export function num(params: Record<string, unknown>, key: string, fallback: number): number {
  const v = params[key];
  return typeof v === "number" ? v : fallback;
}

export function str(params: Record<string, unknown>, key: string, fallback: string): string {
  const v = params[key];
  return typeof v === "string" ? v : fallback;
}

export function bool(params: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const v = params[key];
  return typeof v === "boolean" ? v : fallback;
}
