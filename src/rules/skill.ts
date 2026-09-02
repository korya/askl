import type { SkillRule } from "./types.js";
import { bool, num, str } from "./types.js";

/** Spec name grammar: lowercase alphanumerics and single hyphens, no edge hyphens. */
const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const frontmatterSchema: SkillRule = {
  id: "skill/frontmatter-schema",
  appliesTo: "skill",
  defaultSeverity: "error",
  check({ target, report }) {
    const { fm, path } = target;
    if (!fm.present) {
      report({
        file: path,
        message: "missing YAML frontmatter (--- block) at the top of SKILL.md",
      });
      return;
    }
    if (fm.parseError) {
      // Lenient runtimes may still load this file; strict YAML consumers will not.
      // Field-level checks are skipped: recovered data is not trustworthy enough to judge.
      report({
        file: path,
        message: `frontmatter is not valid YAML: ${fm.parseError}`,
        range: fm.parseErrorRange,
      });
      return;
    }
    for (const key of ["name", "description"] as const) {
      const value = fm.data[key];
      if (value === undefined || value === null) {
        report({ file: path, message: `required frontmatter field \`${key}\` is missing` });
      } else if (typeof value !== "string" || value.trim() === "") {
        report({
          file: path,
          message: `frontmatter field \`${key}\` must be a non-empty string`,
          range: fm.valueRange(key),
        });
      }
    }
    const compatibility = fm.data.compatibility;
    if (typeof compatibility === "string" && compatibility.length > 500) {
      report({
        file: path,
        message: `\`compatibility\` is ${compatibility.length} chars (spec max 500)`,
        range: fm.valueRange("compatibility"),
      });
    }
  },
};

export const nameFormat: SkillRule = {
  id: "skill/name-format",
  appliesTo: "skill",
  defaultSeverity: "error",
  check({ target, report }) {
    const name = target.fm.data.name;
    if (typeof name !== "string" || name === "") return; // frontmatter-schema owns absence
    const range = target.fm.valueRange("name");
    if (name.length > 64) {
      report({
        file: target.path,
        message: `name is ${name.length} chars (max 64)`,
        range,
      });
    }
    if (!NAME_PATTERN.test(name)) {
      report({
        file: target.path,
        message:
          `name \`${name}\` is invalid: only lowercase letters, digits and single hyphens are ` +
          "allowed, and it must not start or end with a hyphen",
        range,
      });
    }
    if (name !== target.dirName) {
      report({
        file: target.path,
        message: `name \`${name}\` must match the skill directory name \`${target.dirName}\``,
        range,
      });
    }
  },
};

export const descriptionLength: SkillRule = {
  id: "skill/description-length",
  appliesTo: "skill",
  defaultSeverity: "error",
  check({ target, params, report }) {
    const description = target.fm.data.description;
    if (typeof description !== "string") return; // frontmatter-schema owns absence
    const max = num(params, "max", 1024);
    const unit = str(params, "unit", "chars");
    const includeWhenToUse = bool(params, "includeWhenToUse", false);

    let text = description;
    let what = "description";
    const whenToUse = target.fm.data.when_to_use;
    if (includeWhenToUse && typeof whenToUse === "string") {
      text = `${description} ${whenToUse}`;
      what = "description + when_to_use";
    }
    const size = unit === "bytes" ? Buffer.byteLength(text, "utf8") : [...text].length;
    if (size > max) {
      report({
        file: target.path,
        message: `${what} is ${size} ${unit} (max ${max})`,
        range: target.fm.valueRange("description"),
      });
    }
  },
};

export const bodySize: SkillRule = {
  id: "skill/body-size",
  appliesTo: "skill",
  defaultSeverity: "warn",
  check({ target, params, report }) {
    const maxLines = num(params, "maxLines", 500);
    if (target.lines > maxLines) {
      report({
        file: target.path,
        message:
          `SKILL.md is ${target.lines} lines (spec recommends <= ${maxLines}; ` +
          "move detail into references/)",
      });
    }
  },
};

export const skillRules: SkillRule[] = [frontmatterSchema, nameFormat, descriptionLength, bodySize];
