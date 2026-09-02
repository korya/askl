import { Ajv2020, type ValidateFunction } from "ajv/dist/2020.js";
import type { ManifestFile, PluginDoc } from "../engine/model.js";
import pluginSchema from "../schemas/agent-plugins/1.0.0/plugin.schema.json" with { type: "json" };
import type { Finding, PluginRule } from "./types.js";

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

interface MetaSource {
  label: string;
  meta: Record<string, unknown>;
}

function manifestMeta(label: string, m: ManifestFile): MetaSource | undefined {
  if (!m.exists || m.parseError || typeof m.json !== "object" || m.json === null) return undefined;
  return { label, meta: m.json as Record<string, unknown> };
}

/** Every place a plugin declares metadata; order fixes message wording. */
function metaSources(plugin: PluginDoc, includeMarketplace: boolean): MetaSource[] {
  const sources = [
    manifestMeta("plugin.json", plugin.agentPlugins),
    manifestMeta(".claude-plugin/plugin.json", plugin.claudePlugin),
    manifestMeta(".codex-plugin/plugin.json", plugin.codexPlugin),
  ].filter((s): s is MetaSource => s !== undefined);
  if (includeMarketplace && plugin.marketplaceEntry) {
    sources.push({ label: "marketplace entry", meta: { ...plugin.marketplaceEntry } });
  }
  return sources;
}

function checkFieldCoherence(
  plugin: PluginDoc,
  field: "name" | "version" | "description",
  includeMarketplace: boolean,
  consequence: string,
  report: (f: Finding) => void,
): void {
  const declared = metaSources(plugin, includeMarketplace)
    .map(({ label, meta }) => ({ label, value: meta[field] }))
    .filter((d): d is { label: string; value: string } => typeof d.value === "string");
  if (new Set(declared.map((d) => d.value)).size <= 1) return;
  const listing = declared
    .map(
      (d) => `${d.label} declares ${field === "description" ? "its own text" : `\`${d.value}\``}`,
    )
    .join(", ");
  const file = plugin.agentPlugins.exists ? plugin.agentPlugins.path : plugin.root;
  report({ file, message: `${field} differs across manifests (${listing}) — ${consequence}` });
}

export const manifestCoherence: PluginRule = {
  id: "plugin/manifest-coherence",
  appliesTo: "plugin",
  defaultSeverity: "warn",
  check({ target, report }) {
    checkFieldCoherence(
      target,
      "name",
      true,
      "runtimes will present this as different plugins; align the names",
      report,
    );
    checkFieldCoherence(
      target,
      "version",
      true,
      "runtimes disagree about which release this is, and a marketplace pin keeps Claude Code " +
        "users on the pinned version; align the versions",
      report,
    );
  },
};

export const descriptionCoherence: PluginRule = {
  id: "plugin/description-coherence",
  appliesTo: "plugin",
  defaultSeverity: "warn",
  check({ target, report }) {
    // The marketplace entry's description is a standalone brief by design and is
    // deliberately not compared (code.claude.com plugin-marketplaces docs).
    checkFieldCoherence(
      target,
      "description",
      false,
      "runtimes will show users different summaries; align the texts or suppress this rule",
      report,
    );
  },
};

export const pluginRules: PluginRule[] = [
  manifestLocation,
  manifestSchema,
  skillsDiscovery,
  manifestCoherence,
  descriptionCoherence,
];
