# The default spec format

Loaded from `SKILL.md` step 1 when the repo has no spec convention of its own. This is
the same convention `/repo-docs` bootstraps — a repo set up with it needs nothing here
beyond the reminder that the repo's own `docs/product-specs/README.md` is the authority.

## Location

`docs/product-specs/<feature>.md` — one feature area per file. The directory's
`README.md` holds the format rules, the prefix table, and the index; `invariants.md`
holds cross-cutting invariants. Adding a file means updating both tables in `README.md`
and picking an unused prefix (3–6 uppercase letters from the feature's distinctive noun).

## The feature file

A one-paragraph intro (what the feature is, why it exists, key terms — the goals live
here, compressed), `Prefix: XXX`, an optional short **Non-goals** list (the boundary is
part of the contract), then the criteria:

```markdown
### XXX-NNN: Short title
<1–3 sentence behavioral body, precise enough that a test falls out of it directly.>
```

- **One assertion per criterion.** Observable, deterministic, implementation-free — no
  function, class, schema, or file names. Exact value lists for enums ("one of: A, B,
  C"); config keys when behavior is configurable.
- **Error and edge behavior are criteria too**, not implications: what the user sees when
  it goes wrong gets its own ID.
- **No `**Testable:**` appendix, no narrative, no rationale** — rewrite the body until it
  is self-evidently testable; rationale lives in architecture docs or the PR.

## IDs

- `NNN` is a zero-padded three-digit number: `PFX-001` < `PFX-010` < `PFX-100` sorts
  lexicographically. Ascending within the file.
- **Append-only.** New criteria take the next free number; deletions leave holes;
  renumbering never happens — IDs are cited from code comments, tests, PRs, and other
  specs, and a renumber breaks every citation silently.
- Sub-cases sharing preconditions and differing on one variable take a letter suffix:
  `PFX-012A`, `PFX-012B`.
- Cite across files with the bare ID (`see BILL-003`) — the prefix already names the file.

## Invariants, two tiers

- **Cross-cutting** — a rule multiple subsystems must respect, or a security /
  data-privacy / billing-integrity property: `INV-NNN` in `invariants.md`. Litmus: would
  a security reviewer want it findable in one place?
- **Feature-local** — enforced only inside this feature: a prose contract in the feature
  file, no numeric ID, referenced by the criteria that exercise it.

## Open questions and assumptions

They exist only before sign-off: the draft carries them explicitly (an `Open questions`
block at the end, assumptions marked inline). Sign-off resolves each one — into a
criterion, a non-goal, or a deliberate deletion; the merged spec file carries none.
