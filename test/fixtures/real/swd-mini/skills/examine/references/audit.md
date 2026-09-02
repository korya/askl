# Audit axes 5a–5m and the Occam pass

Loaded from `SKILL.md` step 5. Axes 5a–5d apply to every diff; 5e–5m when the diff touches
the surface an axis covers, and each of those ends with its citation rule: what project
document a finding on that axis must name. The Occam pass (step 6) closes the file.

## 5a–5d. Alignment, problem, correctness, completeness

Walk the diff against these axes. Track each axis in whatever task or plan tool your host
provides, so none is silently dropped.

- **5a. Alignment with the claimed approach.** Does the code do what the description says?
  Common drift: "I added validation" — the diff adds a helper but never calls it.
- **5b. Solves the stated problem under stated constraints.** Walk a representative failure
  case from the problem statement through the new code. Would it fix it?
- **5c. Correctness — five named angles**, each delegable to a read-only search subagent.
  Every issue-shaped observation is recorded as a *candidate* with a one-line failure
  scenario — finders that silently drop half-believed candidates bypass step 7's
  verification.
  1. **Line + enclosing function.** Read every hunk line by line, then the whole enclosing
     function — bugs in unchanged lines of a touched function are in scope (the change
     re-exposes or fails to fix them). For each line: what input, state, timing, or platform
     makes it wrong? Off-by-one, inverted conditions, null/empty deref, silent truncation,
     an error swallowed in a catch, wrong-variable copy-paste. Be especially skeptical of
     code copied from existing patterns — the differences are where bugs live.
  2. **Removed behavior.** For every line the diff deletes or replaces, name the invariant it
     enforced, then find where the new code re-establishes it. Can't find it → candidate: a
     dropped guard, a narrowed validation, a deleted test that covered a real case.
  3. **Language pitfalls.** The classics of the diff's language and framework: falsy-zero and
     loose-equality coercion, mutable default arguments, late-binding closures, captured
     loop variables, nil-map writes, timezone/DST drift, float equality.
  4. **Wrapper/proxy correctness.** A type that wraps another (cache, proxy, decorator,
     adapter) must route every method through the wrapped instance — not back through a
     registry or global that re-enters the wrapper — and forward everything callers use.
  5. **Wasted work.** Redundant computation or repeated I/O, independent operations run
     sequentially, blocking work added to startup or hot paths, long-lived objects capturing
     an enclosing scope that holds large values.
- **5d. Completeness — the cross-file tracer.** For each changed function, Grep for its
  callers and check whether the change breaks any call site: a new precondition, a changed
  return shape, a new exception, an ordering dependency. Check callees too — does a parallel
  change in the same PR make a call unsafe? Sibling call sites the diff should have changed
  count. The regression surface is the *unchanged* code around the diff.


## 5e. Architecture

Does the change respect the layering in `docs/architecture.md`? Common violation: bypassing a
module boundary because it was inconvenient.

**Cites:** the `docs/architecture.md` section (or other architecture doc) the PR contradicts.
No citation = no project rule was actually verified.

## 5f. Conventions

Project-specific code style, file layout, dependency rules, test colocation, commit-message
format, UX/UI guidelines. Verify against the rule sources from step 2 (agent instruction files
and `docs/guidelines.md`), not against your priors.

**Cites:** the instruction file or guideline section the PR contradicts, quoting the rule and
the line that breaks it. A finding that can't be tied to a documented convention is at most a
Suggestion, not an Issue.

## 5g. Security

- **Trust boundaries:** inputs from outside (HTTP body, query, headers, uploads, webhooks)
  parsed and validated before use?
- **Injection surfaces:** SQL / shell / command / template / XSS parameterized or escaped?
- **AuthN/AuthZ:** new endpoints enforce them at the same layer as existing ones?
- **Secrets:** none logged, none in tests, none in error responses
- **OWASP Top 10** sweep against the affected surface

**Cites:** `docs/security.md` / `threat-model.md` / `SECURITY.md` rule violated. If no
project rule exists for the concern, name the OWASP item or industry-standard rule explicitly
and say so in the finding.

## 5h. Data privacy

- New PII in fields, logs, telemetry — tagged/redacted per project policy?
- Retention — new data persisted? For how long? Per policy?
- Cross-tenant leakage — does the new query filter by tenant/org?
- Regional / GDPR data-residency rules respected?

**Cites:** the project's privacy / data-handling policy (`docs/privacy.md`, similar) by
section. If no policy exists and the diff handles personal data, say so in the finding and
judge against the applicable regulation (GDPR, CCPA, …) explicitly.

## 5i. Testing

- Tests included? At what level — unit / integration / e2e?
- Cover the *failure* paths, not just the happy path?
- Cover regressions in adjacent unchanged code the PR could break?
- Manual testing described? Specific (steps, env) or hand-wavy ("I tested it locally")?
- CI: `gh pr checks <N>` — what passed, what failed, what's flaky vs. broken?

**Cites:** the project's testing conventions (`docs/testing.md`, agent instruction file
testing section, or similar). "Missing tests" without a documented coverage expectation and
without a named production risk (5k) is a Suggestion, not an Issue.

## 5j. Validate load-bearing assumptions independently

For each non-obvious claim the PR rests on, verify against an outside source:

- New library / API call → read the library's docs or source. Does it behave as the PR assumes?
- Edge of language / runtime behavior → confirm with the stdlib docs.
- Performance claim → measure or profile, not vibes.
- Compatibility claim → confirm against the target versions, not the latest.

An unverified load-bearing assumption is the modal source of "tests passed but prod broke."

## 5k. Risk and tested coverage of risk

Name the top 3 ways this PR could break production. For each, is there a test (auto or
claimed manual) that would catch the failure mode? If not, that's a finding — not "add a test
someday," but "this risk is currently uncovered." An uncovered *named* risk is an Issue with a
severity, whether or not the project documents a coverage expectation.

## 5l. Reversibility — what happens if this fires in prod?

- DB migrations: forward-only with data loss, or backward-compatible (add column nullable →
  backfill → drop later)? Flag any "we'll backfill later" or "drop old column in the same PR"
  as serious.
- Schema changes: tolerated by old code reading new data, and vice versa?
- Feature flags: can the new path be turned off without revert?
- External side effects: webhooks fired, queue messages emitted, files written — irreversible?

Reversibility failures are the most expensive to ship. A PR that can't be cleanly reverted
carries higher risk by definition — irreversible side effects are Critical or High.

## 5m. Dependency audit

For each added or bumped dependency (`go.mod`, `package.json`, `requirements.txt`,
`Cargo.toml`, etc.), two tiers:

**Findings on sight:**

- **Typosquatting** — package name sanity check (`requets` vs `requests`, `lodahs` vs
  `lodash`); a suspected typosquat is Critical.
- **Unreviewable pins** — a wildcard range (`*`) or a pin to an unreleased commit.
- **Known CVEs** — `npm audit` / `pip-audit` / language-specific advisory lookup, or search
  "<package> CVE", scoped to the version in use.

**Investigation triggers, not defects:** distance from the latest major, no release in ~2
years, a broad-looking semver range. Investigate; file an Issue only with evidence — an
applicable CVE, an upstream EOL or deprecation notice, or a project dependency policy to
cite. A stable library that hasn't needed a release is not a finding, and upgrading to the
latest major is sometimes the riskier choice.

## 6. The Occam pass — is this more solution than the problem needs?

The audit asks "is it wrong?"; this pass asks "is it more than needed?" Walk the diff once
more looking for:

- **Premature optimization** — caching, pooling, batching, cleverness in a path with no
  demonstrated need. The test: is there a measurement or stated scale requirement? No
  evidence → finding.
- **Speculative generality** — abstractions, flags, and extension points for futures nobody
  scheduled. Interfaces with one implementation. YAGNI.
- **Over-defensive code** — guards for states the type system or call graph already excludes,
  catch-alls that swallow failures, fallbacks that mask the error they fall back from.
  (Defensive code at trust boundaries is the opposite case — required; see 5g.)
- **Reinvention** — does the repo already have a utility that does this? (5d looks for
  siblings the diff should have *changed*; this looks for code it should have *used*.)
- **Band-aids** — the inverse failure: a special case layered on shared infrastructure means
  the fix is too *shallow*, not too elaborate. Prefer generalizing the underlying mechanism;
  name the mechanism that should have changed.
- **Deletion candidates** — for each new module or indirection: what breaks if it collapses
  into its caller? If "nothing, it's just tidier," propose the collapse.

Two calibration rules: **a simplification proposal must clear the same evidence bar as any
other finding** — walk it against the constraints from steps 1–2 and state which you checked;
and **less code is not the metric** — simplicity is fewest concepts and failure modes, and
explicit parallel branches can beat a "unified" mechanism nobody can modify safely.

**Severity:** over-engineering defaults to a **Suggestion**. Promote to an Issue (usually
Medium) only with concrete, citable cost — a new moving part to operate, a pattern adjacent
code will copy — ideally backed by the project's own conventions.
