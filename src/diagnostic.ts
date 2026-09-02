export type Severity = "error" | "warn";

export interface Pos {
  line: number;
  col: number;
}

export interface Range {
  start: Pos;
  end: Pos;
}

export interface Diagnostic {
  rule: string;
  /** Dialects that object; identical findings are merged across dialects. */
  dialects: string[];
  severity: Severity;
  /** Path relative to the process working directory. */
  file: string;
  range?: Range;
  message: string;
}

export function compareDiagnostics(a: Diagnostic, b: Diagnostic): number {
  if (a.file !== b.file) return a.file < b.file ? -1 : 1;
  const al = a.range?.start.line ?? 0;
  const bl = b.range?.start.line ?? 0;
  if (al !== bl) return al - bl;
  if (a.severity !== b.severity) return a.severity === "error" ? -1 : 1;
  return a.rule < b.rule ? -1 : a.rule > b.rule ? 1 : 0;
}
