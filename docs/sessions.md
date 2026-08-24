# Session Log
## By Heart

Append-only. Newest at the bottom. One entry per build session, written by Claude Code as the last
act of that session.

**Format**

```
## Session N — <title>
**Version:** v0.N.0   **Branch:** session-NN-slug   **Date:** DD Mon YYYY

**Shipped.** What actually works now, in plain terms.

**Deferred.** What was in scope and did not land, and why.

**Surprises.** Anything that turned out differently from expected. Contradictions found in the
scope go here and in decisions.md.

**Next session should read first.** Scope sections, plus anything in this repo that matters.
```

Around 150 words. Written for a reader with no technical background.

---

## Session 0 — Pre-development

**Version:** none   **Branch:** none   **Date:** 23 Aug 2026

**Shipped.** Four documents, no code. `/CLAUDE.md` as the always-loaded build contract.
`/docs/scope.md` at v4.1, the same scope as v4.0 with release tags applied inline so a session
reading a mixed section can tell V0 content from later content. `/docs/design-tokens.md`, derived
from the original design handoff with the product scoping and information architecture removed and
nine conflicts with the scope resolved in the scope's favour. `/docs/session-prompt-template.md`.
Ten build decisions seeded in `/docs/decisions.md`.

**Deferred.** Nothing.

**Surprises.** The original design handoff contradicted the scope in nine places, four of them
breaches of principle 7.6, which the scope names as the principle protecting the devotional half of
the product. All nine are resolved and listed in `design-tokens.md` section 9. Do not reintroduce
them.

**Next session should read first.** `/CLAUDE.md` in full. `/docs/scope.md` sections 8.2, 8.3, 8.5,
8.7, 9.6, and the `segment_progress` and `user_prayers` entries in section 10.

---

## Session 1 — Repo scaffold and SM-2 scheduler

**Version:** v0.1.0   **Branch:** session-01-scheduler   **Date:** 24 Aug 2026

**Shipped.** The repository and the scheduler. The scheduler is sealed: nothing outside it can be
imported into it, it never reads the clock, and it holds no state. The seal is enforced twice, by a
lint rule and by a test that reads the scheduler's own source. It does per-segment SM-2, whole
passage promotion on milestone with demotion on a rating of Again, and the three upkeep states. 108
tests, including a 250 day simulation over seven rating patterns which prints its interval tables so
you can eyeball the growth. A passage always rated Good needs six reviews in eight months. One rated
Hard and lapsing every third review needs ninety five and stays on a weekly cycle.

**Deferred.** Nothing from this session's list. The version line for Settings is session 2. The two
other machine-enforced principles in CLAUDE.md section 11 need the folders they police to exist, so
they land in session 2.

**Surprises.** Three, all in `decisions.md`. The lint rule CLAUDE.md names cannot express this
boundary, so the wall uses a tighter one (D1.6). CLAUDE.md puts SM-2 defaults in `src/config/` while
forbidding the scheduler from importing anything, so the scheduler owns its defaults and takes
overrides as an argument (D1.7). And scope 8.7's "the slowest of its segments' intervals" reads both
ways. Built as the shortest interval, so the weakest line sets the pace. Open question for you (D1.3).

**Next session should read first.** `/CLAUDE.md` in full. Scope sections 3.1, 10, 12.1, 12.2, 13.1,
13.2. `/docs/design-tokens.md` sections 1 to 4 and 9. Decisions D0.8, D0.9, D1.6 and D1.7. In the
repo, `src/scheduler/index.ts`, the contract session 6 builds the queue against, and
`eslint.config.js`, where the next two boundaries go.

---

## Session 2 — Data layer, strings, theme registry and the three-tab shell

**Version:** v0.2.0   **Branch:** session-02-data-layer   **Date:** 24 Aug 2026

**Shipped.** The four places everything later goes. A local database holding every table in scope
section 10, with its column names used exactly, so adding sync at v1.0 is a change to one folder.
Every user-owned row already carries the anonymous device id of scope 13.1. Every user-facing word
now lives in one file, in the plain language of scope 11.5, unchanged. Both palettes and all seven
typefaces are described as data, so a new one is an entry in a list rather than a rewrite. And the
three tabs exist and route, empty, with the version, commit and build date shown in Settings. 290
tests, including the two that make principles 7.6 and 7.11 break the build rather than sit in a
document: Discover physically cannot reach the streak, the due dates or the Ruhi material, and no
word can be typed into a screen instead of the strings file. Both were proven by planting a breach
and watching them fail.

**Deferred.** Nothing from this session's list. The tab bar ships without icons, because the tokens
document defines only three drawings for the whole app and none of them is a tab icon (D2.5).

**Surprises.** Two, both in `decisions.md`. Design-tokens 2.1 and 2.4 appear to fight: clamping text
size the obvious way would cancel out the correction that makes all seven typefaces look the same
size, so the limit is applied to the part you control (D2.6). And Tangerine's decorative first
letter reaches 120px at maximum text size, about a third of a phone screen. It cannot happen in V0,
which ships Italiana only, but it needs your eye when the typeface picker is built (D2.8).

**Next session should read first.** `/CLAUDE.md` in full. Scope sections 4.1, 4.2, 4.3, 6.2, 10, and
12.2. `/docs/design-tokens.md` sections 2.1, 8.1 and 8.2. Decisions D0.7, D0.9, D1.8 and D2.7. In
the repo, `src/data/types.ts` for the exact shape a passage must arrive in, `src/data/corpus.ts` for
the functions that load it, and `scripts/`, which is empty and is where the two new scripts go.

---

## Session 3 — Corpus fetch script, committed dataset, and the fonts

**Version:** v0.3.0   **Branch:** session-03-corpus   **Date:** 24 Aug 2026

**Shipped.** Real prayers, for the first time. A script fetches all four English feeds from
bahaiprayers.net plus their topic tags, turns each record into a passage the way the schema expects,
and commits the result: 473 prayers, 153 Hidden Words, 166 Gleanings, 184 Prayers and Meditations, 62
tags, one JSON file per feed. The app loads all of it into its local database the first time it opens,
in the background, without holding up the first screen, and opening it a second time does not add a
second copy. Italiana and Cormorant, the two fonts the app needs for now, are fetched and cut down to
size and sit in the repository as two small files, nothing bought or downloaded by hand. One schema
change: passages gained a `text` column, because nothing held a prayer's full wording yet (D3.1, your
call). Three refinements after your first read of this session: a title now reaches past a bare
invocation like "He is God." into the sentence after it, so it actually tells one prayer from another
(D3.9); 21 prayers that are themselves named tablets — the Tablet of Aḥmad, the Fire Tablet, the
Tablet of Visitation and 18 others — carry that tablet's own name as their title and sit together in a
new "Special Tablets" category (D3.8); and the three Obligatory Prayers get the same treatment in
their own "Obligatory Prayers" category (D3.10). 79 new tests, several against real prayers with real
oddities in
them.

**Deferred.** Nothing from this session's list.

**Surprises.** Four, all in `decisions.md`: the missing `text` column (D3.1); about a quarter of the
prayers feed has notes typed directly into the prayer text, which are now stripped out (D3.4); the
feed names each prayer's author only by an undocumented number, worked out from the prayers
themselves rather than guessed (D3.5); and the font document's list of accented letters to keep turned
out to be short a few, found by checking the real text rather than trusting the list (D3.6).

**Next session should read first.** `/CLAUDE.md` in full. Scope sections 6.1, 6.5, 6.6, 7, 8.4, and 10
(the `passages`, `bookmarks` and `user_prayers` entries). `/docs/design-tokens.md` sections 5.3, 5.4,
5.5 and 7. Decisions D3.1 (the new `text` column), D3.4 (why some prayers open with an editorial note
stripped out) and D3.8 (the "Special Tablets" category, which the category browse will list exactly
like any other tag — nothing special to build for it). In the repo, `src/data/passages.ts` and
`src/data/tags.ts` for what Discover is already allowed to read, and `src/data/bookmarks.ts` and
`src/data/userPrayers.ts` for what "bookmark" and "add to my list" already do.

---

## Session 4 — Discover: category browse, passage list, reading view

**Version:** v0.4.0   **Branch:** session-04-discover   **Date:** 25 Aug 2026

**Shipped.** The prayer book, readable. Open the app and you get 63 categories in alphabetical order
with a count beside each, tap one for its prayers with the author and an exact word count on every
row, tap a prayer and read it in full: gold drop cap, the twin rules, the fleuron, the attribution
and the copyright line, set to the typography document exactly, with the header staying put while the
prayer scrolls under it. Two marks at the top right, a ribbon to keep the place and lines with a plus
to add it to your list. 118 new tests, including principle 7.6 checked against the rendered screen
rather than only against what the code can import: no freshness word, no streak, no star, and on a
prayer whose own text has no digit in it, no digit anywhere.

**Deferred.** Nothing from this session's list. Bookmarks has no screen of its own yet; scope 6.1
lists it as V0 but this session's six items did not include it, and there is nowhere to see your
bookmarks until one is built.

**Surprises.** Two, both in `decisions.md`. More than half the library cannot be reached: the tag
feed tags prayers and nothing else, so all 153 Hidden Words, 166 Gleanings and 184 Prayers and
Meditations have no category to be found under, and the axis that would reach them is `[v1.0]`
(D4.1). And three characters the app draws itself — the dot between an author and a work, the
copyright sign, and the fleuron — had no glyph in the subset font and would have been drawn by the
phone's default face on every screen (D4.7).

**Next session should read first.** `/CLAUDE.md` in full. Scope sections 8.1, 8.4, 9.7, 11.5, and 10
(the `passage_segments` and `user_prayers` entries). `/docs/design-tokens.md` sections 5.3, 5.5 and
7. Decisions D4.2 (the door Discover adds through, which session 5 puts a screen in front of) and
D4.3 (why adding is one way). In the repo, `src/features/discover/ReadingScreen.tsx` for where the
add happens now, `src/data/passages.ts` for `addPassageToList`, and `src/data/corpus.ts` for
`putPassageSegments`, which nothing has written to yet.
