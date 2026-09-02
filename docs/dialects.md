# Dialect facts ledger

The ground truth behind every dialect data file: what each consumer of skills and
plugins actually enforces, how we know, and how to re-verify when upstream moves.
Dialect files under `src/dialects/` encode these facts; this ledger carries the
evidence and the open unknowns.

Statuses: **verified** (reproduced against the runtime or its source),
**documented** (official docs, not independently reproduced), **unknown**.

## agentskills@1.0.0 (spec)

| Fact | Value | Status | Source |
|---|---|---|---|
| `name` grammar | 1–64 chars, lowercase alnum + single hyphens, no edge hyphens, must match directory | verified | [spec](https://agentskills.io/specification), normative text |
| `description` | required, 1–1024 chars | verified | spec |
| `compatibility` | ≤ 500 chars if present | verified | spec |
| `allowed-tools` | space-separated, experimental | documented | spec |
| Body size | ≤ 500 lines / <5000 tokens *recommended* | documented | spec (recommendation, hence warn) |
| Reference validator | `skills-ref` — "demonstration purposes only" | verified | agentskills/agentskills repo |

## agent-plugins@1.0.0 (spec)

| Fact | Value | Status | Source |
|---|---|---|---|
| Manifest | `plugin.json` at root, `$schema` + `name` required | verified | official JSON Schemas, vendored under `src/schemas/` (spec forbids runtime fetch) |
| `name` grammar | encoded in the schema's regex (incl. no `--`/`..`) | verified | `plugin.schema.json` |
| Skills discovery | `skills/` immediate children with `SKILL.md`, no recursion, symlinks followed | documented | spec §7.1 |
| Unknown fields | report + ignore, don't reject | documented | spec §5.2 |
| Path containment | after symlink resolution | documented | spec §4.1 — **not yet implemented as a rule** |

## claude-code@2026-09 (vendor)

| Fact | Value | Status | Source |
|---|---|---|---|
| Plugin manifest | `.claude-plugin/plugin.json`, only `name` required — **or** discovery via a marketplace entry (`source: "./"` self-reference works) | verified | docs + korya/swd-skills loads via marketplace without own `.claude-plugin/plugin.json` |
| Component dirs | at plugin root, never inside `.claude-plugin/` | documented | plugins-reference.md |
| Description display | `description` + `when_to_use` truncated at 1536 chars combined | **documented only** — not yet reproduced experimentally | skills.md |
| marketplace.json | required `name`/`owner`/`plugins`; six source types; reserved-names list | documented | plugin-marketplaces.md |
| Invalid YAML frontmatter | tolerated (lenient parser) — loads skills strict YAML rejects | verified | swd `examine` loads in Claude Code despite a bare `: ` in its description |
| Oracle | `claude plugin validate <path>` validates plugin/marketplace structure locally | verified | ran against real repos |

Re-verify: run `claude plugin validate` against `test/fixtures/` and diff with our
plugin findings; for the 1536 figure, build a skill with a known-length description
and inspect what the model sees.

## codex@2026-09 (vendor)

All verified on **codex-cli 0.152.0** (2026-09-01), constants from
`openai/codex codex-rs/ext/skills/src/render.rs`:

| Fact | Value | Status |
|---|---|---|
| Description limit | >1024 **chars** silently truncated with `...` — no rejection; the historical 1024-**byte** hard rejection is gone | verified (live + source) |
| Skill body | whole SKILL.md truncated at **8000 bytes** on activation (`MAX_SKILL_PROMPT_BYTES`), silently | verified (source + live 11,913-byte skill) |
| Listing budget | 2% of context window in approx tokens (bytes/4); fallback 8000 chars; configurable ≤ 10000 tokens. Longest descriptions shortened first; warning only when average truncation > 100 chars/skill; omission only in extremes | verified (source; shortening reproduced live) |
| Name | ≤ 64 chars enforced (`MAX_SKILL_NAME_CHARS`) | verified (source) |
| Discovery | `.agents/skills` (repo → `$HOME` → `/etc/codex` → bundled); symlinked skill dirs followed | documented |
| Plugin manifest | root `plugin.json` (agent-plugins format) + `.codex-plugin/plugin.json` **overlay** (`PLUGIN_METADATA_DIR`) | verified (source: `core-plugins/src/manifest.rs`) |
| Overlay merge semantics | exactly how the overlay merges onto the root manifest | **unknown** — read `manifest.rs` before deepening `.codex-plugin` rules |

Re-verify recipe (no API calls needed): create skills with sentinel-character
descriptions of exact lengths under a scratch repo's `.agents/skills/`, then run
`codex debug prompt-input "x"` and measure the rendered listing. For constants,
read `codex-rs/ext/skills/src/render.rs` on the release tag.

## Known cross-dialect facts

- The dual layout is real and shipping: korya/toastmasters-skills carries all
  three manifests per plugin plus a root marketplace; korya/swd-skills carries
  root `plugin.json` + marketplace with `source: "./"`.
- Both Claude Code and Codex tolerate YAML that strict parsers reject; the spec
  dialect stays strict on purpose (portability is the product).
