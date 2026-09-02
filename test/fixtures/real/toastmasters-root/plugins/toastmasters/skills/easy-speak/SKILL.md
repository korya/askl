---
name: easy-speak
license: MIT
compatibility: Requires browser automation the agent can drive (Claude Code with the Chrome extension, or any agent with a browser MCP server such as Playwright). Needs an easy-Speak account; the user logs in themselves.
description: Manage Toastmasters club participation on easy-Speak (easy-speak.org, toastmasterclub.org, tmclub.eu) by driving the site's web UI in Chrome — check or set meeting attendance, claim roles, see when you're next speaking, and read the agenda, roster or club calendar. Use this whenever the user mentions easy-Speak, Toastmasters, their club meetings, meeting roles (Toastmaster, Table Topics Master, Evaluator, Grammarian, Timer, Quizmaster, Ah-Counter), or asks things like "am I speaking soon", "what roles are open next week", "confirm me for the next three meetings", "sign me up as Timer", or "who's on the agenda" — even when they never name the website.
---

# easy-Speak

easy-Speak is the meeting-management system many Toastmasters clubs run on. It is a phpBB-era PHP
application with no API, so this skill works by driving the real web UI in Chrome.

## Requirements — read this before promising anything

This skill has hands only if the agent running it can drive a browser. easy-Speak has no API, no
authenticated feed, and sits behind Cloudflare, so there is no way to do the work over plain HTTP.

- **Claude Code with the Chrome extension** — the intended setup. Navigate, read the page, and run the
  bundled scripts through the browser JavaScript tool.
- **Any agent with a browser MCP server** (Playwright or similar) — works. `references/operations.md` is
  written as what a human does in the browser precisely so it survives the swap; only the tool names change.
- **Codex or ChatGPT with no browser tooling configured** — the skill will load and read correctly, and then
  be unable to act. If that's the situation, say so plainly up front rather than working through the
  algorithm and discovering it at the click. Offer the user the read-only alternative: walk them through the
  steps to run themselves.

Check what you actually have before telling the user what you'll do. An agent that announces "I'll confirm
your attendance" and then cannot click is worse than one that says "I can't reach the site from here."

## The one idea that makes this simple

Almost everything lives on **one page**: `/signup.php`, the *Sign Up for Meetings* board. It is a single
table — **role rows × upcoming-meeting columns** — and it simultaneously answers:

- Am I confirmed for the next meeting(s)?
- Which roles are still open?
- Who is speaking, and am I one of them?

...and it is also where you change all of those. Start there for nearly every request, and only go
elsewhere for detail (full agenda, roster, months further out). `references/site-map.md` covers the rest of
the site.

## Getting a session

1. Pick the host. Clubs are split across three installs of the same software: `toastmasterclub.org`
   (UK/Ireland), `tmclub.eu` (mainland Europe), `easy-speak.org` (everywhere else). If the user hasn't said,
   ask once and remember it.
2. Open `https://<host>/signup.php`. **Cloudflare serves a `Just a moment...` interstitial on the first
   hit** — wait about 5 seconds and let the tab title change before reading anything. A page read taken too
   early returns the challenge page, not the site.
3. Confirm you're logged in (`session.loggedIn` in the board output below).
4. If logged out: **hand the tab to the user and ask them to log in.** The login form is in the left sidebar
   of `portal.php`. Never type the password — that is theirs to enter, and there is no automation win worth
   holding someone's credentials.

Sessions expire between conversations. Check every time rather than assuming; a stale session renders a
public marketing page that parses as "no meetings", which looks like real data and isn't.

## Reading the board

Run `scripts/read_board.js` in the page (via the browser JavaScript tool) and parse the JSON it returns:

```
{ "session":    {"loggedIn": true, "fullName": "...", "username": "..."},
  "dateRange":  "No more dates available",
  "meetings":   [{"col": 0, "label": "24 Aug 26", "meetingId": "644310"}],
  "attendance": [{"meetingId": "644310", "status": "none", "controls": {"inPerson": "es-0", ...}}],
  "roles":      [{"role": "Evaluator", "meetingId": "644310",
                  "occupants": [{"slot": "1", "name": "Liz Sampleton"}],
                  "openSlots": [{"mark": "es-4", "slot": "2", "mode": "inPerson", "title": "..."}],
                  "mine": false}] }
```

Use the script rather than reading the page by eye. The board is a dense grid of near-identical 16px icons
where a one-row misread means signing up for the wrong role, and the script already handles the edge cases
that bite hand-rolled parsers (see *Things that will bite you*).

`status` is one of `inPerson`, `online`, `notAttending`, `undecided`, or `none`.

`options` lists only the choices this board actually renders — read it rather than assuming. Clubs that
don't meet online have no `online` option and no online icon on their open slots, and telling such a member
"I'll sign you up online" promises something the board cannot do.

To **verify** a write, run `scripts/summarize_board.js` instead — same facts, one screen, cheap to re-run.

## Changing things

The rhythm for every write is **read → confirm → click → re-read → report what you actually saw.**

**Confirm with the user first**, naming the meeting date and the exact value. This isn't ceremony: clicking a
role icon is a side-effecting GET that commits the instant it's clicked, with no "are you sure" dialog, and
the change is immediately visible to the whole club — including the VP Education planning the agenda around
it. Undoing means finding a release control this skill hasn't mapped yet.

**Click by mark, not by coordinates.** `read_board.js` tags every actionable element with `data-es-mark`;
`scripts/click_mark.js` clicks one by that tag, dispatching a real click so the page's own handlers run
exactly as they would for a human. Coordinate clicks on a table of identical icons are how you sign someone
up as Grammarian when they asked for Timer.

**Re-read the board afterwards.** The page reloads on every write, which destroys the marks and can reorder
columns. Re-running is both how you re-tag and how you verify. Report the state you observed, not the state
you intended — if a write silently didn't take, saying "done" is worse than saying nothing.

**Don't sleep a fixed number of seconds waiting for the reload.** `summarize_board.js` reports
`document.readyState` on its first line; if that says `loading`, or the value still reads the old one, run it
again. A sleep guessed too short reports "the write didn't take" when it did — a false negative on the exact
claim this skill exists to make honestly.

For the click-by-click algorithm behind each operation, read `references/operations.md`.

## Operations

| | Operation | Notes |
|---|---|---|
| **Read** | List upcoming meetings | `meetings[]` from the board |
| | Check my attendance | `attendance[]` — mind `none` vs `undecided` |
| | Which roles are open / who's assigned | `roles[]` |
| | When am I next speaking | `roles[]` where `role` is Speaker and `mine` is true |
| | Full agenda for a meeting | `/view_meeting.php?t=<meetingId>` |
| | Club roster / officers | `/memberlist.php` — see site-map |
| | Meetings further out | `/mycalendar.php?jump=<months ahead>` |
| **Write** | Confirm attendance (in person / online / undecided) | Click the matching `controls` mark |
| | Decline attendance | Click `N`, then confirm in the popup that opens; reason is optional |
| | Claim a role | Click an `openSlots` mark; also sets your attendance |
| | Release a role | **Unmapped** — hand to the user |
| | Request a speech slot | **Unmapped** — hand to the user |

Two operations are still unmapped, because verifying them required writing to a live club board. When one
comes up, say so and drive the user through the UI rather than guessing at a control you've never seen.

Declining is now mapped, with one caveat: nobody has yet declined *while holding a role*, so whether that
releases the role is unknown. If that's the situation, say so and check the board afterwards.

## Things that will bite you

**Match meetings by `meetingId`, never by column position.** The radio inputs are named `available[0]`,
`available[1]` — a bare column index with no meeting id in it. Columns shift as meetings are scheduled and
pass, so position is not identity.

**There may be fewer meetings than the user asked for.** "The next three meetings" often returns one,
because the VP Education hasn't scheduled further out. That's normal, not an error. Say plainly how many
exist rather than quietly returning a short list — and note that `dateRange` says `No more dates available`
when the board is exhausted. To distinguish "not scheduled yet" from "hidden behind a signup horizon", check
`/mycalendar.php?jump=1`; if neighbouring clubs have meetings that month and this club doesn't, nobody has
scheduled them.

**`none` and `undecided` are different states.** `none` means the member never responded at all;
`undecided` means they deliberately chose `?`. Only the first is worth nudging about. The UI shows both as
"no commitment", so it's easy to collapse them and lose the distinction the user cares about.

**Claiming a role also sets your attendance.** Each role icon carries an in-person/online flag, so
signing up as Timer in person marks you attending in person. Attendance and roles look independent and
aren't — mention this when a user claims a role after saying they might not make it.

**Role slot ids are per-meeting.** `roleItemId` identifies an agenda line, not a role type — "Toastmaster"
has a different id at every meeting. Never carry one across meetings; always re-read the board.

**Declining is not symmetric with accepting.** `P`/`O`/`?` submit the form; `N` opens a popup and leaves the
board untouched until that popup is confirmed. Use the popup's own button rather than submitting around it,
or you strand a window on the user's screen whose OK button would re-submit.

**An empty board is not an error.** When the club has nothing scheduled, `/signup.php` renders "There is no
data to report in this category for your club" with no table at all. The scripts return `empty: true` for
this. It means the VP Education hasn't scheduled, not that anything is broken — say so plainly rather than
reporting a parse failure.

**Keep query strings out of tool output.** The Chrome extension blocks tool results that look like
cookie or query-string data, so a script that dumps raw hrefs returns `[BLOCKED]` and costs a round trip.
`read_board.js` already extracts the parts it needs into JSON fields; follow that pattern if you extend it.

## Reporting back

Lead with the answer, then the supporting detail. A table of meetings/roles reads better than prose.

Report what you observed. If the user asked about three meetings and one exists, the first line says so.
If a write didn't visibly take effect, say that instead of assuming success.

When reading the roster, take names and club roles and leave the phone and email columns alone — a headcount
doesn't need the club's contact details pulled into a transcript.

## Files

- `scripts/read_board.js` — parse the signup board into JSON and tag clickable elements
- `scripts/summarize_board.js` — one-screen view of the board; use this to verify a write
- `scripts/click_mark.js` — click a tagged element (substitute `__MARK__`)
- `references/operations.md` — step-by-step algorithm for each operation, including the unmapped ones
- `references/site-map.md` — page map, attendance codes, URL contracts, provenance
