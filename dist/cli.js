#!/usr/bin/env node

// src/main.ts
import { readFileSync as readFileSync3 } from "fs";
import { join as join4 } from "path";
import { parseArgs } from "util";

// src/dialects/types.ts
function defineDialect(def) {
  return def;
}

// src/dialects/claude-code/2026-09.ts
var __default = defineDialect({
  id: "claude-code@2026-09",
  extends: "agentskills@1.0.0",
  meta: {
    source: "code.claude.com/docs (snapshot 2026-09)",
    note: "manifest at .claude-plugin/plugin.json OR discovery via a marketplace entry; components at plugin root"
  },
  rules: {
    "skill/description-length": {
      severity: "warn",
      max: 1536,
      includeWhenToUse: true
    },
    "claude/manifest-layout": { severity: "error" },
    "claude/component-location": { severity: "error" },
    "claude/marketplace-schema": { severity: "error" }
  }
});

// src/dialects/codex/2026-09.ts
var __default2 = defineDialect({
  id: "codex@2026-09",
  extends: "agentskills@1.0.0",
  meta: {
    source: "openai/codex codex-rs/ext/skills/src/render.rs \xB7 verified codex-cli 0.152.0"
  },
  rules: {
    "skill/description-length": { severity: "warn" },
    // truncation, not rejection
    "codex/skill-body-budget": { severity: "warn", maxBytes: 8e3 },
    "codex/skills-list-budget": { severity: "warn", max: 8e3 },
    "codex/agents-dir-sync": { severity: "warn", pedantic: true },
    "codex/agents-dir-sync-marketplace": { severity: "warn", pedantic: true }
  }
});

// src/dialects/spec/agent-plugins-1.0.0.ts
var agent_plugins_1_0_0_default = defineDialect({
  id: "agent-plugins@1.0.0",
  meta: {
    source: "https://agent-plugins.org/",
    schemas: "src/schemas/agent-plugins/1.0.0"
  },
  rules: {
    "plugin/manifest-location": { severity: "error" },
    "plugin/manifest-schema": { severity: "error" },
    "plugin/skills-discovery": { severity: "warn" }
  }
});

// src/dialects/spec/agentskills-1.0.0.ts
var agentskills_1_0_0_default = defineDialect({
  id: "agentskills@1.0.0",
  meta: {
    source: "https://agentskills.io/specification"
  },
  rules: {
    "skill/frontmatter-schema": { severity: "error" },
    "skill/name-format": { severity: "error" },
    "skill/description-length": { severity: "error", max: 1024, unit: "chars" },
    "skill/body-size": { maxLines: 500 }
    // severity: the rule default (warn)
  }
});

// src/dialects/registry.ts
var defs = /* @__PURE__ */ new Map();
for (const def of [agentskills_1_0_0_default, agent_plugins_1_0_0_default, __default, __default2]) {
  defs.set(def.id, def);
}
var aliases = {
  agentskills: ["agentskills@1.0.0"],
  "agent-plugins": ["agent-plugins@1.0.0"],
  claude: ["claude-code@2026-09"],
  "claude-code": ["claude-code@2026-09"],
  codex: ["codex@2026-09"],
  spec: ["agentskills@1.0.0", "agent-plugins@1.0.0"],
  all: [...defs.keys()]
};
function resolveSelection(names) {
  const ids = [];
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
function applyRuleSettings(base, overlay) {
  const rules = { ...base };
  for (const [ruleId, setting] of Object.entries(overlay)) {
    if (setting === "off") {
      delete rules[ruleId];
    } else {
      rules[ruleId] = { ...rules[ruleId], ...setting };
    }
  }
  return rules;
}
function resolveDialect(id) {
  const def = defs.get(id);
  if (!def) throw new Error(`unknown dialect id \`${id}\``);
  const base = def.extends ? resolveDialect(def.extends).rules : {};
  return { id, rules: applyRuleSettings(base, def.rules) };
}
function defaultSelection(vendors = []) {
  return resolveSelection(["spec", ...vendors]);
}

// src/engine/detect.ts
import { readdirSync as readdirSync2, statSync as statSync2 } from "fs";
import { basename as basename2, dirname, join as join2, resolve } from "path";

// src/engine/parse.ts
import { readdirSync, readFileSync, statSync } from "fs";
import { basename, join } from "path";
import { isMap, isScalar, LineCounter, parseDocument } from "yaml";
var FM_OPEN = /^---\r?\n/;
var FM_CLOSE = /\r?\n---(\r?\n|$)/;
function parseFrontmatter(raw) {
  const none = { present: false, data: {}, valueRange: () => void 0 };
  const open = raw.match(FM_OPEN);
  if (!open) return none;
  const rest = raw.slice(open[0].length);
  const close = rest.match(FM_CLOSE);
  if (close === null || close.index === void 0) return none;
  const fmText = rest.slice(0, close.index);
  const lineOffset = 1;
  const lc = new LineCounter();
  const doc = parseDocument(fmText, { lineCounter: lc });
  let parseError;
  let parseErrorRange;
  const firstError = doc.errors[0];
  if (firstError) {
    parseError = firstError.message.split("\n")[0]?.replace(/ at line \d+, column \d+:?$/, "");
    const offset = firstError.pos?.[0];
    if (offset !== void 0) {
      const p = lc.linePos(offset);
      const pos = { line: p.line + lineOffset, col: p.col };
      parseErrorRange = { start: pos, end: pos };
    }
  }
  let data = {};
  try {
    data = doc.toJS() ?? {};
  } catch (err) {
    parseError ??= err.message.split("\n")[0];
  }
  const valueRange = (key) => {
    if (!isMap(doc.contents)) return void 0;
    for (const item of doc.contents.items) {
      if (!isScalar(item.key) || item.key.value !== key) continue;
      const node = isScalar(item.value) ? item.value : item.key;
      const [start, , end] = node.range ?? [];
      if (start === void 0 || end === void 0) return void 0;
      const s = lc.linePos(start);
      const e = lc.linePos(end);
      return {
        start: { line: s.line + lineOffset, col: s.col },
        end: { line: e.line + lineOffset, col: e.col }
      };
    }
    return void 0;
  };
  return {
    present: true,
    data,
    valueRange,
    ...parseError !== void 0 ? { parseError } : {},
    ...parseErrorRange !== void 0 ? { parseErrorRange } : {}
  };
}
function readSkill(dir) {
  const path = join(dir, "SKILL.md");
  const raw = readFileSync(path, "utf8");
  return {
    kind: "skill",
    dir,
    path,
    dirName: basename(dir),
    fm: parseFrontmatter(raw),
    raw,
    lines: raw.split("\n").length,
    bytes: Buffer.byteLength(raw, "utf8")
  };
}
function readManifest(path) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return { path, exists: false };
  }
  try {
    return { path, exists: true, json: JSON.parse(text) };
  } catch (err) {
    return { path, exists: true, parseError: err.message };
  }
}
function isDir(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}
function isFile(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}
function listDirNames(path) {
  try {
    return readdirSync(path);
  } catch {
    return [];
  }
}
function agentsSkillsDirOf(root) {
  const dir = join(root, ".agents", "skills");
  return isDir(dir) ? dir : void 0;
}
function readPlugin(root, viaMarketplace = false) {
  const skillsDir = join(root, "skills");
  const skillsDirExists = isDir(skillsDir);
  const skillsDirEntries = [];
  const skills = [];
  if (skillsDirExists) {
    for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
      const dir = join(skillsDir, entry.name);
      if (!isDir(dir)) continue;
      const hasSkillMd = isFile(join(dir, "SKILL.md"));
      skillsDirEntries.push({ name: entry.name, dir, hasSkillMd });
      if (hasSkillMd) skills.push(readSkill(dir));
    }
  }
  const agentsSkillsDir = agentsSkillsDirOf(root);
  return {
    kind: "plugin",
    root,
    agentPlugins: readManifest(join(root, "plugin.json")),
    claudePlugin: readManifest(join(root, ".claude-plugin", "plugin.json")),
    codexPlugin: readManifest(join(root, ".codex-plugin", "plugin.json")),
    viaMarketplace,
    claudePluginDirEntries: listDirNames(join(root, ".claude-plugin")),
    ...agentsSkillsDir !== void 0 ? { agentsSkillsDir } : {},
    skillsDirExists,
    skillsDirEntries,
    skills
  };
}

// src/engine/detect.ts
function exists(path, kind) {
  try {
    const st = statSync2(path);
    return kind === "file" ? st.isFile() : st.isDirectory();
  } catch {
    return false;
  }
}
function hasAnyPluginManifest(dir) {
  return exists(join2(dir, "plugin.json"), "file") || exists(join2(dir, ".claude-plugin", "plugin.json"), "file") || exists(join2(dir, ".codex-plugin", "plugin.json"), "file");
}
function readMarketplace(root) {
  const manifest = readManifest(join2(root, ".claude-plugin", "marketplace.json"));
  const plugins = [];
  const json = manifest.json;
  if (Array.isArray(json?.plugins)) {
    for (const entry of json.plugins) {
      const source = entry.source;
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
    ...agentsSkillsDir !== void 0 ? { agentsSkillsDir } : {}
  };
}
function detectTargets(inputPath) {
  const path = resolve(inputPath);
  if (exists(path, "file")) {
    if (basename2(path) === "SKILL.md") return [readSkill(dirname(path))];
    throw new Error(`not a lintable file: ${inputPath} (expected SKILL.md or a directory)`);
  }
  if (!exists(path, "dir")) {
    throw new Error(`path not found: ${inputPath}`);
  }
  if (exists(join2(path, "SKILL.md"), "file")) return [readSkill(path)];
  if (exists(join2(path, ".claude-plugin", "marketplace.json"), "file")) {
    return [readMarketplace(path)];
  }
  if (hasAnyPluginManifest(path) || exists(join2(path, "skills"), "dir")) {
    return [readPlugin(path)];
  }
  const childSkills = [];
  for (const entry of readdirSync2(path, { withFileTypes: true })) {
    const dir = join2(path, entry.name);
    if (exists(dir, "dir") && exists(join2(dir, "SKILL.md"), "file")) {
      childSkills.push(readSkill(dir));
    }
  }
  if (childSkills.length > 0) return childSkills;
  throw new Error(
    `nothing to lint at ${inputPath}: no SKILL.md, plugin manifest, skills/ directory, or marketplace found`
  );
}

// src/engine/run.ts
import { relative } from "path";

// src/diagnostic.ts
function compareDiagnostics(a, b) {
  if (a.file !== b.file) return a.file < b.file ? -1 : 1;
  const al = a.range?.start.line ?? 0;
  const bl = b.range?.start.line ?? 0;
  if (al !== bl) return al - bl;
  if (a.severity !== b.severity) return a.severity === "error" ? -1 : 1;
  return a.rule < b.rule ? -1 : a.rule > b.rule ? 1 : 0;
}

// src/rules/claude.ts
var RESERVED_MARKETPLACE_NAMES = /* @__PURE__ */ new Set([
  "claude-code-marketplace",
  "claude-code-plugins",
  "claude-plugins-official",
  "claude-plugins-community",
  "claude-community",
  "anthropic-marketplace",
  "anthropic-plugins",
  "agent-skills",
  "anthropic-agent-skills",
  "knowledge-work-plugins",
  "life-sciences",
  "claude-for-legal",
  "claude-for-financial-services",
  "financial-services-plugins",
  "first-party-plugins",
  "healthcare"
]);
var KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
var COMPONENT_DIRS = /* @__PURE__ */ new Set(["skills", "commands", "agents", "hooks", "workflows"]);
var manifestLayout = {
  id: "claude/manifest-layout",
  appliesTo: "plugin",
  defaultSeverity: "error",
  check({ target, report }) {
    if (!target.claudePlugin.exists && !target.viaMarketplace) {
      report({
        file: target.root,
        message: "Claude Code cannot discover this plugin: add .claude-plugin/plugin.json, or list it as an entry in a .claude-plugin/marketplace.json"
      });
    }
  }
};
var componentLocation = {
  id: "claude/component-location",
  appliesTo: "plugin",
  defaultSeverity: "error",
  check({ target, report }) {
    for (const entry of target.claudePluginDirEntries) {
      if (COMPONENT_DIRS.has(entry)) {
        report({
          file: target.root,
          message: `component directory \`${entry}/\` must live at the plugin root, not inside .claude-plugin/ (only plugin.json belongs there)`
        });
      }
    }
  }
};
var marketplaceSchema = {
  id: "claude/marketplace-schema",
  appliesTo: "marketplace",
  defaultSeverity: "error",
  check({ target, report }) {
    const { manifest } = target;
    const file = manifest.path;
    if (manifest.parseError) {
      report({ file, message: `marketplace.json is not valid JSON: ${manifest.parseError}` });
      return;
    }
    const json = manifest.json;
    const name = json.name;
    if (typeof name !== "string" || name === "") {
      report({ file, message: "required field `name` is missing or empty" });
    } else {
      if (!KEBAB.test(name)) {
        report({ file, message: `marketplace name \`${name}\` must be kebab-case` });
      }
      if (RESERVED_MARKETPLACE_NAMES.has(name)) {
        report({ file, message: `marketplace name \`${name}\` is reserved by Anthropic` });
      }
    }
    const owner = json.owner;
    if (typeof owner?.name !== "string" || owner.name === "") {
      report({ file, message: "required field `owner.name` is missing or empty" });
    }
    if (!Array.isArray(json.plugins)) {
      report({ file, message: "required field `plugins` must be an array" });
      return;
    }
    json.plugins.forEach((entry, i) => {
      const e = entry;
      if (typeof e.name !== "string" || e.name === "") {
        report({ file, message: `plugins[${i}]: required field \`name\` is missing or empty` });
      } else if (!KEBAB.test(e.name)) {
        report({ file, message: `plugins[${i}]: name \`${e.name}\` must be kebab-case` });
      }
      if (e.source === void 0 || e.source === "") {
        report({ file, message: `plugins[${i}]: required field \`source\` is missing` });
      }
    });
  }
};
var claudeRules = [manifestLayout, componentLocation, marketplaceSchema];

// src/rules/codex.ts
import { readdirSync as readdirSync3, readFileSync as readFileSync2 } from "fs";
import { join as join3 } from "path";

// src/rules/types.ts
function num(params, key, fallback) {
  const v = params[key];
  return typeof v === "number" ? v : fallback;
}
function str(params, key, fallback) {
  const v = params[key];
  return typeof v === "string" ? v : fallback;
}
function bool(params, key, fallback) {
  const v = params[key];
  return typeof v === "boolean" ? v : fallback;
}

// src/rules/codex.ts
var skillBodyBudget = {
  id: "codex/skill-body-budget",
  appliesTo: "skill",
  defaultSeverity: "warn",
  check({ target, params, report }) {
    const maxBytes = num(params, "maxBytes", 8e3);
    if (target.bytes > maxBytes) {
      report({
        file: target.path,
        message: `SKILL.md is ${target.bytes} bytes \u2014 Codex silently truncates skill contents at ${maxBytes} bytes on activation (MAX_SKILL_PROMPT_BYTES); instructions past the cut are lost`
      });
    }
  }
};
var skillsListBudget = {
  id: "codex/skills-list-budget",
  appliesTo: "plugin",
  defaultSeverity: "warn",
  check({ target, params, report }) {
    const max = num(params, "max", 8e3);
    const total = target.skills.reduce((sum, skill) => {
      const d = skill.fm.data.description;
      return sum + (typeof d === "string" ? [...d].length : 0);
    }, 0);
    if (total > max) {
      report({
        file: target.root,
        message: `combined skill descriptions are ~${total} chars \u2014 near or over Codex's skills listing budget; the longest descriptions get shortened first (budget is context-window-relative, so this is advisory)`
      });
    }
  }
};
function checkAgentsDrift(agentsSkillsDir, skills, report) {
  const byName = new Map(skills.map((s) => [s.dirName, s]));
  for (const name of readdirSync3(agentsSkillsDir)) {
    const canonical = byName.get(name);
    if (!canonical) continue;
    const copyPath = join3(agentsSkillsDir, name, "SKILL.md");
    let copy;
    try {
      copy = readFileSync2(copyPath, "utf8");
    } catch {
      continue;
    }
    if (copy !== canonical.raw) {
      report({
        file: copyPath,
        message: `.agents/skills/${name} has drifted from ${canonical.path} \u2014 Codex repo-scope users get a different skill than plugin users; sync the copies or replace the copy with a symlink (Codex follows them)`
      });
    }
  }
}
var agentsDirSyncPlugin = {
  id: "codex/agents-dir-sync",
  appliesTo: "plugin",
  defaultSeverity: "warn",
  check({ target, report }) {
    if (target.agentsSkillsDir) checkAgentsDrift(target.agentsSkillsDir, target.skills, report);
  }
};
var agentsDirSyncMarketplace = {
  id: "codex/agents-dir-sync-marketplace",
  appliesTo: "marketplace",
  defaultSeverity: "warn",
  check({ target, report }) {
    if (!target.agentsSkillsDir) return;
    const allSkills = target.plugins.flatMap((p) => p.skills);
    checkAgentsDrift(target.agentsSkillsDir, allSkills, report);
  }
};
var codexRules = [
  skillBodyBudget,
  skillsListBudget,
  agentsDirSyncPlugin,
  agentsDirSyncMarketplace
];

// src/rules/plugin.ts
import { Ajv2020 } from "ajv/dist/2020.js";

// src/schemas/agent-plugins/1.0.0/plugin.schema.json
var plugin_schema_default = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
  title: "Agent Plugins Manifest",
  description: "Machine-readable schema for plugin.json in Agent Plugins 1.0.0. The Agent Plugins specification defines additional semantic and operational requirements.",
  type: "object",
  properties: {
    $schema: {
      const: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
      description: "Canonical identifier of the plugin manifest schema for the Agent Plugins version targeted by this document."
    },
    name: {
      type: "string",
      minLength: 1,
      maxLength: 64,
      pattern: "^(?!.*(?:--|\\.\\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$",
      description: "Human-readable plugin name."
    },
    version: {
      type: "string"
    },
    description: {
      type: "string"
    },
    author: {
      type: "object",
      properties: {
        name: {
          type: "string"
        },
        email: {
          type: "string"
        },
        url: {
          type: "string"
        }
      },
      additionalProperties: false
    },
    homepage: {
      type: "string"
    },
    repository: {
      type: "string"
    },
    license: {
      type: "string"
    },
    keywords: {
      type: "array",
      items: {
        type: "string"
      }
    },
    extensions: {
      type: "object",
      description: "Client-specific manifest data keyed by reverse-domain extension namespace. Agent Plugins assigns no semantics to namespace object contents.",
      additionalProperties: {
        type: "object"
      }
    }
  },
  required: ["$schema", "name"],
  additionalProperties: false
};

// src/rules/plugin.ts
var cachedValidator;
function pluginManifestValidator() {
  if (!cachedValidator) {
    cachedValidator = new Ajv2020({ allErrors: true, strict: false }).compile(plugin_schema_default);
  }
  return cachedValidator;
}
var manifestLocation = {
  id: "plugin/manifest-location",
  appliesTo: "plugin",
  defaultSeverity: "error",
  check({ target, report }) {
    if (!target.agentPlugins.exists) {
      report({
        file: target.root,
        message: "no plugin.json at the plugin root \u2014 agent-plugins.org requires the manifest at `<root>/plugin.json`"
      });
    }
  }
};
var manifestSchema = {
  id: "plugin/manifest-schema",
  appliesTo: "plugin",
  defaultSeverity: "error",
  check({ target, report }) {
    const manifest = target.agentPlugins;
    if (!manifest.exists) return;
    if (manifest.parseError) {
      report({
        file: manifest.path,
        message: `plugin.json is not valid JSON: ${manifest.parseError}`
      });
      return;
    }
    const validate = pluginManifestValidator();
    if (validate(manifest.json)) return;
    for (const err of validate.errors) {
      const where = err.instancePath === "" ? "manifest root" : `\`${err.instancePath}\``;
      report({ file: manifest.path, message: `${where} ${err.message}` });
    }
  }
};
var skillsDiscovery = {
  id: "plugin/skills-discovery",
  appliesTo: "plugin",
  defaultSeverity: "warn",
  check({ target, report }) {
    for (const entry of target.skillsDirEntries) {
      if (!entry.hasSkillMd) {
        report({
          file: entry.dir,
          message: `skills/${entry.name}/ has no SKILL.md \u2014 it is not a skill and agents will ignore it during discovery`
        });
      }
    }
  }
};
var pluginRules = [manifestLocation, manifestSchema, skillsDiscovery];

// src/rules/skill.ts
var NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
var frontmatterSchema = {
  id: "skill/frontmatter-schema",
  appliesTo: "skill",
  defaultSeverity: "error",
  check({ target, report }) {
    const { fm, path } = target;
    if (!fm.present) {
      report({
        file: path,
        message: "missing YAML frontmatter (--- block) at the top of SKILL.md"
      });
      return;
    }
    if (fm.parseError) {
      report({
        file: path,
        message: `frontmatter is not valid YAML: ${fm.parseError}`,
        range: fm.parseErrorRange
      });
      return;
    }
    for (const key of ["name", "description"]) {
      const value = fm.data[key];
      if (value === void 0 || value === null) {
        report({ file: path, message: `required frontmatter field \`${key}\` is missing` });
      } else if (typeof value !== "string" || value.trim() === "") {
        report({
          file: path,
          message: `frontmatter field \`${key}\` must be a non-empty string`,
          range: fm.valueRange(key)
        });
      }
    }
    const compatibility = fm.data.compatibility;
    if (typeof compatibility === "string" && compatibility.length > 500) {
      report({
        file: path,
        message: `\`compatibility\` is ${compatibility.length} chars (spec max 500)`,
        range: fm.valueRange("compatibility")
      });
    }
  }
};
var nameFormat = {
  id: "skill/name-format",
  appliesTo: "skill",
  defaultSeverity: "error",
  check({ target, report }) {
    const name = target.fm.data.name;
    if (typeof name !== "string" || name === "") return;
    const range = target.fm.valueRange("name");
    if (name.length > 64) {
      report({
        file: target.path,
        message: `name is ${name.length} chars (max 64)`,
        range
      });
    }
    if (!NAME_PATTERN.test(name)) {
      report({
        file: target.path,
        message: `name \`${name}\` is invalid: only lowercase letters, digits and single hyphens are allowed, and it must not start or end with a hyphen`,
        range
      });
    }
    if (name !== target.dirName) {
      report({
        file: target.path,
        message: `name \`${name}\` must match the skill directory name \`${target.dirName}\``,
        range
      });
    }
  }
};
var descriptionLength = {
  id: "skill/description-length",
  appliesTo: "skill",
  defaultSeverity: "error",
  check({ target, params, report }) {
    const description = target.fm.data.description;
    if (typeof description !== "string") return;
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
        range: target.fm.valueRange("description")
      });
    }
  }
};
var bodySize = {
  id: "skill/body-size",
  appliesTo: "skill",
  defaultSeverity: "warn",
  check({ target, params, report }) {
    const maxLines = num(params, "maxLines", 500);
    if (target.lines > maxLines) {
      report({
        file: target.path,
        message: `SKILL.md is ${target.lines} lines (spec recommends <= ${maxLines}; move detail into references/)`
      });
    }
  }
};
var skillRules = [frontmatterSchema, nameFormat, descriptionLength, bodySize];

// src/engine/run.ts
var ruleRegistry = /* @__PURE__ */ new Map();
for (const rule of [...skillRules, ...pluginRules, ...claudeRules, ...codexRules]) {
  ruleRegistry.set(rule.id, rule);
}
function mustGetRule(ruleId, dialectId) {
  const rule = ruleRegistry.get(ruleId);
  if (!rule) throw new Error(`dialect ${dialectId} references unknown rule ${ruleId}`);
  return rule;
}
function flatten(targets) {
  const flat = { skills: [], plugins: [], marketplaces: [] };
  for (const target of targets) {
    if (target.kind === "skill") flat.skills.push(target);
    if (target.kind === "plugin") flat.plugins.push(target);
    if (target.kind === "marketplace") {
      flat.marketplaces.push(target);
      flat.plugins.push(...target.plugins);
    }
  }
  for (const plugin of flat.plugins) flat.skills.push(...plugin.skills);
  return flat;
}
function run(targets, dialectIds, opts = {}) {
  const flat = flatten(targets);
  const collected = [];
  for (const dialectId of dialectIds) {
    const dialect = resolveDialect(dialectId);
    for (const [ruleId, setting] of Object.entries(dialect.rules)) {
      if (setting.pedantic === true && !opts.pedantic) continue;
      const rule = mustGetRule(ruleId, dialectId);
      const severity = setting.severity ?? rule.defaultSeverity;
      const targetsForRule = rule.appliesTo === "skill" ? flat.skills : rule.appliesTo === "plugin" ? flat.plugins : flat.marketplaces;
      for (const target of targetsForRule) {
        rule.check({
          // Rules are registered under the kind they declare; the registry guarantees the match.
          target,
          dialect: dialectId,
          severity,
          params: setting,
          report: (finding) => {
            collected.push({
              rule: ruleId,
              dialects: [dialectId],
              severity,
              file: relative(process.cwd(), finding.file) || ".",
              message: finding.message,
              ...finding.range ? { range: finding.range } : {}
            });
          }
        });
      }
    }
  }
  collected.push(...crossDialectConflicts(flat, dialectIds));
  return mergeAcrossDialects(collected).sort(compareDiagnostics);
}
function crossDialectConflicts(flat, dialectIds) {
  const out = [];
  const claudeId = dialectIds.find((d) => d.startsWith("claude-code@"));
  const apId = dialectIds.find((d) => d.startsWith("agent-plugins@"));
  if (!claudeId || !apId) return out;
  for (const plugin of flat.plugins) {
    const apOk = plugin.agentPlugins.exists;
    const claudeOk = plugin.claudePlugin.exists || plugin.viaMarketplace;
    if (apOk === claudeOk) continue;
    const missing = apOk ? "add .claude-plugin/plugin.json or a marketplace entry for Claude Code" : "add ./plugin.json for agent-plugins.org runtimes";
    out.push({
      rule: "conflict/dual-layout",
      dialects: [apId, claudeId],
      severity: "warn",
      file: relative(process.cwd(), plugin.root) || ".",
      message: `this plugin satisfies ${apOk ? apId : claudeId} but not ${apOk ? claudeId : apId} \u2014 the layouts are compatible side by side: ${missing}`
    });
  }
  return out;
}
function mergeAcrossDialects(diagnostics) {
  const byKey = /* @__PURE__ */ new Map();
  for (const d of diagnostics) {
    const key = [d.rule, d.severity, d.file, d.range?.start.line, d.range?.start.col, d.message].map(String).join("\0");
    const existing = byKey.get(key);
    if (existing) {
      if (!existing.dialects.includes(d.dialects[0])) existing.dialects.push(d.dialects[0]);
    } else {
      byKey.set(key, { ...d, dialects: [...d.dialects] });
    }
  }
  return [...byKey.values()];
}

// src/reporters/github.ts
function reportGithub(diagnostics, dialectIds) {
  const out = [];
  for (const d of diagnostics) {
    const kind = d.severity === "error" ? "error" : "warning";
    const loc = [
      `file=${d.file}`,
      d.range ? `line=${d.range.start.line},col=${d.range.start.col}` : void 0,
      `title=${d.rule}`
    ].filter(Boolean).join(",");
    const message = `[${d.dialects.join(", ")}] ${d.message}`.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
    out.push(`::${kind} ${loc}::${message}`);
  }
  const errors = diagnostics.filter((d) => d.severity === "error").length;
  out.push(
    `askl \xB7 dialects: ${dialectIds.join(", ")} \xB7 ${errors} errors, ${diagnostics.length - errors} warnings`
  );
  return out.join("\n");
}

// src/reporters/json.ts
function reportJson(diagnostics, dialectIds) {
  const errors = diagnostics.filter((d) => d.severity === "error").length;
  return JSON.stringify(
    {
      dialects: dialectIds,
      summary: { errors, warnings: diagnostics.length - errors },
      diagnostics
    },
    null,
    2
  );
}

// src/reporters/sarif.ts
function reportSarif(diagnostics, version) {
  const ruleIds = [...new Set(diagnostics.map((d) => d.rule))].sort();
  return JSON.stringify(
    {
      $schema: "https://json.schemastore.org/sarif-2.1.0.json",
      version: "2.1.0",
      runs: [
        {
          tool: {
            driver: {
              name: "askl",
              informationUri: "https://github.com/korya/askl",
              version,
              rules: ruleIds.map((id) => ({ id }))
            }
          },
          results: diagnostics.map((d) => ({
            ruleId: d.rule,
            level: d.severity === "error" ? "error" : "warning",
            message: { text: `[${d.dialects.join(", ")}] ${d.message}` },
            locations: [
              {
                physicalLocation: {
                  artifactLocation: { uri: d.file.replaceAll("\\", "/") },
                  region: {
                    startLine: d.range?.start.line ?? 1,
                    startColumn: d.range?.start.col ?? 1
                  }
                }
              }
            ]
          }))
        }
      ]
    },
    null,
    2
  );
}

// src/reporters/text.ts
import pc from "picocolors";
function reportText(diagnostics, dialectIds) {
  const out = [];
  out.push(`askl \xB7 dialects: ${dialectIds.join(", ")}`);
  out.push("");
  let file = "";
  for (const d of diagnostics) {
    if (d.file !== file) {
      file = d.file;
      out.push(pc.underline(file));
    }
    const mark = d.severity === "error" ? pc.red("\u2716") : pc.yellow("\u26A0");
    const tags = pc.dim(`[${d.dialects.join(", ")}]`);
    const loc = d.range ? pc.dim(` (${d.range.start.line}:${d.range.start.col})`) : "";
    out.push(`  ${mark} ${tags} ${d.rule}  ${d.message}${loc}`);
  }
  if (diagnostics.length > 0) out.push("");
  const errors = diagnostics.filter((d) => d.severity === "error").length;
  const warnings = diagnostics.length - errors;
  const summary = diagnostics.length === 0 ? pc.green("\u2713 no problems found") : `${errors > 0 ? pc.red(`${errors} error${errors === 1 ? "" : "s"}`) : "0 errors"} \xB7 ${warnings > 0 ? pc.yellow(`${warnings} warning${warnings === 1 ? "" : "s"}`) : "0 warnings"}`;
  out.push(summary);
  return out.join("\n");
}

// src/main.ts
var VERSION = "0.2.0";
var HELP = `askl \u2014 deterministic linter for agent skills and plugins

Usage: askl [options] [paths...]

Options:
  --dialect <names>   comma-separated dialects to lint against
                      (spec, agentskills, agent-plugins, all, or name@version)
  --strict            treat warnings as errors
  --pedantic          enable opinion-tier warnings
  --format <name>     output format: text | json | sarif | github
                      (default: text; github annotations inside GitHub Actions)
  --version           print version
  --help              show this help

With no options, paths are auto-detected (skill, plugin, or marketplace) and
linted against the spec dialects. Optional config: askl.config.json
with { "dialects": [...], "ignore": [...], "pedantic": true }.`;
function loadConfig() {
  try {
    return JSON.parse(readFileSync3(join4(process.cwd(), "askl.config.json"), "utf8"));
  } catch {
    return {};
  }
}
function detectVendors(targets) {
  const vendors = [];
  const plugins = targets.flatMap(
    (t) => t.kind === "plugin" ? [t] : t.kind === "marketplace" ? t.plugins : []
  );
  const anyMarketplace = targets.some((t) => t.kind === "marketplace");
  const anyAgentsDir = targets.some((t) => t.kind !== "skill" && t.agentsSkillsDir !== void 0);
  if (anyMarketplace || plugins.some((p) => p.claudePlugin.exists)) vendors.push("claude");
  if (anyAgentsDir || plugins.some((p) => p.codexPlugin.exists)) vendors.push("codex");
  return vendors;
}
function main(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      dialect: { type: "string", multiple: true },
      strict: { type: "boolean", default: false },
      pedantic: { type: "boolean", default: false },
      format: { type: "string", default: "text" },
      version: { type: "boolean", default: false },
      help: { type: "boolean", default: false }
    }
  });
  if (values.help) {
    console.log(HELP);
    return 0;
  }
  if (values.version) {
    console.log(VERSION);
    return 0;
  }
  const config = loadConfig();
  const paths = positionals.length > 0 ? positionals : ["."];
  const targets = paths.flatMap((p) => detectTargets(p));
  const selection = values.dialect?.flatMap((d) => d.split(",")) ?? config.dialects;
  const dialectIds = selection ? resolveSelection(selection) : defaultSelection(detectVendors(targets));
  const pedantic = values.pedantic || config.pedantic === true;
  let diagnostics = run(targets, dialectIds, { pedantic });
  const ignored = new Set(config.ignore ?? []);
  diagnostics = diagnostics.filter((d) => !ignored.has(d.rule));
  if (values.strict) {
    diagnostics = diagnostics.map(
      (d) => d.severity === "warn" ? { ...d, severity: "error" } : d
    );
  }
  const format = values.format !== "text" || process.env.GITHUB_ACTIONS !== "true" ? values.format : "github";
  if (format === "json") {
    console.log(reportJson(diagnostics, dialectIds));
  } else if (format === "sarif") {
    console.log(reportSarif(diagnostics, VERSION));
  } else if (format === "github") {
    console.log(reportGithub(diagnostics, dialectIds));
  } else if (format === "text") {
    console.log(reportText(diagnostics, dialectIds));
  } else {
    console.error(`unknown format \`${format}\` (expected text, json, sarif, or github)`);
    return 2;
  }
  return diagnostics.some((d) => d.severity === "error") ? 1 : 0;
}

// src/cli.ts
try {
  process.exitCode = main(process.argv.slice(2));
} catch (err) {
  console.error(`askl: ${err.message}`);
  process.exitCode = 2;
}
