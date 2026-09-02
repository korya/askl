---
name: examine
description: Review a code change rigorously — a PR, branch, commit range, or the working tree. Confirm the problem is real, sketch the obvious solutions before reading the diff, then audit it for correctness, completeness, architecture, conventions, security, privacy, testing, reversibility, and dependencies, judge whether it is right-sized, and verify every significant finding independently. Returns a six-signal report: done well, gaps, issues rated Critical to Low with a separate confidence verdict, questions, suggestions, known limitations. Use when the user says "/examine", "examine this PR", "review this PR", "review pr #N", "review my branch", "look over my pull request", "check my PR before merge", or asks for a deep code review. Holistic where the host's built-in review is defect-first.
---

# Examine: production-risk-first code review

Find what would actually break in production, verify the change's claims instead of trusting
them, and judge whether the solution is right-sized. The host's built-in review asks "does
this introduce a bug?"; `/examine` asks "is this the right, production-safe, right-sized
change?" Skip it for typo and doc-only changes.

## Required references

This file is the skeleton; each reference holds a step's full rules. Read it **at that step**.

| File | Read at | Holds |
|---|---|---|
| `references/audit.md` | step 5 | axes 5a–5m, the Occam pass |
| `references/verify.md` | step 7 | dedup, CONFIRMED / PLAUSIBLE / REFUTED rubric, gap sweep |
| `references/report.md` | step 8 | signals, severities, locators, template, definition of done |
| `references/rationalizations.md` | when tempted to skip a step | why each shortcut fails |

## Principles

- **Trust nothing, verify everything.** The description, the diff, and green tests are
  claims — so are your own candidates, which become findings only after step 7.
- **Project rules over generic best practice.** Read the rulebook before judging; cite it
  per finding.
- **The simplest solution that satisfies the constraints wins.** Sketch the obvious fix
  before reading the diff; divergence is a question to investigate, never proof.
- **No side effects.** Read and run anything locally, but experiment in a detached worktree
  (`git worktree add --detach`) or outside the repo, never in the primary checkout. Never
  push, comment, trigger CI, or contact anyone; if evidence needs that, ask — consent from
  an earlier task does not carry over.

## Target and mode

- **PR:** `gh pr view <N>` (title, body, base, head, files), `gh pr diff <N>`, `gh pr checks <N>`.
- **Branch or no argument:** compare against the upstream when it is ahead, else the local
  base branch: `git diff $(git merge-base HEAD <ref>)`. Add `git diff HEAD` when the tree is
  dirty or the range is empty.
- **Range or path:** exactly that. Read pre-change code from the base snapshot
  (`git show <merge-base>:<path>`).
- Record the baseline (branch, `HEAD`, `git status --porcelain`); the end check proves the
  checkout is untouched. Posting to the PR defaults to **no**.

`/examine [quick|full] <target>`. Unspecified: **full** for migrations, auth, payments,
personal data, dependencies, infra, or more than ~15 files, else **quick** — state the
choice. Quick runs steps 1, 2 (instruction files only), 3 (three-bullet sketches), 4, 5a–5d
plus 5k, 7, 9; skipped axes go under Not reviewed, no Occam pass or host reviewers, at most
8 Issues. Never pad toward a cap.

## Workflow

Delegate independent passes to read-only subagents when the host has them; you own severity
and synthesis.

1. **Intent.** From the description (else the commits and the user's framing): stated
   problem, approach, constraints and non-goals, non-obvious decisions. Read any linked
   ticket; drift from it is a finding. A missing description is finding #1 (`scope: PR`);
   mark inferred intent *derived, not stated*.
2. **Rulebook.** Read every agent instruction file governing a changed file (user-level,
   repo root, ancestor directories) and, in full, the project docs the diff makes
   load-bearing — invariants, security, privacy, the touched spec, testing; skim
   architecture and guidelines. A finding on any of those cites its rule (file + section) or
   downgrades to a Suggestion; with no project rule, name the standard (OWASP, GDPR). An
   absent doc the diff does not need is one line under Not reviewed.
3. **Baseline — before opening the diff.** Confirm the problem exists in the base snapshot;
   "already solved by an existing utility" or "misdiagnosed symptom" reframes the review and
   is finding #1. Sketch 2–3 obvious approaches, a sentence each, scaled to blast radius.
4. **Approach gate.** Matches a sketch → proceed; whatever the change does beyond it needs a
   constraint and feeds step 6. Diverges → assume your sketch missed a constraint and hunt
   for it (ticket, docs, history, adjacent code): found → note under Verified; not found →
   an approach-level question that is the **headline**, every line finding provisional.
   Wrong on its face → point the author at `/blueprint`.
5. **Audit.** Read `references/audit.md` now; track each axis in your task tool. 5a
   alignment with the claimed approach · 5b solves the stated problem · 5c correctness, five
   angles · 5d cross-file tracer · 5e–5m architecture, conventions, security, privacy,
   testing, load-bearing assumptions, risk coverage, reversibility, dependencies. Every
   issue-shaped observation becomes a *candidate* with a one-line failure scenario, never
   dropped silently. Full mode: the host's built-in review runs in a subagent, pointed at the
   reviewed checkout, as one more candidate source, never as the report
   (`--no-host-reviewers` skips it).
6. **Occam pass** (full mode; rules in `audit.md` § 6): premature optimization, speculative
   generality, over-defence, reinvention, band-aids, deletion candidates. Simplifications
   clear the same evidence bar and default to Suggestion.
7. **Verify and sweep.** Read `references/verify.md` now. Dedup, then give every Medium+
   candidate an independent verdict — a subagent holding only the diff, files, and candidate,
   else an adversarial self-pass. Keep CONFIRMED and PLAUSIBLE; REFUTED moves to Verified
   with its citation. Then one fresh-eyes sweep for what the list missed, verified the same
   way; an empty sweep is a valid result.
8. **Synthesize.** Read `references/report.md` now. Issues carry a severity (impact) and a
   Verdict (confidence); Critical and High are scarce. An absence the author must address is
   an Issue, a nice-to-note one a Gap; a doubt with no named mechanism is a Question.
9. **Report locally**, findings first, per the template. If the host has a structured
   findings tool, call it once with the Issues; the terminal report is the deliverable.
10. **Post to the PR only if asked.** Comments are public and durable.

## Done when

Every item in `report.md` § Definition of done is answerable with evidence. One you cannot
tick honestly sends you back to the step that produces it; a step you are tempted to skip
sends you to `references/rationalizations.md`.
