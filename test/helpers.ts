import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Diagnostic } from "../src/diagnostic.js";
import { resolveSelection } from "../src/dialects/registry.js";
import { detectTargets } from "../src/engine/detect.js";
import { run } from "../src/engine/run.js";

export const fixtures = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

export function lint(fixturePath: string, dialects: string[] = ["spec"]): Diagnostic[] {
  const targets = detectTargets(join(fixtures, fixturePath));
  return run(targets, resolveSelection(dialects));
}

/** Compact view for assertions: rule, severity, dialect tags, message. */
export function brief(diagnostics: Diagnostic[]): string[] {
  return diagnostics.map(
    (d) => `${d.severity} ${d.rule} [${d.dialects.join(",")}] ${d.message.slice(0, 60)}`,
  );
}
