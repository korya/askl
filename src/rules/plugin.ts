import { Ajv2020, type ValidateFunction } from "ajv/dist/2020.js";
import pluginSchema from "../schemas/agent-plugins/1.0.0/plugin.schema.json" with { type: "json" };
import type { PluginRule } from "./types.js";

let cachedValidator: ValidateFunction | undefined;
function pluginManifestValidator(): ValidateFunction {
  if (!cachedValidator) {
    cachedValidator = new Ajv2020({ allErrors: true, strict: false }).compile(pluginSchema);
  }
  return cachedValidator;
}

export const manifestLocation: PluginRule = {
  id: "plugin/manifest-location",
  appliesTo: "plugin",
  defaultSeverity: "error",
  check({ target, report }) {
    if (!target.agentPlugins.exists) {
      report({
        file: target.root,
        message:
          "no plugin.json at the plugin root — agent-plugins.org requires the manifest at " +
          "`<root>/plugin.json`",
      });
    }
  },
};

export const manifestSchema: PluginRule = {
  id: "plugin/manifest-schema",
  appliesTo: "plugin",
  defaultSeverity: "error",
  check({ target, report }) {
    const manifest = target.agentPlugins;
    if (!manifest.exists) return; // manifest-location owns absence
    if (manifest.parseError) {
      report({
        file: manifest.path,
        message: `plugin.json is not valid JSON: ${manifest.parseError}`,
      });
      return;
    }
    const validate = pluginManifestValidator();
    if (validate(manifest.json)) return;
    for (const err of validate.errors!) {
      const where = err.instancePath === "" ? "manifest root" : `\`${err.instancePath}\``;
      report({ file: manifest.path, message: `${where} ${err.message}` });
    }
  },
};

export const skillsDiscovery: PluginRule = {
  id: "plugin/skills-discovery",
  appliesTo: "plugin",
  defaultSeverity: "warn",
  check({ target, report }) {
    for (const entry of target.skillsDirEntries) {
      if (!entry.hasSkillMd) {
        report({
          file: entry.dir,
          message:
            `skills/${entry.name}/ has no SKILL.md — it is not a skill and agents will ` +
            "ignore it during discovery",
        });
      }
    }
  },
};

export const pluginRules: PluginRule[] = [manifestLocation, manifestSchema, skillsDiscovery];
