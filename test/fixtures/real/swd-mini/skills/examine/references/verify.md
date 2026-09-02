# Verify and sweep

Loaded from `SKILL.md` step 7. Candidates become findings only after this pass — the
reviewer who found a candidate is the worst-placed judge of it.

## Dedup first

Candidates pointing at the same line or mechanism collapse into the one with the most
concrete failure scenario. A single root cause with many symptoms is one finding (use a
`flow:` locator), not several.

## The verdict rubric — three states

- **CONFIRMED** — you can name the inputs or state that trigger it and the wrong output or
  behavior that results. Quote the line that proves it.
- **PLAUSIBLE** — the mechanism is real; the trigger is uncertain (timing, environment, data
  shape).
- **REFUTED** — only when constructible from the code: factually wrong (quote the actual
  line); provably impossible (type, constant, invariant — show it); already handled in this
  diff (cite the guard); or pure style with no observable effect.

**PLAUSIBLE by default.** Do not refute a candidate for being "speculative" or "depends on
runtime state" when the state is realistic: concurrency races, nil/undefined on a
rare-but-reachable path (error handler, cold cache, missing optional field), falsy-zero
treated as missing, off-by-one on a boundary the code does not exclude, retry storms and
partial failures, a regex or allowlist slightly too broad. Realistic-but-rare is what
production is made of. Refutation is a proof obligation, not a mood.

## Mechanics

- **Host has subagents:** one verifier per candidate. Give it only the diff, the relevant
  file(s), and the candidate — not your reasoning, so it cannot anchor on it.
- **No subagents:** verify each candidate yourself in a deliberately adversarial re-read —
  try to REFUTE it from the code. What survives is CONFIRMED or PLAUSIBLE. State in the
  report that verification was single-context.
- **Keep CONFIRMED and PLAUSIBLE.** They get a severity (impact) and carry their verdict
  into the report's `Verdict` field. **REFUTED** candidates move to the **Verified**
  section with the disproving citation — the check was work worth showing.
- Low candidates and Suggestions may skip verification; they are cheap for the author to
  decline.
- **Occam candidates** verify differently: the "failure scenario" is the concrete cost (what
  is duplicated, operated, or will be copied); a refutation is the constraint that justifies
  the complexity, cited.

## Gap sweep

After verification, one more pass as a fresh reviewer holding the surviving list. Re-read
the diff and enclosing functions looking **only** for defects not already listed — do not
re-derive or re-confirm anything on it. First passes tend to miss:

- moved or extracted code that dropped a guard or an anchor
- lock scope silently shrunk
- config or feature-flag defaults flipped
- setup/teardown asymmetry in tests
- predicate methods with side effects
- a default value evaluated once at definition time instead of per call

New candidates from the sweep go through the same verdict rubric. If nothing new turns up,
the sweep returns empty — do not pad.
