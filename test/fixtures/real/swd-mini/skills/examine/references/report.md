# Report format

Loaded from `SKILL.md` step 8 (synthesis). Covers the six signals and severities, locators,
IDs, block rendering, the report template, and the definition of done.

## Six signals, four severities

The report carries six distinct signals: **What was done well** (concrete, `file:line`),
**Gaps** (low-consequence absences only), **Issues** (verified candidates, severity by
impact), **Questions** (doubts that survived your scrutiny but earned no verdict — the
author can usually answer in a minute what would take the reviewer an hour to prove),
**Suggestions** (offers, not orders), and **Known limitations** (real-but-accepted, each
with the reason it doesn't warrant a fix — the dignified exit for findings that don't clear
the Issue bar).

The split rule for absences: if the author must address it before merge (or it changes the
risk of merge), it's an **Issue** with a severity — a missing test for a stated risk is
functionally a bug. If it's "nice to have noted," it's a **Gap**.

| Severity | Definition |
|---|---|
| **Critical** | Cannot merge before fixing: breaks production on deploy, violates security or data-privacy rules, irreversibly damages data, or violates a critical project invariant. |
| **High** | Serious failure mode on a reachable path — wrong data, outage, weakened security. Fix before merge. Includes an unverified load-bearing assumption the change rests on, a missing test for a named top-3 risk, an architecture violation others will copy. |
| **Medium** | Moderate impact: wrong behavior on an edge path, a compliance drift, a maintenance trap with citable cost. Fix now; acceptable as a committed follow-up. |
| **Low** | Real but minor: redundant code, small refactors. Defer freely. Naming and formatting are not Issues — Suggestion if the name obscures intent, otherwise drop. |

**Severity encodes impact; the Verdict field encodes confidence.** A serious failure mode
with a PLAUSIBLE verdict is still High; a confirmed nit is still Low. A concern that earned
no verdict — you cannot name the mechanism — is a Question, not a Medium.

**Critical and high are scarce.** If every review has three criticals, the scheme stops
carrying information. "Uncomfortable" or "ugly" is not critical.

## Locators

Every issue and suggestion needs a **locator** — something concrete enough that the reader can
find the thing being talked about. The default is `file:line`, but it's not the only valid
form. Use whichever fits the finding:

- `file:line` (e.g. `app/db.py:34`) — local issue at a specific line or hunk. Default.
- `flow: X → Y → Z` (e.g. `flow: signup → db.find_by_email → db.insert`) — issue that emerges
  from the interaction of multiple call sites, not from any single one. Cite the participating
  files but locate the finding at the flow.
- `arch: <area>` (e.g. `arch: http handlers / domain layering`) — architectural or layering
  issue that describes a pattern across files; cite the architecture doc section it violates.
- `deps: <package>` (e.g. `deps: lodash`) — dependency-policy issue not tied to a code line.
- `scope: PR` — issue about the change as a whole (missing description, scope sprawl,
  atomicity, etc.).
- `meta: <other-IDs>` (e.g. `meta: C1, S2`) — finding that references other findings.

The rule isn't "must have `file:line`," it's "the reader can find the thing." Forcing a
flow-level issue into a single line is *worse* than locating it correctly at the flow — it
implies a local fix that won't address the actual finding.

When a single root cause produces multiple symptoms, prefer **one big-picture finding** with
the participating sites listed, not several fine-grained findings that obscure the shared root.

## Stable IDs

Tag every issue and suggestion so the author and reviewer can refer to it in follow-up
conversation, commits, or PR comments without quoting the whole finding:

- `C1`, `C2`, … Critical · `H1`, … High · `M1`, … Medium · `L1`, … Low · `Q1`, … Questions ·
  `S1`, … Suggestions

Counters are per-review and per-bucket. "Fixed C1 and C2; declining S3" is a complete status
update — that's what the IDs are for.

## Block rendering

Non-Low issues and suggestions are written as **blocks**, not one-line bullets: a heading
(`#### C1 — title`), then labeled fields. One-line findings collapse the problem, the failure
mode, and the fix into a wall of em-dashes the author can't act on. Low issues stay compact —
if a Low genuinely needs more than one line, it's not Low; promote it.

Within each severity tier, sort by locator so the author can walk top-down through the codebase.

## Template

Findings first. Omit a section only when it is genuinely empty — except **What was done
well**, which is mandatory.

```
# Examine: <title> (<target>)

## Headline
<one sentence: merge / merge-with-fixes / hold. If the step-4 approach gate failed, the
unresolved approach question IS the headline.>

## Approach fit
<one of: "matches the obvious approach — <which>" / "diverges for a real constraint: <the
constraint, cited>" / "APPROACH DISPUTED: <the unresolved question>". In the disputed case,
state that all line-level findings below are provisional. Omit when the gate passed and the
match is unremarkable — say so in Verified instead.>

## Issues

### Critical (must fix before merge)

#### C1 — <one-line title>
- **Locator:** <locator>
- **Changed anchor:** <the hunk that introduced or exposed it> *(omit when the locator
  already is the anchor)*
- **What:** <the problem, 1–3 sentences; the present-but-wrong code or behavior>
- **Evidence:** <the call path, input, or probe result that demonstrates it>
- **Verdict:** CONFIRMED | PLAUSIBLE — <one clause on what verification checked>
- **Why Critical:** <the failure mode that breaks production / violates security / violates
  privacy / damages data, and why it can't be shipped around>
- **Fix:** <concrete suggested change>
- **Cites:** <docs/path.md §section> *(omit if no project rule applies)*

### High (should fix before merge)

#### H1 — <one-line title>
- **Locator:** / **Changed anchor:** / **What:** / **Evidence:** / **Verdict:** /
  **Why High:** <the serious failure mode — wrong data, outage, weakened security> /
  **Fix:** / **Cites:**

### Medium (worth fixing now; acceptable as a follow-up)

#### M1 — <one-line title>
- **Locator:** / **Changed anchor:** / **What:** / **Evidence:** / **Verdict:** /
  **Why Medium:** / **Fix:** / **Cites:**

### Low (defer)
- **L1** [locator] <one-line note>

(If there are no qualifying issues, write "No qualifying issues." under ## Issues.)

## Questions

Doubts that survived scrutiny but earned no verdict — the author can usually answer in a
minute what would take the reviewer an hour to prove. One line each, answerable, never
rhetorical.

- **Q1** [locator] <the doubt, phrased as a question the author can answer>

## Suggestions

Same block shape. Offers, not orders — the **Why** field describes the improvement, not a
failure mode, and the author may decline.

#### S1 — <one-line title>
- **Locator:** <locator>
- **What:** <the constructive alternative or improvement>
- **Why it'd be better:** <the gain — clearer intent, simpler API, fewer foot-guns>
- **Sketch:** <optional — short snippet if the alternative is non-obvious>

## Gaps
- <low-consequence absence — no changelog entry, no screenshot, no manual-test plan for an
  auto-covered change. Consequential absences are Issues with a severity, not Gaps.>

## Known limitations
- <real, considered problem deliberately not fixed — the failure mode, why it's acceptable,
  and where to document it>

## What was done well
- [file:line] <specific thing>: <why it's good>
(If genuinely none after honest looking, say so — the bar is "I looked hard," not "nothing
struck me.")

## Verified
<what was checked and confirmed fine — load-bearing assumptions, and any constraint discovered
in step 4 that explains the PR's shape — so the author sees the audited surface>

## Not reviewed
<scope skipped, and policy docs that were absent and not needed for this diff — e.g. "the
existing migration framework, accepted as-is"; "no docs/privacy.md; diff handles no personal
data">
```

**Verified** and **Not reviewed** are not optional. Without them the author has to guess at
the scope of the review and may argue findings they don't need to.

## Worked example of a non-trivial finding

> #### C1 — Duplicate-signup race lets the same email register twice
> - **Locator:** `flow: app/signup.py:13 → app/db.py:32-36`
> - **Changed anchor:** `app/signup.py:13` (new call site; `db.py` unchanged)
> - **What:** `signup.signup` calls `db.find_by_email` to enforce uniqueness, then
>   `db.insert` — two non-atomic steps. Two concurrent signups with the same email both see
>   "no match," both insert, and the store ends up with two `User` rows for one person.
> - **Evidence:** no lock or `UNIQUE` constraint on `users.email` (`schema.sql:8`); the
>   handler is async, so interleaving is unforced.
> - **Verdict:** PLAUSIBLE — mechanism confirmed from the code; trigger needs concurrency.
> - **Why Critical:** Silent data corruption. Downstream billing, auth, and password-reset all
>   join by email and now behave non-deterministically. No detection in prod until support
>   traces a duplicated invoice.
> - **Fix:** Move the uniqueness check into `db.insert` under a single critical section (or
>   rely on a `UNIQUE` constraint and translate the integrity error to `SignupError`). Drop
>   the now-redundant check in `signup.signup`.
> - **Cites:** `docs/invariants.md §4 (User identity is unique per canonical email)`

## Posting to the PR

Only if the user asks:

```bash
gh pr comment <N> --body-file <review.md>
```

For inline comments on specific lines, ask the user which findings to thread vs. summarize.
PR comments are public, durable, and ration the author's attention — the user decides what
makes it.

## Definition of done

Each item is answerable with evidence — a quote from the diff, a doc path, a CI line — not a
vibe. If a checkbox cannot be ticked honestly, return to the step that produces it.

- [ ] Target resolved per **Target and mode**: the reviewed diff is the merge-base comparison (or the
  explicit PR/range), working-tree changes included when present.
- [ ] Mode stated — quick or full, with the blast-radius reason when auto-chosen. In quick
  mode, every skipped axis is listed under **Not reviewed**.
- [ ] Description read; problem, approach, constraints, non-obvious decisions extracted or
  flagged as missing. Linked ticket read and reconciled.
- [ ] Problem confirmed to exist in the base-snapshot code — or the report flags that it
  doesn't / is already solved.
- [ ] 2–3 obvious approaches sketched **before** the diff was read; the approach mapped or
  the divergence diagnosed (constraint cited under Verified, or the open question is the
  headline).
- [ ] Rule sources read: applicable agent instruction files, and load-bearing project docs in
  full. `references/audit.md` was read; every applicable axis walked, the rest listed under
  **Not reviewed**.
- [ ] The five 5c angles and the 5d tracer were each walked (or delegated); every candidate
  carried a one-line failure scenario into verification.
- [ ] `references/verify.md` was read. Every Medium+ Issue carries a Verdict (CONFIRMED or
  PLAUSIBLE); REFUTED candidates appear under Verified with the disproving citation; the gap
  sweep ran and its additions were verified (an empty sweep is fine, padding is not).
- [ ] Findings on architecture, conventions, security, privacy, testing each cite the rule
  (file + section or quoted line) or are downgraded / marked "no project rule; judged against
  <named standard>".
- [ ] At least one load-bearing assumption verified against an outside source — or the
  absence of any is justified.
- [ ] Top 3 production-risk failure modes named; for each, the covering test (or its absence)
  identified.
- [ ] Reversibility assessed; irreversible side effects flagged Critical or High.
- [ ] Occam pass ran; every simplification proposal names the constraints it was walked
  against.
- [ ] `references/report.md` was read; report follows its template — six signals, stable
  IDs, locators, block rendering with Evidence and Verdict fields on non-Low issues,
  findings-first order, Verified and Not reviewed present.
- [ ] Report printed to the terminal; posted to the PR only on explicit request.
- [ ] No trace left: the primary checkout matches the recorded baseline (`git status`
  compared) — experiments ran in a detached worktree or outside the repo, now removed;
  nothing pushed, commented, triggered, or sent anywhere without approval obtained *during
  this review*.
