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

## Session 5 — Segmentation: suggested then confirmed, at add time

**Version:** v0.5.0   **Branch:** session-05-segmentation   **Date:** 7 Sept 2026
**Follow-up:** v0.5.1, branch `session-05-followup`, same day

**Shipped.** The moment of commitment. Tapping the list mark on a prayer no longer adds it on the
spot: it opens a screen showing the prayer broken into the lines you would learn it in, with the
number of lines and the number of words stated plainly above them and no guess at how long it will
take. Join puts two lines together, a cut mark in the line splits one in two, and ADD TO MY LIST at
the foot writes the lines, the count and the row in one go. Come back to the prayer and the navy band says "Added to your
list" with Undo, which now takes the lines away too. The splitter is a pure function tested against
all 975 committed passages, including the one that proves nothing is lost: every passage taken apart
and put back together must be itself again, character for character. 44 new tests.

**Four changes after your first read (v0.5.1).** Cutting a line is now a small gold mark drawn in the
line itself, at every place it can be cut, and you tap the one you want; the SPLIT button that
decided for you is gone (D5.8). The Epistle to the Son of the Wolf, a 46,000 word book sitting in
the prayers feed, is out of the corpus, so the library is 975 passages and 472 prayers (D5.7). Doing
that turned up something worse: a passage withdrawn from the dataset stayed for ever on any device
that had already opened the app, so the load now notices a corrected corpus and removes what it
withdrew (D5.9). And the word for a line stays "line", confirmed. 5 new tests.

**Deferred.** Normalisation (scope 9.7). Nothing built this session compares two pieces of text, so
there was nothing for it to be right or wrong for. It belongs to session 8, with the chips. See D5.5.

**Surprises.** Three, all in `decisions.md`. Breaking only at sentences leaves the Gleanings with
lines fifty words long and no way to cut them, so the app now also finds colons, semicolons and
commas, offers a cut mark at each of them, and never proposes them (D5.2). And the confirm screen had
to be decided into the Memorise half of the app rather than Discover, because a screen of lines a quiz will
ask for is memorisation, and principle 7.6 keeps that out of the prayer book (D5.1). And a test that
had been failing about one run in five since session 4 was chased rather than re-run: it turned out to
be two real races in the bookmark mark, one that could silently undo a tap and one that could leave a
bookmark the screen said was gone. Both fixed (D5.6).

**Next session should read first.** `/CLAUDE.md` in full. Scope sections 8.2, 8.3, 8.5, 8.6, 7.3,
11.1 and 10 (the `user_prayers` and `segment_progress` entries). `/docs/design-tokens.md` sections
5.3, 5.5 and 4. Decisions D1.1 and D1.2 (how upkeep multiplies an interval, and why a resting passage
still has a due date), D5.4 (a passage on the list always has its lines under it) and D5.1 (what the
Memorise tab holds today). In the repo, `src/scheduler/` for the SM-2 module that has been waiting
since session 1, `src/data/segmentProgress.ts` and `src/data/progressMapping.ts` for the two shapes
of the same numbers, `src/data/segmentation.ts` for what a confirmed passage looks like in the
database, and `src/config/defaults.ts` for the caps the queue is meant to read.

## Session 6 — The daily queue: caps, silent overflow, upkeep and focus

**Version:** v0.6.0   **Branch:** session-06-queue   **Date:** 7 Sept 2026

**Shipped.** The engine finally runs. Open Memorise and you get today's work: the prayers today
touches, one row each with the author and how many of their lines are in the day, capped at fifteen
lines and two new ones. Miss a fortnight and you still get fifteen, and the app never says how many
it left, because it never worked the number out. Underneath, everything you have taken on, with
ACTIVE, OCCASIONAL, RESTING or FOCUS beside each and a screen behind it to change that. Focus
suppresses the whole rest of the list, states on Memorise what is paused and when it lifts, runs
seven days by default and releases itself, telling you. The two caps are in Settings. Tapping a row
in today's work does nothing: the quiz ladder is sessions 8 and 9. 106 new tests, including
principle 7.3 checked against the rendered screen: with forty lines overdue, the only number
anywhere on it is fifteen.

**Deferred.** Nothing from this session's list.

**Surprises.** One decision the brief asked for and two the build forced. Where upkeep is turned on
had to be decided (item 6): a mark on a queue row is the obvious answer and it is wrong, because a
resting passage is never in the queue, so the door would shut behind the first passage you put to
rest. It is a roll call on Memorise instead (D6.3). Filling the cap in list order starves the list,
so the cap is filled by urgency across everything and only then arranged by list (D6.2). And the
overflow count is not hidden but never computed, because every other app of this kind shows it and
a number that exists will eventually be rendered (D6.1).

**Next session should read first.** `/CLAUDE.md` in full. Scope sections 6.5, 6.7, 6.2, 11.5 and 10
(the `bookmarks` and `user_prayers` entries). `/docs/design-tokens.md` sections 5.1, 5.3 and 6.
Decisions D4.13 (`sort_order` written from the first bookmark and read by nothing), D5.4 (undo takes
the lines away with the row), D6.3 (the upkeep roll call now on Memorise, which the list screen may
absorb) and D4.10 (the undo band). In the repo, `src/data/bookmarks.ts` and `src/data/userPrayers.ts`
for `reorderList`, which is written and called by nothing; `src/data/upkeep.ts` for
`listPassagesOnList`; `src/features/memorise/MemoriseScreen.tsx` for the roll call the list screen
has to decide about; and `src/components/ListSurface.tsx` for the row pattern both screens use.

## Session 7 — Bookmarks and My list, the two ordered screens

**Version:** v0.7.0   **Branch:** session-07-lists   **Date:** 7 September 2026

**Shipped.** The two lists, built as one interaction because scope 6.7 says they are one. Bookmarks
is a tab now: everything you have kept a place in, sortable four ways and filterable by collection
and by author, with the filter rows appearing only once your bookmarks actually span more than one
value. My list is behind a row on Memorise, in the order you arranged, with the author and the
upkeep word on every row and a Remove whose Undo really does put the lines and the progress back.
Both drag by hand, in one shared component, with the arrow keys as the way to do it without touch.
Dragging is possible only in the hand order, so no sort can destroy an arrangement. 50 new tests.

**The tab bar changed, on your instruction.** DEVOTIONS, BOOKMARKS, MEMORISE: the prayer book on the
left, the work on the right. Log is folded into Memorise entirely and Settings is a row there now.
Recents is the fourth tab when it arrives at v1.0; it needs a table V0 does not have. D7.1.

**Deferred.** Nothing from this session's list. Recents was asked for and could not be built.

**Surprises.** Two. The upkeep roll call session 6 left on Memorise showed the state and no author,
which was a surface naming a passage without saying who wrote it; My list absorbed it and fixed that
on the way through (D7.3, principle 7.10). And the sort and filter controls came out a quarter of a
phone tall on first draft, so the chip was tightened after measuring it in a real browser rather
than guessing (D7.4).

**Next session should read first.** `/CLAUDE.md` in full. Scope sections 9.1, 9.2, 9.3, 9.4, 9.6,
9.7, 8.1, 7.1, 7.2 and 10 (the `segment_progress` and `review_log` entries). `/docs/design-tokens.md`
sections 5.4, 5.5 and 6. Decisions D5.5 (why normalisation waited for this session), D2.11 (the
weakest line sets the pace), D1.4 (the SM-2 numbers) and D7.5 (the drag component, which level 4
reuses). In the repo, `src/scheduler/index.ts` for `reviewSegment`, which is written and called by
nothing; `src/data/segmentProgress.ts` and `src/data/reviewLog.ts` for the two writes a review makes;
`src/data/dailyQueue.ts` for what today's queue hands a quiz; `src/text/segmentation.ts` for the text
pipeline normalisation belongs beside; and `src/components/Reorderable.tsx` for the drag.

## Session 7 follow-up — Four answers, and a touch target that was too small

**Version:** v0.7.1   **Branch:** session-07-followup   **Date:** 8 September 2026

**Shipped.** Safa's answers to the four open questions, built. **The scope is now v4.4**: section 3.1
is four tabs in two halves rather than three tabs in a list, Log is no longer a tab and section 11
renders onto Memorise, Recents and Bookmarks are named as separate tabs that do not merge, and
principle 7.6 says "Memorise only" where it used to say "Memorise and Log". Four rows added to the
scope's own decision log, 18.32 to 18.35. `CLAUDE.md` updated where it quotes 7.6, because a
quotation that drifts from its source is worse than none. "Devotions" confirmed as the first tab's
word.

**The chip fix, which was the interesting one.** Safa's question was the right one and the original
reasoning had the trade backwards. The chip you tap and the chip you see are now separate boxes: the
button is 44px tall, the bordered box inside it stays 24px, and the extra height is real and simply
has no ink in it. The height was paid for by moving the label out of a fixed 62px column into the
same wrapping flow as the chips, which takes a wrapped line off two of the three rows. Measured at
390px: 204px of controls with small targets before, 190px with proper ones after. Shorter screen,
targets nearly twice as tall. D7.8.

**Surprise.** Seeding a browser by hand put two bookmark rows on one passage and React complained
about two children with one key. Nothing in the app can create that row, but v1.0 sync merging two
devices could, and a screen with two rows for one prayer has two rows with one identity, so the row
you dragged would not be the one that moved. The read is now one row per passage whatever the table
holds. 1 new test. D7.9.

**Next session should read first.** Unchanged from session 7's entry above, plus scope 3.1, which is
new and describes a tab bar no earlier session saw.

## Session 8 — The chip quiz: levels 2, 3 and 4

**Version:** v0.8.0   **Branch:** session-08-chip-quiz   **Date:** 8 September 2026

**Shipped.** A row in today's queue does something. Tap a prayer and you work through its lines one
at a time; finish it and you are back on Memorise with that row gone, and when the last row goes the
screen says you are up to date. Each line arrives at whichever rung it has climbed to: read it, then
a couple of words missing, then nearly half of it missing, then the lines to put back in order. Tap
a chip and the word takes its place; tap the wrong one and the right word appears anyway with a thin
gold rule under it and the app says nothing about it. Then Again, Hard, Good or Easy, which is the
only thing SM-2 is ever told. That rating calls `reviewSegment`, which had been written and called by
nothing since session 1, writes `segment_progress`, appends to `review_log`, and the queue is
genuinely smaller tomorrow. Normalisation is built, for chip matching now and search at v1.0.
102 new tests, including the component test CLAUDE.md section 11 asks for.

**Two things you decided.** The row is the door rather than a button that begins the whole day, so
the shrinking list is the only progress the app shows (D8.1). And a line climbs one rung per correct
review, so forgetting one puts it back to simply reading it (D8.2).

**Deferred.** Nothing from this session's list. Level 1 was built although the brief named three
levels: a new line has to be met somehow, and it is a line, a rating and no interaction at all.

**Surprises.** Three, all found by running the thing rather than by reading it. The corpus settled
how normalisation treats a hyphen and an apostrophe, which are opposite: 2,266 hyphens inside a word
against 432 apostrophes, also inside words, so one becomes a space and the other vanishes. Reusing
session 7's drag needed exactly one change and it was not about dragging - two live regions on one
screen give a screen reader two queues (D8.3). And tapping two chips inside one frame in a real
browser lost the first answer, which a thumb can do; it is fixed and the test was checked against the
old code to be sure it would have caught it.

**Next session should read first.** `/CLAUDE.md` in full. Scope sections 9.1, 9.4, 9.5, 8.7, 8.1,
11.1 and 10 (the `user_prayers` and `review_log` entries). `/docs/design-tokens.md` sections 5.4, 5.5
and 3. Decisions D8.2 (the ladder, which session 9 raises the ceiling of), D8.4 (what a reveal looks
like and why nothing is scored), D1.3 and D2.11 (the weakest line sets the pace, which is what a
promoted passage is scheduled on) and D1.5. In the repo, `src/quiz/level.ts` for
`HIGHEST_LEVEL_BUILT`, which is the one line that lets levels 5 and 6 be served;
`src/features/memorise/ReviewScreen.tsx` for the walk and the reveal-then-rate shape;
`src/data/review.ts` for the write; `src/scheduler/passage.ts` for `promoteToPassage` and
`reviewPassage`, both written and called by nothing since session 1; and `src/data/dailyQueue.ts` for
`getPassageWork`.

## Session 9 — Recite and reveal, and the milestone

**Version:** v0.9.0   **Branch:** session-09-recite-and-milestone   **Date:** 8 September 2026

**Shipped.** The ladder is finished. Above the ordering rung a line arrives with only the first
letter of each word standing, and above that with nothing at all, and both ask for the run of lines
leading up to it rather than the one line. You recite, then show one line at a time and check
yourself as you go, then rate yourself. `HIGHEST_LEVEL_BUILT` went from 4 to 6, which was one number
and nobody's stored progress needed touching, which is exactly what session 8 built it for.

And the milestone. Once the app has shown you every line of a prayer, a section appears on Memorise
offering the whole of it; tap it and the screen turns navy, the only one in the app that does, with
the first five words showing and the rest hidden. Reveal it all in one movement, rate yourself, and
the prayer is promoted: `promoteToPassage`, written in session 1 and called by nothing since, fills
the four columns and `milestone_reached_at`, and from then on the prayer comes round as one whole
thing rather than as its lines. Rate it *Again* and it goes back to its lines with nothing lost.
67 new tests.

**Three things you decided.** Where the door is (D9.1), what "significant" means inside a visual
language with no shadows and no animation (D9.2), and that the log gets somewhere to put a recital
(D9.3).

**Deferred.** Nothing from this session's list.

**One thing needs your pen.** Scope section 10's `review_log` line is now short by two words:
`passage_id`, and `milestone` among the quiz types. Nothing in the stored database changed and no
migration runs, but the scope should say what the table holds. D9.3.

**Surprises.** The queue had to learn about promotion, which was not on the list and turned out to be
required rather than optional: without it a promoted prayer would have offered the whole of itself
*and* every one of its lines, which reads as a scheduling bug rather than a missing rule. And the
`review_log` gap was found by reading the columns rather than the prose - scope 11.3 promises every
self-rating is stored and the columns could not hold one.

**Next session should read first.** `/CLAUDE.md` in full. Scope sections 11 (all of it), 3.1, 8.2,
8.5, 8.7 and 10 (`user_stats`, `review_log`, `segment_progress` and `user_prayers`).
`/docs/design-tokens.md` sections 4 (the freshness star, which nothing renders yet), 5.3, 5.7 and 2.2.
Decisions D7.1 (why Log is not a tab and section 11 lands on Memorise), D9.3 (what the log now holds,
which the streak is derived from), D9.1 and D9.5 (the milestone, and what a demotion keeps), and D1.5
(what a lapse does, which freshness has to describe). In the repo, `src/data/reviewLog.ts` for the
history the streak is built from; `src/data/milestone.ts` for `milestone_reached_at` and the four
whole-passage columns; `src/features/memorise/MemoriseScreen.tsx`, which is the screen everything in
section 11 is added to; `src/theme/ornaments.ts` for where a drawn mark lives; and `src/config/` for
the tuneable constants a streak rule belongs in.
