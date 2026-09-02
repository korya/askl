import type { MarketplaceRule, PluginRule } from "./types.js";

/** From code.claude.com/docs/en/plugin-marketplaces: names users must not claim. */
const RESERVED_MARKETPLACE_NAMES = new Set([
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
  "healthcare",
]);

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const COMPONENT_DIRS = new Set(["skills", "commands", "agents", "hooks", "workflows"]);

export const manifestLayout: PluginRule = {
  id: "claude/manifest-layout",
  appliesTo: "plugin",
  defaultSeverity: "error",
  check({ target, report }) {
    if (!target.claudePlugin.exists && !target.viaMarketplace) {
      report({
        file: target.root,
        message:
          "Claude Code cannot discover this plugin: add .claude-plugin/plugin.json, or list " +
          "it as an entry in a .claude-plugin/marketplace.json",
      });
    }
  },
};

export const componentLocation: PluginRule = {
  id: "claude/component-location",
  appliesTo: "plugin",
  defaultSeverity: "error",
  check({ target, report }) {
    for (const entry of target.claudePluginDirEntries) {
      if (COMPONENT_DIRS.has(entry)) {
        report({
          file: target.root,
          message:
            `component directory \`${entry}/\` must live at the plugin root, not inside ` +
            ".claude-plugin/ (only plugin.json belongs there)",
        });
      }
    }
  },
};

export const marketplaceSchema: MarketplaceRule = {
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
    const json = manifest.json as Record<string, unknown>;
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
    const owner = json.owner as Record<string, unknown> | undefined;
    if (typeof owner?.name !== "string" || owner.name === "") {
      report({ file, message: "required field `owner.name` is missing or empty" });
    }
    if (!Array.isArray(json.plugins)) {
      report({ file, message: "required field `plugins` must be an array" });
      return;
    }
    json.plugins.forEach((entry, i) => {
      const e = entry as Record<string, unknown>;
      if (typeof e.name !== "string" || e.name === "") {
        report({ file, message: `plugins[${i}]: required field \`name\` is missing or empty` });
      } else if (!KEBAB.test(e.name)) {
        report({ file, message: `plugins[${i}]: name \`${e.name}\` must be kebab-case` });
      }
      if (e.source === undefined || e.source === "") {
        report({ file, message: `plugins[${i}]: required field \`source\` is missing` });
      }
    });
  },
};

export const claudeRules = [manifestLayout, componentLocation, marketplaceSchema];
