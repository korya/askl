import type { Diagnostic } from "../diagnostic.js";

export function reportJson(diagnostics: Diagnostic[], dialectIds: string[]): string {
  const errors = diagnostics.filter((d) => d.severity === "error").length;
  return JSON.stringify(
    {
      dialects: dialectIds,
      summary: { errors, warnings: diagnostics.length - errors },
      diagnostics,
    },
    null,
    2,
  );
}
