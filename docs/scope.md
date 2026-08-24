# By Heart
## Bahá'í Prayer and Memorisation App
### Scope Document v4.1

**Status:** Agreed, ready to build
**Date:** 23 August 2026
**Owner:** Safa
**Supersedes:** v4.0 (23 August 2026)
**Repo path:** `/docs/scope.md`
**Spelling:** Australian English throughout

---

## Why 4.1

v4.1 is v4.0 with release tags applied inline, plus four decisions taken during the CLAUDE.md
planning session. No requirement has changed and no scope has moved.

**What changed:**

1. **Release tags throughout.** Every passage describing content outside the current release now
   carries `**[v1.0]**`, `**[v1.1]**`, `**[v2]**` or `**[v3.0]**`. This exists because sections
   like 6 mix V0 and v1.0 content, and a build session reading section 6 to build Discover would
   otherwise read three features it must not build.
2. **Section 12.3 updated.** Visual direction is no longer open. It points to
   `/docs/design-tokens.md`.
3. **`display_title` added to `passages`** (section 10), so authored line breaks in titles survive
   the reading view layout.
4. **Decisions 18.20 to 18.23 added.**

Everything else is v4.0 verbatim.

### Tag legend

| Tag | Meaning |
|---|---|
| *untagged* | In V0. Build it. |
| `**[v1.0]**` | Soft launch. Read for context, do not build. |
| `**[v1.1]**` | Read for context, do not build. |
| `**[v2]**` | Native. Read for context, do not build. |
| `**[v3.0]**` | Devotional layer. Read for context, do not build. |

---

## Why 4.0

v3.0 was written on the assumption that this is a memorisation tool that happens to display text. A
structured review of that document changed three foundations:

1. **It is a full prayer app.** v3.0 repeatedly warned against building a prayer book and treated
   reading as a supporting concession. That is reversed. The reading experience is a first-class
   half of the product.
2. **The requirements list was a v1.0, not an MVP.** Thirty P0 items sat in front of the one
   component that carries all the risk. The scope is now split into V0 (private validation) and
   v1.0 (soft launch), and the scheduler moves to session one.
3. **The learning loop had an unexamined interaction that would have sunk it.** Cumulative recall
   combined with typed grading meant users typing hundreds of words of 19th century English with
   diacritics on a phone. Typed input is removed. Assisted production via tappable word chips
   replaces it.

Smaller changes: books removed from the corpus, `prayers` renamed to `passages`, auth made optional,
builder-facing metrics deleted on privacy grounds, and a new principle separating devotional
surfaces from memorisation chrome.

Every decision in this document is logged with its rationale in section 18.

---

## 1. Problem Statement

Memorising Bahá'í prayers and writings is a devotional practice that most people attempt without any
system. They learn a passage, feel confident, and lose it within weeks because nothing prompts them
to revisit it. There is no record of what they once knew, so the effort quietly evaporates.

Existing tools stop at word omission and a checklist. None of them schedule review, track decay, or
tell you what to revisit today.

**The core insight:** this is a spaced repetition product wrapped in a prayer book that is good
enough to use every day. The scheduler is the hard half. The reading experience is what makes the
scheduler's work survive, because a tool you only open to be quizzed is a tool you stop opening.

---

## 2. Competitive Landscape

| App | What it does | Relationship |
|---|---|---|
| Bahá'í Prayers & Writings (Sand Apps, bahaiprayers.net) | Thousands of prayers and writings, 116 languages, bilingual view, bookmarks, prayer lists, sunrise and sunset times. Publishes the free API this project uses. | Best-in-class reader. No memorisation. Data source. |
| Prayer Book (Arash Payan) | Ten languages, alphabetical category browse with counts, word count on every row, search, bookmarks, recents. Open source under GPLv3. | Navigation and information architecture benchmark. Code is off limits under GPLv3. |
| Intone – The Bahá'í Writings | 52 Tablets and Books, 3500+ passages, contextual browsing, references. | Strong reader. Owns the name "Intone". |
| Bahá'í Prayers (iOS) | Prayer book plus qiblih compass, Hidden Words, translation updates. | Devotional utilities. |
| iMemorize | 5,000+ quotations, tap-a-word omission, add your own, track memorised. Recommended in Ruhi study circle materials. Reported broken on iOS 11 and effectively abandoned. | **The direct competitor. Wounded incumbent.** |
| Power of the Word | Elegant quote reader, no account, local storage. | Tone benchmark. |
| Bible Memory App | Millions of verses memorised, personalised review scheduling, sync, offline, speech recognition. | Different scripture, same model. **Proof the concept works at scale.** |

### 2.1 The thesis

**Every prayer app is a reader. Every memorisation tool is content-poor. Nobody has both.**

Sand Apps has 116 languages and no scheduler. Prayer Book has excellent navigation and no scheduler.
iMemorize had a scheduler-shaped ambition, no library worth reading, and has been abandoned while
its users publicly ask for a replacement.

The differentiator is not the prayer book, which several apps do well, and it is not the SRS engine
in isolation. It is that one app is genuinely good at both, so the app you open to pray is the same
app that knows what you are learning and when you last recalled it.

**Sequencing consequence:** build the memorisation engine first, because it is the hard and
differentiated half. The reading half is comparatively cheap once the corpus is a local copy.

**Honest cost of this position:** it means competing with mature, well-made apps on their home
ground. The reading experience has to be good, not adequate. If it is merely tolerable, the thesis
fails and the app becomes a memorisation tool with a bad reader attached.

---

## 3. Product Definition

**By Heart is a Bahá'í prayer book with a spaced repetition memorisation engine built into it.**

Both halves are first class. Reading is not a concession to memorisation and memorisation is not a
bolt-on to reading.

### 3.1 Three tabs

| Tab | Purpose |
|---|---|
| **Discover** | The library. Browse, read, search, bookmark, recents. Devotional surface. |
| **Memorise** | Today's queue, the learning flow, focus mode. |
| **Log** | What you know, freshness, streak, passage detail. |

### 3.2 The Ruhi wedge

Ruhi books contain defined "Quotations to Memorize" sections. Participants are told to memorise
specific passages. The recommended tool for this has been abandoned.

This is a curriculum with a fixed list, a recurring cohort, and a stated obligation. It requires no
social features, because the curriculum is the content and the group is irrelevant.

**Ruhi collections ship in v1.0.** They are not in V0, because V0 exists to validate the scheduler
and Ruhi mapping is slow manual curation that would gate it.

### 3.3 Name

**By Heart**, pencilled. Signals memorisation rather than reading, understandable to a non-Bahá'í in
one beat, claims no devotional authority the app has not earned. Cheap to change until a domain is
purchased or an app store listing is created. Do neither until the name is final.

---

## 4. Content

### 4.1 Source

bahaiprayers.net publishes a free JSON developer API with an explicit invitation to consume its data
feeds in third-party apps, maintained against the newest translations.

**Four feeds only.**

| Endpoint | Content |
|---|---|
| `/api/prayer/Languages` | Language IDs, required before any other call |
| `/api/prayer/tags?languageid=` | Topic tags, which become the app's categories |
| `/api/prayer/prayersystembylanguage?languageid=&html=false` | The prayers |
| `/api/prayer/HiddensByLanguage?languageid=` | The Hidden Words |
| `/api/prayer/GleaningsByLanguage?languageid=` | Gleanings |
| `/api/prayer/PMsByLanguage?languageid=` | Prayers and Meditations |

**Excluded, permanently:** Kitáb-i-Aqdas, Kitáb-i-Íqán, Tablets Revealed after the Aqdas, Some
Answered Questions, Days of Remembrance, Ridván messages. These are continuous prose works, not
passage-shaped content, and there is no defensible rule for chunking a 300 page book into memorisable
units. This is not a full reference library and does not attempt to be. Where a user wants those
works, the credits screen points to the Bahá'í Reference Library.

**Not used:** the AI search endpoint. Search is local. See 6.3.

### 4.2 The corpus is a committed dataset, not a runtime dependency

A fetch script pulls each feed once, normalises it, and writes a versioned JSON dataset. **That
dataset is committed to the repository.**

This is the durability answer. The corpus then survives the API disappearing, the Supabase project
lapsing, and the loss of any single machine. Anyone with the repository can rebuild the database
from scratch.

- The app loads the corpus into IndexedDB on first run. No runtime API calls, ever.
- Source IDs are stored so re-fetching is idempotent and translation updates flow through without
  duplicating.
- **[v1.0]** A scheduled ingestion job, idempotent upsert, and run logging. In V0 the fetch is a
  manual script run once.

**Corpus file layout.** Split by feed, one JSON file per feed, plus a `manifest.json` recording
fetch date, record count and a content hash per feed. A single combined file would be several
megabytes and produce unreadable diffs on every re-fetch.

**Building an independent corpus is explicitly not on the roadmap.** It would not remove Bahá'í
International Community copyright, which is the constraint that makes the app free. It would only
remove an attribution obligation to bahaiprayers.net, and it would create a permanent content
operation. The committed dataset delivers the durability benefit at a fraction of the cost. If the
feed ever dies, corrections and new translations can be patched into the committed file by hand.

### 4.3 Attribution

Three obligations:

1. **Per-text attribution.** Author, translator where relevant, and source work, visible in the
   reading view and the learning screen.
2. **Copyright notice.** "Copyright © Bahá'í International Community" present with the content.
3. **[v1.0]** **Credits screen.** Names bahaiprayers.net as the data source with a link, names the
   Bahá'í Reference Library, states the Ruhi edition the mapping is built against, and reproduces
   the full notice.

**Action:** write to the bahaiprayers.net maintainer before public launch. Courtesy, and possibly
more.

### 4.4 Personal library

**[v1.0]** Users may add their own text. Private to that user, never shareable, never moderated
because it never leaves their account. Segmentation applies identically.

---

## 5. Ruhi Collections

**[v1.0]** — this entire section.

### 5.1 The mapping is the proprietary asset

The API supplies the passages. It does not know that a given passage from Gleanings is the Book 1,
Unit 2, Section 3 quotation. That mapping is manual curation and it is the one piece of content in
this product that no competitor has and no API will provide.

**Boundary:** the app maps to Ruhi references and links passages to units and sections. It does not
reproduce Ruhi book content, exercises or commentary, which are the Institute's own materials.

**Permission status:** no block. Decision logged, owner Safa, 23 August 2026. See 18.4.

### 5.2 Version the mapping against a stated edition

Ruhi books get revised and units get resequenced. When that happens, an unversioned mapping goes
stale silently while the app keeps confidently displaying "Book 1, Unit 2, Section 3."

The mapping dataset carries the Ruhi edition it was built against, that edition appears on the
credits screen, and the dataset is versioned independently of the app.

### 5.3 Structure

```
ruhi_books        id, number, title, edition
ruhi_units        id, book_id, number, title
ruhi_sections     id, unit_id, number, title
ruhi_quotations   id, section_id, passage_id, order_index
```

### 5.4 Behaviour

- Discover surfaces Ruhi books as a browse axis.
- Drill from book to unit to section to quotations.
- Every quotation shows its source work and its Ruhi reference together.
- Add a single quotation, a whole section, or a whole book to the list in one action.
- **Progress per Ruhi book.** "4 of 7 quotations from Book 1 committed to memory." A natural
  completion unit, not a leaderboard. Lives in Log, never in Discover.

**Scope:** Books 1 to 3 in v1.0. Start the curation early; it is the slowest non-code item in the
project.

---

## 6. Discovery: The Library

### 6.1 Navigation

Three browse axes, all reachable from the Discover tab. Category is the default.

| Axis | Behaviour | Release |
|---|---|---|
| **By category** | Alphabetical list of topic tags from the API tag feed, each with a passage count. Drill in to a passage list. | **V0** |
| **By collection** | Prayers, Hidden Words, Gleanings, Prayers and Meditations, Ruhi, My own. | **[v1.0]** |
| **By author** | Bahá'u'lláh, the Báb, 'Abdu'l-Bahá. | **[v1.0]** |

Plus **Bookmarks** (V0), and **[v1.0]** **Recents** and **Search** as saved surfaces.

**Passage rows show:** title or opening phrase, author, and **word count**. Word count is precise,
honest, and free at ingestion. It is not a band and not a judgement.

**V0 ships category browse only.** Rationale: V0 exists to validate the scheduler, and category
browse is the single axis that makes the library usable for the devotional case. Decision logged
23 August 2026, owner Claude, per standing instruction to default and log rather than block.

### 6.2 Length

Length bands (Short 1 to 3 segments, Medium 4 to 8, Long 9 to 20, Extended 20+) are still computed
at ingestion. They no longer lead anywhere.

- **On rows:** word count, always.
- **[v1.0]** **As a filter:** an optional chip, for users who want it.
- **At the add moment:** segment count and word count, stated plainly.

**No estimated time to learn.** Pace-based estimates are invented precision, and the moment of
commitment is the worst possible place to invent it.

*This deletes v3.0's principle 7.7 ("length before topic"). That principle was correct for a pure
memorisation tool and wrong for a prayer app. When you open the app at 6am to pray, length is not
what you browse by.*

### 6.3 Search

**[v1.0]** — this entire subsection.

Full-text search across the whole corpus, local and offline.

- A client-side index over the local copy. No API calls.
- Postgres full-text search with a `tsvector` column and GIN index once sync exists.
- **First lines weighted heavily.** People remember a prayer by how it opens, and search must reward
  that.
- Diacritic-insensitive and punctuation-insensitive via the shared normalisation pipeline.
- **Search within what I know** as a separate mode. "Which of my memorised prayers mentions
  steadfastness" is a real devotional need and nothing else does it.

### 6.4 Recents

**[v1.0]** — this entire subsection.

Every passage opened in the reading view is recorded. The Recents list is chronological, with **the
ability to clear the whole list or delete individual entries**.

Recents is the single most useful navigation aid for the devotional case: you read something at a
gathering and want to find it again on Tuesday.

Stored in a dedicated `reading_history` table rather than on `user_prayers`, so it works for any
passage read and can be cleared independently of memorisation state.

### 6.5 The list

The ordered list of what the user intends to memorise. Feeds the queue when current material is
finished.

- Addable from anywhere: reading view, search results, category lists, Ruhi sections.
- Reorderable.
- **[v1.0]** Bulk add from a Ruhi section or book.
- Removable at any time, permanently, with no penalty or friction.
- **Internal term: `list`. V0 UI label: "My list".** Final vocabulary deferred; see 11.3.

### 6.6 Reading view

Any passage in full, typographically well set, adjustable text size, attribution and copyright
notice present, no quiz furniture whatsoever.

**This is a devotional surface.** See principle 7.6.

Two distinct actions in the toolbar:

| Action | Intent |
|---|---|
| **Bookmark** | "Find this again on Sunday." Devotional. |
| **Add to my list** | "I intend to learn this." A commitment. |

Different icons, both one tap, neither nested in a menu. They are different intents and conflating
them makes both worse.

---

## 7. Design Principles

All principles apply from V0 unless tagged otherwise.

**7.1 Reverence over arcade.** No buzzers, no failure sounds, no countdown timers, no streak-loss
shaming. Correct and incorrect shown calmly.

**7.2 Display strictly, judge gently.** The correct text is always shown after an attempt, with
deviations highlighted. Nothing is scored. The user rates themselves.

**7.3 The daily queue is capped, always.** The single most important requirement in this document.
Users who skip four days must not return to a backlog. Overdue items roll forward silently and no
discouraging count is ever displayed.

**7.4 Metaphor in language, restraint in mechanics.** Vocabulary may draw on the imagery of the
writings. Mechanics stay simple: streak, progress, completion. No XP, levels, points or badges.

**7.5 Do not quote the writings as reward chrome.** Encouragement text is original phrasing, never
sacred text used as a congratulation message.

**7.6 Memorisation chrome never appears in Discover.** No due counts, no focus banner, no streak, no
freshness state, no progress indicator anywhere in the library, the category lists, the search
results or the reading view. All of it lives in Memorise and Log only.

*This is the principle that protects the devotional case. Opening the app at a gathering and being
met with "3 due today" turns worship into a chore reminder. Specific consequences: no numeric badge
on the Memorise tab (a small dot, or nothing); a passage already on your list shows nothing in the
reading view except that the add button reads as already added; the focus banner lives on Memorise
only.*

**7.7 Both halves must be good.** The reading experience competes with mature apps on their home
ground. Adequate is failure.

**7.8 No social layer.** No leaderboards, friends, sharing, groups or comparison. Load-bearing: it
removes moderation, reporting, blocking and most privacy complexity permanently.

**7.9 Accessibility.** Adjustable text size with a genuinely large maximum ships in **V0**.
**[v1.0]** The full pass: high contrast, screen reader labelling, generous touch targets audited
throughout.

**7.10 Every text is attributed, always.** Licence condition and correct devotional practice.

**7.11 Every user-facing string lives in one module.** From the first commit. This is what makes
deferring vocabulary decisions safe: a future tone pass is one file, not a hunt through forty
components.

---

## 8. The Learning Engine

### 8.1 Method: cumulative line building

Learn segment 1. Then segment 2. Then 1 and 2 together. Then 3. Then 1 to 3. Continue until the
whole passage is recited unaided.

### 8.2 Scheduling: SM-2, presented as a daily queue

The user sees today's queue. Underneath, SM-2 decides what is due.

**Implementation requirement:** the scheduler is a single isolated module with unit tests and no UI
dependencies, swappable for FSRS without touching anything else. Per-segment state: ease factor,
interval, repetitions, due date, lapses.

**It is built first.** See section 16.

### 8.3 Queue composition and caps

- Default 15 reviews and 2 new segments per day, user-adjustable.
- Overdue above the cap rolls forward silently.
- New and due material mixed, not separated into modes.
- When the queue is done, it is done. No "study more" prompt.

### 8.4 Segmentation: suggested then confirmed, at add time

**The library ships unsegmented.** Segmentation runs at the moment a user adds a passage to their
list, not at ingestion.

This is cheaper and better. Auto-splitting two thousand passages would produce two thousand sets of
bad breaks in devotional language, at ingestion, invisibly. Running it on demand means the user is
present to fix it.

The app proposes splits on sentence and line boundaries. The user can merge or split before
starting.

### 8.5 Upkeep control

| State | Behaviour |
|---|---|
| Active | Normal intervals. Default. |
| Occasional | Intervals multiplied by 3. |
| Resting | Never queued. Remains in the log. |

A resting passage shows as deliberately at rest and never decays into "needs review". The app does
not guilt users for choices it offered them.

### 8.6 Focus mode

Sometimes you need to drive hard at one or two passages, typically because you have a Ruhi gathering
next week.

- **One boolean plus one date** on `user_prayers`: `is_focus`, `focus_until`. No named lists, no
  filing system.
- When focus is active, **all non-focused material is suppressed**, both new and due.
- **Focus has an end date, defaulting to 7 days, user-settable.** On expiry it releases
  automatically and tells the user.
- While active, a persistent line on the Memorise tab states what is paused and when focus lifts.
  Never on Discover (7.6).

**Why the expiry is not optional.** A week of suppression is harmless: SM-2 surfaces overdue items
on return, and the cap absorbs the catch-up invisibly over a few days. The failure case is the
person who turns focus on for a meeting, the meeting is postponed, and four months later they open
the app to a log full of dormant passages. The expiry converts "about a week" from a hope into a
mechanism.

**[v2]** Focus goal notifications, gated on native packaging.

### 8.7 Two layers of progress

**Segment mastery** from SRS state. **Whole-passage milestone** as a separate deliberate event.

**On reaching the milestone, the passage is promoted to a single whole-passage card**, scheduled on
the slowest of its segments' intervals. Segment state is retained but not surfaced. A self-rating of
*Again* on the whole-passage card demotes it back to segment review.

This makes the milestone mechanically real rather than a label change, and it is the only
arrangement in which the freshness states in section 11 mean anything.

---

## 9. Quiz Ladder

### 9.1 The ladder

| Level | Type | Input |
|---|---|---|
| 1 | Read and reveal | None |
| 2 | Light chip cloze, ~15% blanked | Tap |
| 3 | Heavy chip cloze, ~40% blanked | Tap |
| 4 | Order the segments | Tap or drag |
| 5 | First letters as scaffold | Recite, reveal, self-rate |
| 6 | Free recall | Recite, reveal, self-rate |
| Milestone | Whole passage, first line visible | Recite, reveal, self-rate |

Quiz type is selected by mastery level, not at random.

### 9.2 No typed input

**Removed entirely from V0.** **[v1.1]** Typed cloze returns as an opt-in setting for users who
prefer it.

*Rationale, because this reverses v3.0 and the reasoning must survive.* v3.0 specified cumulative
line building plus word-level edit distance grading. Combined, that means by segment eight the user
types eight segments of 19th century English, with diacritics, on a phone, every review. Nobody does
that twice. It was the largest UX risk in the product and it was unnamed.

### 9.3 Chips, and why they are not multiple choice

Levels 2 to 4 present blanked words as a tappable word bank. Distractors come free from other words
in the same passage.

v3.0 stated that multiple choice should appear only at the sequencing levels, guarding against
recognition being mistaken for recall. That guard is right in principle and wrong here. The old
ladder jumped from level 1 (entirely passive) to typed production, a cliff that landed exactly where
a learner was least able to clear it. Chip cloze into a passage you are actively reconstructing is
assisted production, not multiple choice, and it inserts the missing recognition rung.

Chips also remove the keyboard from the hardest part of the flow and sidestep diacritics entirely,
which makes the whole ladder more accessible.

### 9.4 Reveal behaviour

| Screen | Reveal |
|---|---|
| Levels 2 to 4 | Immediate, per answer, with the correct word highlighted |
| Level 5 and 6 | **Progressive**, segment by segment, so you can check yourself as you go |
| Milestone | **All at once**, after the whole passage has been recited |

The milestone reveals in one movement because it is a single honest moment and a staged reveal turns
it into an exam.

### 9.5 The milestone screen

First five words or so visible, so you know which passage you are reciting. Everything else hidden.
Recite from memory. Reveal. Self-rate.

Levels 6 and the milestone are **one component with two configurations**, differing only in scope
(segment group versus whole passage) and trigger (served by the queue versus deliberately
attempted).

The milestone is the emotional centre of the product and is the one place where the visual treatment
is allowed to be significant.

### 9.6 Self-rating

*Again, Hard, Good, Easy*, chosen after the reveal. This is the only input to SM-2. Nothing is
auto-scored.

### 9.7 Normalisation

Lowercase, punctuation stripped, whitespace collapsed, diacritics folded. Retained because search
requires it (6.3) and chip matching uses it.

**Deleted from v3.0:** word-level edit distance tolerance rules, and `auto_score` on `review_log`.
With no typed input there is nothing to grade.

### 9.8 Remembrance mode

**[v1.1]** A mastered passage shown simply to read, not tested. Counts towards the streak.
Reinforcement without examination.

---

## 10. Data Model

Tables and columns are used exactly as named here, from the first migration, including in the V0
Dexie schema. This is what makes v1.0 sync additive rather than a rewrite.

```
users                  Supabase auth. Optional. See section 13.        [v1.0]

passages               id, source_id, source_feed, title, display_title,
                       first_line, author, translator, text_type, source_work,
                       collection, language, word_count, length_band,
                       segment_count, visibility (global | private),
                       created_by, search_vector

passage_segments       id, passage_id, order_index, text

tags                   id, name, source_tag_id
passage_tags           passage_id, tag_id

ruhi_books             id, number, title, edition                      [v1.0]
ruhi_units             id, book_id, number, title                      [v1.0]
ruhi_sections          id, unit_id, number, title                      [v1.0]
ruhi_quotations        id, section_id, passage_id, order_index         [v1.0]

bookmarks              id, user_id, passage_id, created_at

reading_history        id, user_id, passage_id, read_at                [v1.0]

user_prayers           id, user_id, passage_id,
                       status (list | learning | memorised),
                       upkeep_state (active | occasional | resting),
                       is_focus, focus_until,
                       list_order, started_at, milestone_reached_at,
                       passage_ease_factor, passage_interval_days,
                       passage_repetitions, passage_due_date

segment_progress       id, user_id, segment_id, ease_factor,
                       interval_days, repetitions, due_date,
                       last_reviewed_at, lapses

review_log             id, user_id, segment_id, quiz_type,
                       self_rating, created_at

user_stats             user_id, streak_current, streak_longest,
                       last_active_date, total_reviews

user_settings          user_id, daily_new_limit, daily_review_limit,
                       text_size, high_contrast, typeface, palette

ingestion_runs         id, feed, started_at, completed_at,             [v1.0]
                       records_added, records_updated, status
```

**Changes from v3.0:**

- `prayers` renamed to `passages`, `prayer_segments` to `passage_segments`, `prayer_tags` to
  `passage_tags`. The old name misleads: the table holds Gleanings, Hidden Words and user-added
  text, and it would have misled Claude Code for the entire build.
- `word_count` added.
- `reading_history` added for Recents (6.4).
- `is_focus` and `focus_until` added (8.6).
- Whole-passage scheduling fields added to `user_prayers` (8.7).
- `auto_score` removed from `review_log` (9.7).
- `user_prayers.status` value `playlist` renamed to `list`.

**Changes from v4.0:**

- `display_title` added to `passages`. Titles may carry an authored line break for the reading view
  layout; corpus titles arrive as plain strings and the break would otherwise be lost. See 18.23.
- `typeface` and `palette` added to `user_settings`. See 18.21.

`user_id` is present on every user table **from the first migration**, populated with a locally
generated anonymous ID when no account exists. See section 13.

`source_id` and `source_feed` make re-ingestion idempotent. `first_line` and `search_vector` support
search. `language` is present from day one though unused in v1.

**[v1.0]** Row-level security on every table from the first migration that touches Supabase.

---

## 11. Progress, Streak and Vocabulary

### 11.1 In scope

Daily streak. Progress per passage. **[v1.0]** Progress per Ruhi book. The log, with freshness
states.

### 11.2 Excluded

XP, levels, badges, points, leaderboards, challenges, unlockables, stat sharing, any comparison with
other users.

**Also excluded: accuracy percentages.** With no auto-grading, any percentage would be built from
the user's own self-ratings, which makes "80% correct" a self-report dressed as a measurement. It is
also a score, which 11.2 and 7.1 exclude, and 100% is unreachable by design because SM-2 works by
lengthening intervals until you fail. A user chasing 100% would over-review and would start rating
themselves generously to protect the number, corrupting the only input the scheduler has.

### 11.3 The passage detail view

The honest answer to "how well do I know this, and am I done?"

- Current freshness: Strong, Fading, Needs review, Resting
- Longest interval reached, stated plainly: "you last recalled this after 3 weeks"
- Lapse count
- Milestone date, if reached
- How many segments sit at each state

All of it falls straight out of `segment_progress`. No new instrumentation.

**Deferred, not lost:** `review_log` stores every self-rating with a timestamp from day one. If a
percentage, or a time-windowed view (all, day, week, month), is ever wanted, the raw data is already
captured. Time filtering is a WHERE clause. This decision can stay open indefinitely with zero
migration cost.

### 11.4 Streak

The streak counts days on which the day's queue was completed.

- Missing one day **pauses** the streak. It does not reset.
- Two consecutive missed days reset it.
- No grace-day accounting, no tokens, no "streak freeze" screen.
- **No notification about a streak at risk, ever.**

Simpler to build and to explain than a grace-day allowance, and forgiving in the direction the
product's principles already point.

### 11.5 Vocabulary

**V0 ships plain language.** The metaphor vocabulary proposed in v3.0 is demoted to a candidate
list.

| Mechanic | V0 language |
|---|---|
| List | My list |
| Learning | Learning |
| Memorised | Memorised |
| Freshness: strong | Strong |
| Freshness: fading | Fading |
| Freshness: lapsed | **Needs review** |
| Upkeep: resting | Resting |
| Daily queue | Today |
| Streak | Days in a row |

Two notes. "Lapsed" is deleted: it carries an unfortunate resonance in a religious context and it
judges the user, which 7.1 forbids. And the rule that makes this safe is 7.11, the strings module.

**[v1.1]** **Candidate vocabulary, to be decided after visual direction exists:** gardens and
growth, gems from a mine, light and lamps. The v3.0 garden proposal ("In cultivation", "The garden",
"In full bloom", "Needs tending", "Dormant", "Today's tending", "Days of constancy") is retained
here as one option, not a plan. It may be scrapped.

**Rationale for deferring:** vocabulary is a strings file and is the cheapest thing in the product
to change. Decide early what is expensive to change late; decide late what is cheap. It also cannot
be judged against wireframes with no visual identity, and in V0 the testers should be reacting to
the mechanic rather than the poetry.

---

## 12. Technical Architecture

### 12.1 Stack

React + Vite + TypeScript PWA, Tailwind, IndexedDB via Dexie, **[v1.0]** Supabase (auth and
Postgres) for optional sync, Vercel or Netlify free tier, **[v2]** Capacitor for the native wrap.
Built in VS Code with Claude Code.

**No Supabase in V0.** No auth, no sync, no network calls of any kind. Scope section 10 table and
column names are used exactly and `user_id` is carried on every record, so v1.0 sync is additive.
All data access goes through `src/data/`, never Dexie directly from a component, so sync is one
layer rather than forty files.

### 12.2 Local-first, genuinely

IndexedDB is the source of truth. The app works fully offline and works fully without an account.
Supabase is a sync target, not a runtime dependency.

**[v1.0]** **Sync model for v1:** last write wins per record on a client timestamp. Deliberately
simple. Do not build conflict resolution for a problem that does not exist yet.

### 12.3 Visual direction

**Settled.** See `/docs/design-tokens.md`, which owns colour, typography, spacing, iconography,
motion and construction patterns. That document is subordinate to this one: where they conflict,
this document wins.

Summary: a vintage printed book. Navy or oxblood cloth, old gold, bone paper. Art nouveau display
type over a Garamond-family body. Paper grain, ink bleed, letterpress. No rounded corners, no
gradients, no shadows.

**V0 ships:** two palettes, adjustable text size, one typeface (Italiana). The theme system is
registry-driven from session 2 so additional palettes, typefaces and whole visual worlds are
appended rather than wired in. **[v0.1]** The seven-option typeface picker.

Fonts are self-hosted and subset. They are never loaded from a CDN, because a CDN font load fails
offline and produces unstyled text.

**Structural references only, not visual ones.** Do not copy any existing app's look. Prayer Book is
GPLv3, so its code is off limits regardless.

---

## 13. Users, Accounts and Cost

### 13.1 Accounts are optional

**[v1.0]** — accounts, auth, sync, RLS and account deletion all ship at v1.0. V0 is anonymous and
local only.

**The app is fully usable with no account.** Every local record carries a `user_id` from the first
schema, populated with a locally generated anonymous ID. **This part is V0** and it is what
preserves the migration path.

Signing in claims that anonymous ID and turns on sync. Email and password plus one social provider.

**Sync state must be legible.** The app states clearly, in settings and at first run, that **signed
in means sync is on, and signed out means sync is off and your progress lives only on this device.**
No ambiguity, no dark pattern.

*Rationale:* a signup wall in front of a local-first devotional app is friction with no user
benefit, and RLS plus account deletion in session one is infrastructure in front of the risk.
Carrying `user_id` from the start preserves the migration path at near-zero cost.

### 13.2 Privacy

**[v1.0]** — this entire subsection, since none of it applies until sync exists.

Sync means signed-in users' review and progress rows sit in a Supabase project the owner controls.
That is true from the moment sync ships, regardless of intent.

1. The privacy policy states exactly what is stored and that it exists for sync and backup only.
2. **A written commitment not to query individual user data**, with one stated exception: a user
   asks for help recovering something.
3. RLS on every table, so the app's own client cannot read another user's rows. The service key can,
   so point 2 is a policy commitment rather than a technical guarantee, and it is stated as such
   rather than overclaimed.
4. No aggregation, no analytics, no event tracking, no telemetry. See section 17.
5. Account deletion removes all user data.
6. **[v1.1]** Private export of your own log. Sharing with others is never.

### 13.3 Cost

£0 for v1. Supabase Pro at roughly $25/month only past ~500MB or 50k monthly active users, which
text and progress logs will not approach. Free projects pause after about a week of inactivity,
which local-first architecture makes harmless. Apple Developer Program $99/year at v2. Audio is the
only thing that breaks the free tier, which is why it is not scheduled.

**Monetisation constraint:** commercial use of the content requires prior permission from the Bahá'í
International Community. **Free is a product constraint, not a preference**, and changing it
requires that permission first.

---

## 14. Scope by Release

### V0 — private validation

Three people including the owner. Not a launch. Its only job is to answer whether the engine works
and whether the app is pleasant to hold.

- [ ] Local-first data layer, anonymous user ID, strings module
- [ ] Theme registry: two palettes, Italiana, adjustable text size
- [ ] Three-tab shell
- [ ] Corpus fetch script, committed JSON dataset split by feed, load to IndexedDB
- [ ] Discover: alphabetical category browse with counts
- [ ] Passage list with word count and author
- [ ] Reading view with attribution and copyright notice, adjustable text size
- [ ] Bookmark, and separately Add to my list
- [ ] Suggested-then-confirmed segmentation at add time
- [ ] My list, ordered, removable
- [ ] SM-2 scheduler, isolated and unit-tested
- [ ] Daily queue with caps and silent overflow
- [ ] Upkeep states
- [ ] Focus mode with expiry
- [ ] Quiz levels 1 to 6
- [ ] Milestone screen and whole-passage promotion
- [ ] Self-rating
- [ ] Log with freshness states and passage detail
- [ ] Daily streak
- [ ] Version number visible in Settings
- [ ] Principle 7.6 enforced, by test

**Not in V0:** auth, sync, search, recents, author and collection browse, Ruhi, personal library,
ingestion automation, PWA install, full accessibility pass, credits screen, privacy policy, typeface
picker.

### v0.1 — immediately after the V0 exit review

- [ ] Typeface picker, seven options
- [ ] Playwright E2E suite, three specs, running on every push

### v1.0 — soft launch

Ten to twenty people.

- [ ] Auth, sync, account deletion, RLS
- [ ] Clear sync-state messaging
- [ ] Browse by author and by collection
- [ ] Full-text search, offline, first-line weighted
- [ ] Search within what I know
- [ ] Recents, with clear and delete
- [ ] Length filter chip
- [ ] Ruhi collections: books 1 to 3, units, sections, quotations, bulk add
- [ ] Progress per Ruhi book
- [ ] Personal library for user-added text
- [ ] Ingestion pipeline: scheduled, idempotent, logged
- [ ] Guided starter path
- [ ] PWA manifest, service worker, installable
- [ ] Accessibility pass: text size, contrast, screen reader
- [ ] Credits screen
- [ ] Privacy policy

### v1.1

- [ ] Remembrance mode
- [ ] Typed cloze as an opt-in setting
- [ ] Private export of log
- [ ] Vocabulary pass, once visual direction is settled

### v2 — native

- [ ] Capacitor wrap
- [ ] Notifications: review reminders, focus goals
- [ ] Speech recognition recitation checking

### v3.0 — devotional layer

- [ ] Obligatory prayer guidance
- [ ] Solar time calculation
- [ ] Badí' calendar, Holy Days, Fast timings
- [ ] Qiblih compass
- [ ] Additional languages via the API's matrix endpoints

*Named honestly as a hard sub-project, not a feature list. Naw-Rúz is astronomically determined from
the vernal equinox as observed in Tehran, Holy Days move against the Gregorian calendar, and
obligatory prayer and Fast timings need real solar calculation with geolocation and timezone
handling. Its own build, its own testing burden.*

**Accepted cost of deferring:** until v3.0, users still reach for another app for obligatory prayers
and Holy Day dates, which softens the "replaces everything" claim. Those needs are annual or
daily-fixed rather than exploratory, so the frequency of the gap is low.

### Not scheduled

- Audio. Breaks the free tier, which is a product constraint.
- An independently built corpus. See 4.2.

---

## 15. Open Questions

**Non-blocking, owner:**

1. Final app name. *By Heart* pencilled. Do not buy a domain or create a listing until settled.
2. Contact the bahaiprayers.net maintainer as a courtesy before public launch.
3. Does literary review apply to publishing an app like this? Community question, cheap to ask.
4. Vocabulary, downstream of the V0 exit review.
5. Default caps. 15 and 2, then observe.

**Closed since v3.0:** Ruhi permission (18.4), Ruhi scope (Books 1 to 3), streak rules (11.4), UI
term for playlist (11.5), whether Remembrance mode counts to the streak (yes, 9.8).

**Closed since v4.0:** visual direction (18.20, `/docs/design-tokens.md`), typeface and palette
scope (18.21).

---

## 16. Build Sequence

Run `/compact` between sessions. Each session opens with the recommended model and effort, and names
the scope sections to read. See `/docs/session-prompt-template.md`.

### V0

| # | Session | Model | Effort | Version |
|---|---|---|---|---|
| 1 | Repo scaffold and **SM-2 scheduler module**, unit tests, no UI, no dependencies | Opus | Max | 0.1.0 |
| 2 | Local-first data layer (Dexie), schema, anonymous user ID, strings module, theme registry, three-tab shell | Opus | Max | 0.2.0 |
| 3 | Corpus fetch script, normalisation, committed JSON dataset, load to IndexedDB | Sonnet | High | 0.3.0 |
| 4 | Discover: category browse, passage list with word count, reading view, bookmark, add to list | Opus | Max | 0.4.0 |
| 5 | Segmentation flow, suggested then confirmed, at add time | Opus | Max | 0.5.0 |
| 6 | Daily queue, caps, silent overflow, upkeep states, focus mode with expiry | Opus | Max | 0.6.0 |
| 7 | Chip quiz components: levels 2, 3 and 4 | Opus | Max | 0.7.0 |
| 8 | Recite-and-reveal levels 5 and 6, milestone screen, whole-passage promotion | Opus | Max | 0.8.0 |
| 9 | Log, freshness states, streak, passage detail view, version display | Sonnet | High | 0.9.0 |

**Why the scheduler is session 1.** It carries all the risk, it has no dependencies, and it can be
fully unit-tested against synthetic data before a single screen exists. v3.0 placed it at session 7
of 15, behind six sessions of plumbing, which is layer-sequencing. Risk-sequencing puts the thing
that can invalidate the project at the front, where it costs least to be wrong.

### v1.0

Sequenced after the V0 exit review, not before. Roughly eight to ten further sessions. Do not plan
them in detail until V0 has been used for a real fortnight.

### Parallel, non-coding

**Ruhi mapping dataset for Books 1 to 3.** Start early. It gates the Ruhi work in v1.0 and it is the
slowest item in the project. Version it against a stated Ruhi edition (5.2).

---

## 17. How We Will Know If This Is Working

**There are no KPIs and no analytics.** v3.0 specified eight metrics with numeric targets and no
instrumentation to produce them. They are deleted, for two reasons.

At a cohort of ten to twenty people, a query is strictly worse evidence than a conversation: a "50%
week-4 retention target" is measuring seven humans and the precision is fake. And aggregating user
devotional data to grade a free app is a privacy cost with no corresponding benefit. See 13.2.

### V0 exit criteria

Two weeks, three people. **Proceed to v1.0 if:**

- The app is beautiful, intuitive and enjoyable to hold.
- It works as a prayer book. You reach for it at a devotional in preference to what you use now.
- It works as a memorisation companion. It makes memorisation feel **attainable**, and it helps you
  see and steer your own progress.
- Nobody abandons a passage part-way because reviews felt punishing.
- Intervals for milestoned passages feel neither smothering nor absent.

**Stop and rework the scheduler if:**

- Anyone describes the daily queue as a chore in week one.
- A passage marked memorised has visibly decayed while the app still shows it as Strong.
- Principle 7.6 is being violated in practice, and the app nags during prayer.

**Explicitly not a criterion:** how much anyone memorised. Capacity to memorise is personal and
varies enormously. The app succeeds if it makes the practice feel attainable and trackable, not if
it produces a particular volume.

### After launch

Structured conversations with the soft-launch group. Two questions carry the most weight:

1. Do you open it to pray, or only when it tells you to?
2. Is there anything you memorised through this that you can still recite two months later?

---

## 18. Decision Log

| # | Decision | Rationale | Owner | Date |
|---|---|---|---|---|
| 18.1 | Split scope into V0 and v1.0 | Thirty P0 items sat in front of the only high-risk component | Safa | 23 Aug 2026 |
| 18.2 | No typed input; chip-based assisted production instead | Cumulative recall plus typed grading is quadratic and unusable on a phone | Safa | 23 Aug 2026 |
| 18.3 | Books excluded from the corpus permanently; `prayers` renamed `passages` | Continuous prose works have no defensible chunking rule; this is not a reference library | Safa | 23 Aug 2026 |
| 18.4 | **No permission block on Ruhi mapping** | Owner is confident the materials are free to reference in this way | Safa | 23 Aug 2026 |
| 18.5 | Accounts optional; anonymous local-first with `user_id` from day one | Signup wall has no user benefit in a local-first app; migration path preserved cheaply | Safa | 23 Aug 2026 |
| 18.6 | All builder-facing metrics and analytics deleted | n=15 makes conversation better evidence than queries; aggregation is a privacy cost with no benefit | Safa | 23 Aug 2026 |
| 18.7 | Full library in V0; segmentation moved to add time | Users select what to memorise, so the selection is the thing under test; on-demand segmentation is cheaper and better | Safa | 23 Aug 2026 |
| 18.8 | Milestone promotes to a whole-passage card at the slowest segment interval | Makes the milestone mechanically real and gives freshness states meaning | Safa | 23 Aug 2026 |
| 18.9 | It is a full prayer app; devotional layer in scope at v3.0 | The bundle is the differentiator; nobody has both halves | Safa | 23 Aug 2026 |
| 18.10 | Focus mode suppresses everything, with a default 7-day expiry | Real use case; expiry prevents unbounded decay | Safa | 23 Aug 2026 |
| 18.11 | No accuracy percentage; qualitative passage detail instead | A percentage of self-ratings is a self-report dressed as measurement, and it would corrupt the scheduler's only input | Safa | 23 Aug 2026 |
| 18.12 | Plain language in V0; vocabulary deferred behind a strings module | Cheapest thing in the product to change; cannot be judged without visual identity | Safa | 23 Aug 2026 |
| 18.13 | Streak pauses on one missed day, resets on two consecutive | Simpler than grace allowances and forgiving in the direction the principles point | Safa | 23 Aug 2026 |
| 18.14 | Corpus committed to the repo as a versioned dataset; no independent corpus | Delivers the durability benefit; an own corpus would not escape BIC copyright | Safa | 23 Aug 2026 |
| 18.15 | Length demoted; word count on rows, no time estimates | Length leads in a memorisation tool and does not in a prayer app; pace estimates are invented precision | Safa | 23 Aug 2026 |
| 18.16 | Memorisation chrome never appears in Discover (principle 7.6) | Protects the devotional case, which is half the product | Safa | 23 Aug 2026 |
| 18.17 | Recents ships in v1.0 with clear and delete | Most useful navigation aid for the devotional case; already free from the data model | Safa | 23 Aug 2026 |
| 18.18 | V0 ships category browse only; author and collection browse deferred | V0 exists to validate the scheduler; category is the one axis that makes the library usable | Claude, defaulted | 23 Aug 2026 |
| 18.19 | Australian English throughout | Owner preference | Safa | 23 Aug 2026 |
| 18.20 | Design handoff descoped to design tokens; scope owns behaviour and IA, tokens own appearance | The handoff embedded product scoping and an information architecture that breached principle 7.6 in four places; nine conflicts resolved in the scope's favour and recorded in `design-tokens.md` section 9 | Safa | 23 Aug 2026 |
| 18.21 | Two palettes and adjustable text size in V0; seven-typeface picker at v0.1; theme system registry-driven from session 2 | Palettes are near-free once a theme provider exists and give V0 testers something useful to react to; seven font families is load weight and seven interactions with the text size range, none of which the V0 exit criteria ask about. Registry-driven from the start because "I may add more palettes, typefaces or whole designs later" is a session 2 decision, not a v1.1 one | Safa | 23 Aug 2026 |
| 18.22 | Fonts self-hosted and subset, never loaded from a CDN | A CDN font load is a runtime network call that fails offline and produces unstyled text, which contradicts 4.2 and 12.2 | Safa | 23 Aug 2026 |
| 18.23 | `display_title` added to `passages` | The reading view title carries an authored line break; corpus titles arrive as plain strings and the break would be lost | Safa | 23 Aug 2026 |
