# Decision log

Why the significant choices went the way they did. Format: decision → reasoning →
what would reopen it.

1. **TypeScript on Node, not Go/Rust.** The primary interface is a GitHub Action
   (native `node20` runtime, no Docker pull) and `npx` covers no-install local runs;
   ajv consumes the official agent-plugins JSON Schemas as-is. Reopen if: a
   non-Node distribution channel becomes primary.

2. **npm over pnpm.** Zero extra tooling for contributors and CI; the Action never
   installs anything anyway (committed `dist/`). Reopen if: this becomes a
   monorepo.

3. **Dialects are frozen data files with single-level `extends`.** Rules are shared
   parameterized functions; a dialect is params + severities + rule selection.
   Single-level extends keeps every dialect auditable as "one delta file + the spec".
   The registry is append-only: released versions never change, so pinned CI
   reproduces forever and version diffs are file diffs. Reopen: never (this is the
   core product invariant, [product.md B7]).

4. **Aliases track latest; stability is opt-in via config pinning.** A linter that
   silently lags what runtimes enforce loses its point; resolved versions are always
   printed. Users who need frozen CI pin `name@version` in the config file.

5. **Severity encodes enforcement, not taste.** `error` = a runtime rejects it or a
   spec MUST is violated; `warn` = silent degradation (truncation) or a spec
   recommendation; `pedantic` = opinion, off by default, all-or-nothing. That is why
   the same rule (`skill/description-length`) is an error for the spec and a warning
   for Codex — Codex truncates rather than rejects. Verified facts move rules
   between tiers; opinions never do.

6. **Conflicts are a cross-run pass, with nuance on severity.** Rules never see two
   dialects at once; a separate pass compares per-dialect results. A *partially*
   satisfied union already carries an error from the unsatisfied dialect, so
   `conflict/dual-layout` adds warn-level guidance rather than double-counting. A
   genuinely jointly-unsatisfiable conflict (none known today) would be an error.

7. **Composite Action running committed `dist/`.** Zero runtime dependencies, ~1s
   startup, no registry fetch on every consumer's CI. Cost: `dist/` in git — paid
   for by a CI job that rebuilds and diffs it. Rejected: Docker action (cold-start),
   npx-in-action (network + supply-chain surface on every run). Corollary learned
   in v0.2.0: the bundle must be fully self-contained (tsup externalizes
   `dependencies` by default), and only an isolation test — running dist with no
   node_modules in reach — proves it; `uses: ./` dogfooding cannot.

8. **No tokenizer.** Token-denominated limits are recommendations or approximations
   upstream (Codex itself approximates tokens as bytes/4); chars/lines with headroom
   match reality without the dependency.

9. **No rule configuration, no plugin API.** The ESLint lesson: configurability is
   for opinions, and this tool checks facts. The only escape hatch is suppression
   by rule id. New rules and dialects arrive as PRs, versioned with the tool.

10. **Marketplace-first target detection.** A repo can be both a plugin and a
    marketplace whose entry points at itself (`source: "./"` — swd-skills does
    this); the marketplace view subsumes the plugin view, so it wins detection.

11. **E2e tests run `main()` in-process** with captured output, stripped ANSI, and
    stubbed `GITHUB_ACTIONS` — CI runners set `CI=true`/`GITHUB_ACTIONS=true`,
    which changes color and format defaults, and tests must behave identically
    everywhere. The 8-line bin shim is covered via module-reset dynamic imports
    rather than child processes (V8 coverage does not cross process boundaries).

12. **Schemas vendored, never fetched.** The agent-plugins spec itself forbids
    runtime schema retrieval; vendoring also keeps the no-network-at-lint-time
    constraint honest.
