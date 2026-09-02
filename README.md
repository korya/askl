# askl [![CI](https://github.com/korya/askl/actions/workflows/ci.yml/badge.svg)](https://github.com/korya/askl/actions/workflows/ci.yml) [![Marketplace](https://img.shields.io/github/v/release/korya/askl?label=marketplace&logo=github&color=2ea44f)](https://github.com/marketplace/actions/askl)

Deterministic linter for [agent skills](https://agentskills.io/specification) and
[agent plugins](https://agent-plugins.org/). Verifies compliance with the open specs and
with what specific runtimes actually enforce — Claude Code and Codex — so you catch
incompatibilities in CI, before your users do.

No LLM, no network at lint time, no configuration required.

## GitHub Action (primary use)

```yaml
- uses: korya/askl@v0
```

That's it. The action detects what your repo is (a skill, a plugin, a marketplace of
plugins), picks the right compliance targets (the spec dialects always; Claude Code and
Codex when your layout shows you target them), annotates PR diffs inline, and fails the
job on errors.

Optional inputs mirror the CLI flags:

```yaml
- uses: korya/askl@v0
  with:
    path: plugins/my-plugin
    dialect: spec,claude,codex   # pin targets explicitly
    strict: "true"               # warnings fail the job
    pedantic: "true"             # opinion-tier checks
```

## CLI (secondary use)

```console
$ npx @korya/askl
askl · dialects: agentskills@1.0.0, agent-plugins@1.0.0, claude-code@2026-09

skills/examine/SKILL.md
  ✖ [agentskills@1.0.0, claude-code@2026-09] skill/frontmatter-schema  frontmatter is not valid YAML: Nested mappings are not allowed in compact mappings (3:14)

1 error · 0 warnings
```

Flags: `--dialect <names>`, `--strict`, `--pedantic`, `--format text|json|sarif|github`.

## Examples

### CI gate: block PRs that break skill compatibility

```yaml
# .github/workflows/lint-skills.yml
name: Lint skills
on: [pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: korya/askl@v0
```

Violations show up as inline annotations on the PR diff; the job fails on errors and
passes on warnings (add `strict: "true"` to fail on warnings too).

### Local check while writing a skill

```console
$ npx @korya/askl skills/my-skill
askl · dialects: agentskills@1.0.0, agent-plugins@1.0.0

skills/my-skill/SKILL.md
  ✖ [agentskills@1.0.0] skill/name-format  name `My_Skill` is invalid: only lowercase letters, digits and single hyphens are allowed (2:7)

1 error · 0 warnings
```

Works on any target shape: a single `SKILL.md`, a directory of skills, a plugin, or a
whole marketplace repo — detection is automatic.

### Cross-runtime compatibility: "I built this for Claude Code — will Codex take it?"

```console
$ npx @korya/askl --dialect claude,codex .
askl · dialects: claude-code@2026-09, codex@2026-09

skills/easy-speak/SKILL.md
  ⚠ [codex@2026-09] codex/skill-body-budget  SKILL.md is 11913 bytes — Codex silently truncates skill contents at 8000 bytes on activation; instructions past the cut are lost

0 errors · 1 warning
```

When layouts genuinely diverge, the union run tells you how to satisfy both sides:

```text
  ⚠ [agent-plugins@1.0.0, claude-code@2026-09] conflict/dual-layout  this plugin satisfies
    agent-plugins@1.0.0 but not claude-code@2026-09 — the layouts are compatible side by
    side: add .claude-plugin/plugin.json or a marketplace entry for Claude Code
```

### Pre-publish audit before listing in a marketplace

```console
$ npx @korya/askl --strict --pedantic .
```

`--strict` turns every silent degradation (truncated descriptions, oversized bodies)
into a blocker; `--pedantic` adds opinion-tier checks like `.agents/skills` copies that
have drifted from their plugin originals.

### Reproducible CI: pin dialect versions

```json
{
  "dialects": ["spec", "claude@2026-09", "codex@2026-09"]
}
```

With `askl.config.json` committed, a linter update can never redden your
pipeline — released dialect versions are frozen, and unpinned runs always print which
versions they resolved to.

### SARIF into GitHub code scanning

```yaml
      - run: npx @korya/askl --format sarif . > results.sarif
      - uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: results.sarif
```

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
`askl.config.json` and results never change under you:

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
