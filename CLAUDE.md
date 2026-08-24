# CLAUDE.md

**By Heart.** A Bahá'í prayer book with a spaced repetition memorisation engine built into it.
Both halves are first class. Reading is not a concession to memorisation, and memorisation is not a
bolt-on to reading.

React + Vite + TypeScript PWA. Local-first, fully offline, free. Solo build.

---

## 1. Before you start a session

1. **Read the scope sections named in the session prompt.** If none are named, stop and ask.
2. Read the last entry in `/docs/sessions.md`.
3. **Do not read the whole scope.** It is 10,000 words. Targeted retrieval beats skimming, and
   skimming is how principles get breached forty turns later.

`**[v1.0]**`, `**[v1.1]**`, `**[v2]**` and `**[v3.0]**` tags in the scope mark content that is not
in the current release. Read those passages for context. Do not build what they describe.

---

## 2. Documents and precedence

| File | What it owns |
|---|---|
| `/docs/scope.md` | Behaviour, information architecture, data model, vocabulary, release scope. Currently v4.2. |
| `/docs/design-tokens.md` | Colour, typography, spacing, iconography, motion, construction patterns |
| `/docs/decisions.md` | Append-only. Decisions taken during the build, and contradictions found in the scope |
| `/docs/sessions.md` | Append-only. One entry per build session |

**The scope owns behaviour. The tokens document owns appearance. Where they conflict, the scope
wins.** Nine known conflicts between the scope and the original design handoff are already resolved
and recorded in `design-tokens.md` section 9. Do not reintroduce them.

**Never edit `/docs/scope.md`.** If you find a contradiction, an error, or something the build has
proven wrong, append it to `/docs/decisions.md` and name it in your session summary. Safa issues
scope revisions.

---

## 3. Principles that break silently

Four principles from scope section 7 are quoted here in full, because they are cross-cutting, no
session plan will remind you of them, and a breach looks like ordinary correct work.

**7.6 — Memorisation chrome never appears in Discover.** No due counts, no focus banner, no streak,
no freshness state, no progress indicator anywhere in the library, the category lists, the search
results, or the reading view. All of it lives in Memorise and Log only. This protects the devotional
half of the product. Opening the app at a gathering and being met with "3 due today" turns worship
into a chore reminder.

**7.8 — No social layer.** No leaderboards, friends, sharing, groups or comparison. This is
load-bearing: it removes moderation, reporting, blocking and most privacy complexity permanently.

**7.10 — Every text is attributed, always.** Licence condition and correct devotional practice.
Every surface that renders a passage renders its attribution. The reading view also renders
`© BAHÁ'Í INTERNATIONAL COMMUNITY`.

**7.11 — Every user-facing string lives in one module.** From the first commit. This is what makes
the deferred vocabulary decision safe: a future tone pass is one file, not a hunt through forty
components.

Vocabulary is fixed in `src/strings/`. Never invent a label. Never change one without logging a
decision.

---

## 4. Never do

**Code**
1. Never hard-code a colour. Tokens via the theme provider only.
2. Never name a font family in a component. Slot names (`display`, `body`, `caps`) only.
3. Never put a user-facing string in a component. `src/strings/` only.
4. Never import Dexie outside `src/data/`.
5. Never import anything into `src/scheduler/` beyond its own types.
6. Never add a dependency without logging it as a decision.

**Product**
7. Never render freshness, due counts, streaks, progress or any memorisation state in Discover or
   the reading view.
8. Never render a passage without its attribution.
9. Never add a social, sharing, comparison or leaderboard feature.
10. Never use sacred text as reward or congratulation chrome.

**Data and network**
11. Never make a network call from application code. `scripts/` is exempt, being build-time tooling.
12. Never hand-edit the committed corpus JSON. Change the fetch script and re-run it.
13. Never commit `.env`, keys, or anything under `supabase/`.

**Git**
14. Never `--force`. Never rewrite history. Never push to `main`.

**Language**
15. Australian English everywhere, including code comments and commit messages. No em dashes in
    user-facing copy.

---

## 5. Definition of done

A session is not complete until all five gates have been run **in this order** and their **real
output pasted verbatim**.

```
npx tsc --noEmit
npm run lint
npm run test
npm run build
npm version minor --no-git-tag-version && git tag v0.N.0
```

**Never report a step as passing without showing its output. If a gate fails, say so and stop.**

When a gate fails, paste the raw output and then say in one plain sentence what broke and what it
means. The raw output is the evidence. The sentence is what Safa actually reads.

Then the handoff, which is four things, every session without exception.

**1. Append an entry to `/docs/sessions.md`.** Session number, version tag, what shipped, what was
deferred and why, anything that surprised you, and what the next session should read first. Around
150 words, in the language of section 6.

**2. Push the branch and write merge instructions**, in the format of section 6.4: numbered steps,
exact commands one per line, what each does in one plain sentence, what success looks like, what to
do if it fails. In full, every session, even if it is identical to last time.

**3. Write the next session's prompt**, using `/docs/session-prompt-template.md`, in a fenced code
block ready to copy.

- **The goal and the item list come from the build sequence table in scope section 16.** Do not
  invent a session and do not resequence.
- If the build has taught you the sequence is wrong, **say so as a proposal with reasons, outside
  the code block.** Do not silently rewrite it. Safa decides.
- Name the exact scope sections it should read.
- Populate "explicitly out of scope" from three places: anything you deferred this session, anything
  tagged `**[v1.0]**` or later inside the scope sections it will read, and the obvious adjacent
  feature it will be tempted to build.
- Six items maximum. If the session needs more, split it and say where.
- **Assume the next session starts with no memory of this one.** Every session is a fresh context
  with nothing carried over. The prompt must stand entirely on its own.
- **Carry this same four-part handoff into its definition of done.** The chain breaks the first time
  a session forgets to ask for it.

**4. List your open questions.** Anything you decided by default that Safa might want to overturn,
and anything that needs his answer before the next session starts. Written per section 6.2. If there
are none, say so explicitly rather than leaving it out.

---

## 6. Talking to Safa

**Safa does not have a technical background.** He owns every product decision here and makes them
well, but only when the question is put in language he can actually evaluate. A question he cannot
fully parse gets a rubber-stamped answer, and a rubber-stamped answer is worse than not asking.

**The test: if you cannot explain the tradeoff without jargon, you have not understood it well
enough to ask about it.** Work it out first, then ask.

### 6.1 When to stop and ask

**Stop and ask** for:
- Anything a user sees or feels. Layout, copy, interaction, flow order, any label.
- Schema changes.
- Anything that would breach a numbered principle in scope section 7.

**Default and log** for everything else.

### 6.2 How to ask

Every question carries five things, in this order:

1. **What I am doing and where I got stuck.** One sentence.
2. **Why it matters**, described as what a user would experience. Not what the code would do.
3. **The options in plain terms.** What each one would feel like to use.
4. **How hard it is to change later.** Say "easy to change later" or "changing this after session 6
   means redoing the whole queue". This is the single most useful thing you can tell him.
5. **What I recommend, and why.**

**Every technical term gets a plain gloss in brackets on first use, every session.** Do not assume a
term explained in session 2 is remembered in session 7. Context does not carry between sessions.

**Bad:** "Should `segment_progress` be denormalised onto `user_prayers` for query performance?"

**Good:** "To show how fresh a passage is, the Log screen currently reads from two places and
combines them, which makes it slightly slower to open. I could store a summary in one place so it
only reads once. The cost is that the summary can drift out of date if an update is ever missed, and
the user would see a wrong freshness state. Easy to change later either way. I recommend leaving it
as it is, because the Log opens in about 30 milliseconds and nobody will feel the difference."

### 6.3 How to write a decision log entry

Same language rules. Full format when the decision touches more than one file or would be expensive
to reverse: the decision, the options considered, what each would have meant in practice, why this
one, and whether it can be changed later. One line when the decision is contained and cheap.

**Every full entry ends with "what this means for you", in one sentence**, or states plainly that it
changes nothing about how the app behaves.

Both are printed in the session output as you go **and** appended to `/docs/decisions.md`.

### 6.4 When Safa has to do something himself

Merging a branch, installing something, obtaining a key, checking something in a browser, deciding
something at his end. Every handoff carries:

1. **What to do**, as numbered steps.
2. **The exact commands**, one per line, ready to copy. Never a command containing a placeholder
   unless you state exactly what to substitute and where to find it.
3. **What each command does**, in one plain sentence.
4. **What success looks like.** What he should see on screen if it worked.
5. **What to do if it fails.** At minimum, "send me the error and stop".

**Never write "just merge the branch" or "run the usual build".** State it fully every time, even if
you stated the same thing last session.

---

## 7. Git

- **Branch per session**, named `session-04-discover`. Push the branch. Never push to `main`.
- **Conventional commits**: `feat:`, `fix:`, `test:`, `chore:`, `docs:`.
- **Tag at session end** with the version from section 8.
- **Safa merges.** Hand it over using the format in section 6.4: exact commands, what each does,
  what success looks like, what to do if it fails. Every time, in full.

---

## 8. Versioning

`package.json` is the single source of truth.

**Minor version equals session number.** Session 6 ships `0.6.0`. Patch increments for fixes between
sessions. Injected at build time via a Vite `define` and displayed in Settings as:

```
v0.6.0 · a3fa300 · 23 Aug 2026
```

Version, short commit SHA, build date. This is what a tester reads off their screen, so it must be
present from session 2 onward.

---

## 9. Structure

```
src/
  scheduler/    Pure SM-2. Imports nothing outside itself and its own types.
                Fully unit tested against synthetic data. Swappable for FSRS.
  data/         Dexie. The only place Dexie is imported. All access via functions,
                so v1.0 sync is one layer rather than forty files.
  theme/        Typed theme registry, writes CSS custom properties. Registry-driven
                from the first commit: adding a theme is appending an object.
  strings/      Every user-facing string.
  config/       Tuneable constants from the scope. Queue caps, upkeep multipliers,
                focus default, streak rules, SM-2 defaults.
  features/
    discover/   Never imports from scheduler or progress. Enforced by test.
    memorise/
    log/
  components/
scripts/        Build-time tooling. Network calls allowed here only.
docs/
```

---

## 10. Stack

- React, Vite, TypeScript (strict), Tailwind
- Dexie over IndexedDB. **IndexedDB is the source of truth.**
- Vitest plus React Testing Library
- ESLint with `no-restricted-imports` boundaries
- Playwright at the V0 exit review, not before. Every tester-found bug becomes a spec before it is
  fixed.
- **No Supabase in V0.** No auth, no sync, no network. Scope section 10 table and column names are
  used exactly, and `user_id` is carried on every record, so v1.0 sync is additive.
- Fonts self-hosted and subset. Never loaded from a CDN.

---

## 11. Testing

**Unit tested, mandatory:** the scheduler, segmentation, normalisation, queue construction, streak
arithmetic, freshness derivation. These are pure functions and a silent bug in any of them
invalidates the V0 data.

**Component tested:** chip cloze only. Chip selection and match-after-normalisation is the one
interaction where a subtle bug looks like correct behaviour.

**Machine-enforced principles.** Two tests exist because prose does not survive forty turns:
- No component under `src/features/discover/**` may import from `scheduler`, `progress`, or
  progress-related types. This is principle 7.6 as a failing build.
- No string literal in JSX text position outside `src/strings/`. This is principle 7.11.

Also lint-enforced: no raw hex or `rgb()` outside `src/theme/`, and nothing imported into
`src/scheduler/`.

---

## 12. The one thing to remember

This app is opened at six in the morning to pray. Every decision that makes it feel like a study
app is a decision against the product.
