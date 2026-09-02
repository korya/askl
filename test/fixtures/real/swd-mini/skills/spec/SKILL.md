---
name: spec
description: Turn a fuzzy feature request into a reviewable product spec — goals, non-goals, testable acceptance criteria with stable IDs, invariants — that later skills cite by path and ID. Use when the user says "/spec", "spec this out", "write a product spec", "turn this idea into requirements", or brings a feature request that needs a contract before planning or building.
---

# Spec: the contract everything else cites

The point is a document later work can be *checked against*: `/blueprint` cross-validates
its plan with it, `/e2e-test` derives cases from its criteria, `/revise` uses it as the
scope fence. That only works if the spec is product-level, testable, and stably
addressable — which is what this skill enforces. `/spec` says what and why; how belongs
to `/blueprint`.

## Principles

- **WHAT and WHY, never HOW.** Everything is stated in user-observable terms. Litmus:
  two different implementations should both be able to satisfy the spec. Technical
  constraints appear only when they are genuine product constraints (compliance,
  platform), not design preferences.
- **Testable or it isn't a criterion.** Each acceptance criterion is a concrete scenario
  with an observable outcome — something an end-to-end test could execute black-box.
  "The feature should be fast/intuitive/robust" is a goal at best, never a criterion.
- **Stable IDs, append-only.** Criteria carry IDs that later skills cite; IDs are never
  renumbered or reused, and deletions leave holes. See `references/format.md`.
- **Never invent answers.** Unknowns become marked assumptions or open questions;
  blocking questions go to the user, batched, once.
- **Non-goals are load-bearing.** What the feature deliberately does not do is the fence
  against scope creep in every later skill — write them as deliberately as the goals.

## Workflow

1. **Orient.** Find the repo's existing spec convention — a specs directory, its index,
   its ID scheme — and read the specs adjacent to this feature. The repo's convention
   wins; only where there is none, use the default in **`references/format.md` — read it
   now.** Decide create vs amend: a feature that already has a spec gets an amendment,
   not a rival document.
2. **Extract.** From the request and the repo: the users involved, the pain being solved,
   current behavior being changed, adjacent specs and invariants touched. Distill
   candidate goals and constraints; inventory the unknowns.
3. **Ask what blocks the shape.** Split the unknowns: answers that change the spec's
   structure (who it serves, where its boundary sits, what success is) are asked as one
   batched round of questions — then wait. Everything else proceeds as a marked
   assumption or an open question in the draft. Zero silent inventions.
4. **Draft** per the format: overview and goals, non-goals, user-observable behavior,
   acceptance criteria as ordered testable steps with IDs — happy path, edges, and error
   behavior all as criteria — invariants (feature-local in the file; a cross-cutting one
   proposed for the global invariants doc, flagged), and open questions last. When
   amending: new criteria take fresh IDs, removed ones leave holes, and the diff should
   read as "what changed about the product's contract".
5. **Cross-check.** Every goal is covered by at least one criterion; every criterion is
   black-box testable; nothing contradicts an existing spec or invariant — a conflict is
   surfaced to the user, never silently overridden in either direction; non-goals don't
   contradict the goals.
6. **Present and gate.** Deliver the spec with its open questions surfaced; a spec is a
   contract, so the user signs off before anything downstream builds on it. Committing
   and PR-ing it is `/submit`'s job, on request.

## Definition of done

- [ ] Repo convention honored, or the default format used and said so; create vs amend
  decided deliberately.
- [ ] Blocking questions asked once, batched; every remaining unknown is a marked
  assumption or open question — none invented.
- [ ] Every criterion has a stable ID, an ordered scenario, and an observable outcome;
  IDs append-only.
- [ ] Goals each covered by a criterion; edges and error behavior specified, not implied.
- [ ] No implementation content; non-goals present and real.
- [ ] No contradiction with existing specs/invariants, or the conflict is surfaced.
- [ ] User sign-off requested before downstream work cites the spec.

## Related skills

`/blueprint` plans against the spec · `/e2e-test` tests from its criteria · `/revise`
uses it as the scope fence · `/repo-docs` sets up the docs layout specs live in.
