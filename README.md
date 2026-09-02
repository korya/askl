# agent-skills-lint

Deterministic linter for [agent skills](https://agentskills.io/specification) and
[agent plugins](https://agent-plugins.org/). Verifies compliance with the open specs and
with what specific runtimes actually enforce — Claude Code and Codex — so you catch
incompatibilities in CI, before your users do.

No LLM, no network at lint time, no configuration required.

## GitHub Action (primary use)

```yaml
- uses: korya/agent-skills-lint@v1
```

That's it. The action detects what your repo is (a skill, a plugin, a marketplace of
plugins), picks the right compliance targets (the spec dialects always; Claude Code and
Codex when your layout shows you target them), annotates PR diffs inline, and fails the
job on errors.

Optional inputs mirror the CLI flags:

```yaml
- uses: korya/agent-skills-lint@v1
  with:
    path: plugins/my-plugin
    dialect: spec,claude,codex   # pin targets explicitly
    strict: "true"               # warnings fail the job
    pedantic: "true"             # opinion-tier checks
```

## CLI (secondary use)

```console
$ npx agent-skills-lint
agent-skills-lint · dialects: agentskills@1.0.0, agent-plugins@1.0.0, claude-code@2026-09

skills/examine/SKILL.md
  ✖ [agentskills@1.0.0, claude-code@2026-09] skill/frontmatter-schema  frontmatter is not valid YAML: Nested mappings are not allowed in compact mappings (3:14)

1 error · 0 warnings
```

Flags: `--dialect <names>`, `--strict`, `--pedantic`, `--format text|json|sarif|github`.

## Dialects

A dialect is what one consumer of your skills enforces, captured as a frozen, versioned
data file:

| Dialect | What it checks |
|---|---|
| `agentskills@1.0.0` | SKILL.md frontmatter, name grammar and directory match, description ≤ 1024 chars, body ≤ 500 lines |
| `agent-plugins@1.0.0` | `plugin.json` against the official JSON Schemas (vendored), `skills/` discovery layout |
| `claude-code@2026-09` | `.claude-plugin/` layout or marketplace coverage, marketplace schema and reserved names, 1536-char description display truncation |
| `codex@2026-09` | SKILL.md ≤ 8000 **bytes** (silently truncated on activation above that), description truncation at 1024 chars, skills-listing budget, `.agents/skills` sync (pedantic) |

Vendor facts are verified against the runtime source and live behavior, and cited in
each dialect file. Released dialect versions are frozen — pin them in
`agent-skills-lint.config.json` and results never change under you:

```json
{
  "dialects": ["spec", "claude@2026-09", "codex@2026-09"],
  "ignore": ["plugin/version-missing"],
  "pedantic": true
}
```

Selecting several dialects means your artifact must satisfy each; findings are tagged
with the objecting dialect(s), and a cross-dialect pass explains how to satisfy
seemingly conflicting layouts side by side.

## Design

See [docs/product.md](docs/product.md) for requirements and
[docs/architecture.md](docs/architecture.md) for how it works (parse-once engine,
dialects as data, append-only dialect registry).

## License

MIT
