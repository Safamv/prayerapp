# Decision Log
## By Heart — build decisions

Append-only. Newest at the bottom.

**What goes here:** decisions taken during a build session, and contradictions found in
`/docs/scope.md`. Product decisions owned by Safa live in scope section 18, not here.

**Format.** Full entries for anything that touches more than one file or would be expensive to
reverse. One line for anything contained and cheap. Full entries always end with **what this means
for you**, written for a reader with no technical background.

---

## D0 — Pre-development

The ten decisions below were taken during CLAUDE.md planning, before session 1. They are recorded
here because they govern the build rather than the product.

---

### D0.1 — Test depth for V0

**Decision.** Unit tests are mandatory for the pure functions: the scheduler, segmentation,
normalisation, queue construction, streak arithmetic and freshness derivation. Component tests for
chip cloze only. No Playwright end-to-end tests until the V0 exit review.

**Options considered.**
- *Scheduler only.* Cheapest. Leaves five other places where a silent bug would invalidate two weeks
  of tester data.
- *All pure functions.* Chosen. These run in about a second with no app needed.
- *Everything including end-to-end.* End-to-end tests drive the real app in a real browser. During
  sessions 1 to 9 the screens change shape every session, so the tests would spend more time being
  repaired than finding bugs.

**Reversible.** Yes, at any time. Adding tests later is always possible.

**What this means for you.** The parts of the app where a bug would be invisible are covered from
day one. The parts where a bug is obvious the moment you open the screen are not, because you are
the test. Playwright arrives once the app stops changing shape, and from then on every bug a tester
finds becomes a permanent test before it is fixed.

---

### D0.2 — Version number equals session number

**Decision.** `package.json` is the single source of truth for the version. The minor number matches
the build session, so session 6 ships `0.6.0`. Displayed in Settings as version, short commit code
and build date: `v0.6.0 · a3fa300 · 23 Aug 2026`.

**Options considered.** Hand-managed semantic versioning (no fixed meaning, so a version number
tells you nothing); date-based versioning (tells you when, not what).

**Reversible.** Yes, trivially.

**What this means for you.** When a tester reports something odd, one line off their Settings screen
tells you exactly which build they are holding and therefore which sessions' work is in it.

---

### D0.3 — The scheduler's isolation is enforced by tooling, not by instruction

**Decision.** An ESLint rule fails the build if anything outside `src/scheduler/` is imported into
it.

**Options considered.** Stating it in CLAUDE.md and trusting it (the scope already states it, and
prose does not survive forty turns); full module boundary mapping with `dependency-cruiser`
(deferred to the V0 exit review, when there are enough modules to be worth mapping).

**Reversible.** Yes, it is one config file.

**What this means for you.** The scheduler is the part that decides when you next see a passage. It
is the highest-risk piece and the one most likely to need replacing. Keeping it sealed means
replacing it later is swapping one folder. The failure this prevents is gradual: each small
shortcut is reasonable on its own, and after five of them the scheduler cannot be replaced without
rewriting the quiz too. Nobody decides that. It just accumulates.

---

### D0.4 — Principles 7.6 and 7.11 are enforced by test

**Decision.** Two automated tests. No component under `src/features/discover/` may import from the
scheduler or progress modules. No user-facing text may appear in a component file.

**Options considered.** Prose in CLAUDE.md only. Rejected: 7.6 is described in the scope as the
principle that protects the devotional half of the product, and a principle that important should
fail the build rather than sit in a file the agent read forty turns ago.

**Reversible.** Yes.

**What this means for you.** The app physically cannot show streaks, due counts or progress in the
library or the reading view. Not "should not". Cannot. The build breaks first. Same for text: every
word a user reads lives in one file, so changing the app's vocabulary later is editing one file
rather than hunting through forty.

---

### D0.5 — One branch per build session

**Decision.** Each session works on a branch named for it, for example `session-04-discover`. Claude
Code pushes the branch and never pushes to `main`. Safa merges. Each session is tagged with its
version.

**Reversible.** Yes.

**What this means for you.** Nine sessions produce nine reviewable units that map exactly to the
build plan. If session 5 goes badly you delete a branch rather than untangling a revert. Nothing
reaches the main line of the project without you merging it.

---

### D0.6 — No trimmed build-only version of the scope

**Decision.** The scope stays whole. Every session prompt names the specific scope sections to read.
CLAUDE.md instructs the agent to stop and ask if no sections are named.

**Options considered.** A trimmed build spec containing only what Claude Code needs. Rejected for
two reasons. Two documents covering the same ground drift, and the one that goes stale is always the
derived one, which is also the only one being read. And the rationale in the scope is not dead
weight: when a session is tempted to reintroduce typed input, decision 18.2 and its reasoning is
what stops it. A rule without its reason is one an agent can talk itself around.

**Reversible.** Yes, but doing it later would mean maintaining both.

**What this means for you.** One scope document, which stays the record of your thinking and the
place you brainstorm. Sessions read only the two or three sections they need, so nothing is being
skimmed.

---

### D0.7 — Corpus committed as one file per feed, plus a manifest

**Decision.** The fetch script writes one JSON file per source feed, plus a `manifest.json`
recording fetch date, record count and a content fingerprint per feed.

**Options considered.** A single combined file. Rejected: several megabytes, and every re-fetch
produces a change too large to read.

**Reversible.** Yes, before session 3 runs. Awkward after.

**What this means for you.** When a translation is updated, you can see exactly which collection
changed and what changed in it. It also makes the contingency in scope 4.2 real: if the source
disappears, hand-patching corrections into a single-collection file is practical.

---

### D0.8 — Theme registry is a typed object that writes CSS variables

**Decision.** Themes live in `src/theme/themes.ts` as typed objects, one per palette. The active one
writes its values onto a single element as CSS custom properties. Components reference variable
names, never colours.

**Options considered.** CSS-only theming (no compile-time check that a new theme is complete);
Tailwind config (fixed at build time, which makes switching themes at runtime awkward and a
user-added theme impossible).

**Reversible.** Expensive after session 2. This is why it is decided now.

**What this means for you.** Adding an eleventh palette is adding one object to a list. If a new
theme is missing a colour, the build says so by name rather than shipping something with an
invisible label. This is the decision that makes "I may add more palettes, typefaces or whole
designs later" cheap instead of a rewrite.

---

### D0.9 — No Supabase in V0, and all data access goes through one folder

**Decision.** V0 has no accounts, no sync, no network calls. Every database call goes through
`src/data/`, and no component imports the database directly. Table and column names match scope
section 10 exactly, and every record carries a `user_id` from the first version.

**Reversible.** The no-Supabase part, yes. The `src/data/` discipline, no, not cheaply.

**What this means for you.** Adding sync at v1.0 means changing one layer rather than forty files.
If components talked to the database directly, sync would be a rewrite instead of a session. It also
means V0 needs no accounts, no keys, and nothing that can leak.

---

### D0.10 — Every tester-found bug becomes a test before it is fixed

**Decision.** From the V0 exit review onward, any bug found by a tester gets a test written for it
first, and the test is what proves the fix.

**Reversible.** It is a habit, not a mechanism.

**What this means for you.** The test suite grows from things that actually went wrong rather than
from what someone thought to check in August. It also means the same bug cannot come back twice
without the build failing.

---

*Session entries begin below.*

## D1 — Session 1, repo scaffold and SM-2 scheduler

---

### D1.1 — The upkeep multiplier is applied to the date, never stored in the interval

**Decision.** A segment's stored `interval_days` is always the plain SM-2 number. The occasional
upkeep multiplier of three is applied at the moment a due date is chosen, and never written back.

**Options considered.**
- *Store the multiplied interval.* Simpler to read in the database, and wrong. The next review
  works out its interval by multiplying the previous one, so a tripled interval gets tripled again.
  Three months on occasional upkeep quietly becomes nine, then twenty seven. Nobody would notice
  until a passage failed to come round for two years.
- *Store the plain interval and multiply when choosing the date.* Chosen. It also means moving a
  passage between active and occasional loses nothing, because the underlying SM-2 state was never
  contaminated.

**Reversible.** Yes now, awkward after session 6 builds the queue on top of it, and awkward after
real tester data exists, because the stored numbers would mean two different things depending on
when they were written.

**What this means for you.** Putting a passage on occasional upkeep makes it come round about three
times less often, and putting it back on active returns it to its old rhythm immediately. Neither
switch damages what the app has learned about how well you know it.

---

### D1.2 — A resting passage still gets a due date

**Decision.** Resting is a separate question from how long the interval is. The scheduler works out
a date as though the passage were active, and a separate check keeps resting material out of the
queue.

**Reversible.** Yes, trivially.

**What this means for you.** Scope 8.5 says a resting passage never decays into "needs review", and
it does not: it is simply never queued. But when you wake it up, the app knows what is genuinely
overdue rather than pushing everything a fresh week into the future. Waking a passage shows you
where you actually are.

---

### D1.3 — "The slowest of its segments' intervals" is read as the shortest interval

**Decision.** Scope 8.7 says a promoted whole-passage card is scheduled on the slowest of its
segments' intervals. That is read as the segment with the shortest interval, which is the segment
that still needs seeing most often. The promoted passage also inherits that segment's ease factor
and repetition count.

**Options considered.**
- *Shortest interval, meaning the weakest line sets the pace.* Chosen. Conservative. A passage with
  one shaky line keeps coming round until that line is solid.
- *Longest interval.* The other reading of the same word. A passage where every line is strong
  except one would disappear for months on the strength of the others. Scope 8.7 says this
  arrangement is "the only one in which the freshness states in section 11 mean anything", and a
  passage that vanishes for months is exactly what empties those states out.

**Reversible.** Yes, cheaply, until session 8 builds the milestone screen and testers start
reaching milestones. It is one line of code and one test either way.

**What this means for you.** This is on the open questions list, because the scope sentence genuinely
reads both ways and it is your call. As built: when you finish memorising a passage, it comes back
as often as its weakest line needed, not as rarely as its strongest line allowed. So a passage you
have just finished will come round fairly soon at first, and then stretch out.

---

### D1.4 — The SM-2 numbers

**Decision.** Ease factor starts at 2.5 and never goes below 1.3. Again lowers it by 0.20, Hard by
0.15, Good leaves it alone, Easy raises it by 0.10. The first successful review waits one day, the
second waits six, and from the third the interval is multiplied by the ease factor. Hard grows the
interval by a fixed 1.2 instead. Easy adds a further 1.3 on top. Again drops the interval back to
one day and starts the count again. No interval is ever shorter than one day or longer than 365.

**Options considered.** The original 1987 SM-2 formula grades on a scale of nought to five and
derives the ease change arithmetically. It needs a six point rating and we have four (scope 9.6), so
the mapping would have been invented anyway. The numbers above are the widely used four button
variant, which has two decades of practical use behind it.

**Reversible.** Yes. Every one of these numbers is a named field in one object, changeable without
touching any logic, and the whole module is designed to be swapped for FSRS.

**What this means for you.** A passage you always rate Good comes round after 1 day, then 6, then
15, then 38, then 95, then 238. Six reviews in eight months. A passage you keep rating Again or Hard
stays on a roughly weekly cycle and does not run away from you. If it feels too slack or too
relentless when you use it, these are the numbers to change, and changing them is one file.

---

### D1.5 — A lapse starts the count again rather than shortening the interval

**Decision.** Rating Again puts the segment back to a one day interval and resets its repetition
count, so it walks the one day and six day steps again. The ease factor keeps its penalty, so
recovery is slightly slower than starting fresh.

**Options considered.** Anki's relearning approach keeps a fraction of the old interval, which is
gentler and gets a lapsed item back to long intervals faster. Rejected for now: this is devotional
text recited from memory, and "I could not remember it" is a real signal rather than a slip of the
mouse.

**Reversible.** Yes, it is one branch and one config number.

**What this means for you.** Forgetting a line puts it back to tomorrow, then six days, then a
fortnight. It costs you three or four reviews to rebuild. That is deliberate, and it is the
behaviour most likely to be worth revisiting once you have used the app for a fortnight.

---

### D1.6 — The scheduler wall is enforced with `no-restricted-syntax`, not `no-restricted-imports`

**Decision.** CLAUDE.md section 10 names ESLint's `no-restricted-imports` as the mechanism for the
module boundaries. For the scheduler it does not work, so the wall is built from
`no-restricted-syntax` instead. `no-restricted-imports` is still the right tool for the boundaries
session 2 needs, and will be used there.

**Why.** `no-restricted-imports` matches import names using the same rules as a `.gitignore` file,
and in those rules an exception cannot re-permit a relative path. So "block everything except
imports from inside this folder" cannot be written. The rule that was written instead inspects the
code directly, and as a bonus it also catches two things the other rule misses entirely: type-only
imports, and imports loaded on demand at runtime.

**Reversible.** Yes, it is one config file.

**What this means for you.** Nothing about how the app behaves. The seal on the scheduler that
decision D0.3 promised is real, and slightly tighter than planned. It is also double-checked by a
test that reads the scheduler's own source code, so switching the lint rule off would not quietly
open the door.

---

### D1.7 — Contained decisions

- **One `tsconfig.json` rather than the three the scaffolder generates.** The generated arrangement
  makes `npx tsc --noEmit`, the first gate in CLAUDE.md section 5, check nothing at all. One config
  file makes the gate real. Changes nothing about how the app behaves.
- **ESLint replaces oxlint.** The Vite scaffolder now ships oxlint by default. CLAUDE.md section 10
  specifies ESLint, and the import boundaries are the reason, so oxlint was removed.
- **`npm run lint` runs Prettier as well as ESLint.** Formatting is then a gate rather than a
  suggestion. Prettier is configured never to touch anything in `/docs` or any `.md` file, so it
  cannot reformat your documents.
- **The scheduler's tuneable numbers live inside `src/scheduler/`, not `src/config/`.** CLAUDE.md
  section 9 lists SM-2 defaults under `src/config/`, and CLAUDE.md section 4 rule 5 forbids the
  scheduler importing anything, including that. The scheduler owns its own defaults and accepts an
  override as an argument. Session 2's `src/config/` will hold the app's own constants and pass them
  in. This keeps both rules intact.
- **A day is a plain `YYYY-MM-DD` string, checked when it arrives.** Not a specially typed value,
  which would have made every call site noisier for no practical gain. A malformed or impossible
  date throws immediately rather than becoming a silent "Invalid Date".
- **All date arithmetic is done in UTC.** Tested against the start of Australian daylight saving,
  which is where day counting done in local time loses or gains a day.
- **The ease factor has a floor but no ceiling.** Since no interval may exceed 365 days, an ease
  factor that climbs past 3 has no practical effect.
- **Dependencies added this session.** `vitest`, `tailwindcss` with `@tailwindcss/vite`, `eslint`
  with `@eslint/js`, `typescript-eslint` and `globals`, and `prettier`. All are development tools
  except Tailwind, and all are named in CLAUDE.md section 10. Nothing ships to the browser from the
  scheduler.

---

### D1.8 — The fonts need no manual download. A build script fetches and cuts them down

**Decision.** All ten typefaces named in design-tokens 2.1 and 8.1 are Google Fonts, published under
the SIL Open Font Licence, which permits self-hosting and redistribution. Nothing needs to be bought
or obtained by hand. A script under `scripts/` downloads them and cuts them down to only the
characters the corpus uses, and the resulting files are committed to the repository. CLAUDE.md rule
11 forbids network calls from application code and exempts `scripts/`, which is exactly this case.

**Why this came up.** Session 1 flagged the fonts as something Safa might have to supply. Reading
the original design handoff shows it loaded all ten families from Google's servers at runtime, which
design-tokens 8.1 correctly rejects because a font fetched over the network fails when the app is
offline and the text comes out unstyled. The fix is to fetch them once at build time instead, and
that removes the manual step entirely.

**What V0 actually needs.** Two families, not ten. Scope 12.3 and design-tokens 2.1 both say V0
ships the Italiana option only, which is Italiana for display and caps and Cormorant for body text.
The other eight families arrive with the typeface picker after V0.

**Reversible.** Yes. It is one script and two committed font files.

**What this means for you.** Nothing to download and nothing to buy. The app will carry its own
fonts inside it, so it looks right the first time it opens with no signal, which is the whole point
of building it local-first.

---

### D1.9 — The Ruhi quotations dataset exists, and it is stronger than the scope assumed

**Decision.** Recorded here as a finding that needs a scope revision from Safa, not as a decision
taken. Scope section 16 calls the Ruhi mapping "the slowest item in the project" and gates it behind
v1.0. Most of it is already done.

**What is in `/Ruhi Books/Extracted Quotes`.**

| Book | Quotations | To Memorise | Reflection | Untagged |
|---|---|---|---|---|
| 1, Reflections on the Life of the Spirit | 71 | 24 | 47 | 0 |
| 2, Arising to Serve | 107 | 59 | 48 | 0 |
| 3, Teaching Children's Classes Grade 1 | 136 | 0 | 0 | 136 |
| **Total** | **314** | **83** | **95** | **136** |

Every quotation carries its unit, its section, its verbatim text and a resolved full citation. The
citations are genuinely resolved, including the "Ibid." chains, and the extraction notes record what
was left out and why. This is good data.

**Three things stand between it and the app.**

1. **The three files are in three different formats.** Book 1 marks the category inline before the
   quote. Book 2 puts it on a line after the citation. Book 3 has no category line at all. One
   build script normalises all three into a single dataset, which is a session 3 job.
2. **Book 3 has no To Memorise or Reflection tags,** so the filter Safa asked for would silently do
   nothing for 136 of the 314 quotations, which reads as a broken feature rather than an absent one.
   Book 3 is also deliberately partial: it stops before the twenty four per-lesson memorisation
   quotations, which are the child-facing memorisation content and arguably the most useful part of
   that book for this app.
3. **No quotation is linked to a passage record yet.** Scope section 10 gives `ruhi_quotations` a
   `passage_id`, and both extraction files note that matching quotes to a passages corpus is a
   separate pass that has not been done. Many citations are from works that the corpus feed may not
   carry at all, such as The Advent of Divine Justice, Paris Talks and messages of the Universal
   House of Justice.

4. **Twenty of the 314 quotations appear in more than one book, and the category can differ between
   the two appearances.** "Nothing whatever can, in this Day, inflict a greater harm upon this
   Cause" is To Memorise in Book 1 and Reflection in Book 2, because Book 1's section tells the
   reader to memorise it and Book 2's does not. So the category belongs to the quotation's
   appearance in a particular section, not to the text itself. This settles where the category is
   stored, and it confirms that the two-table shape scope section 10 already describes, a passage
   record plus a `ruhi_quotations` row pointing at it, is the right one.

**What this means for you.** The Ruhi part of the app is months closer than the scope thought. Three
questions need your answer before it can be built, and they are in the session summary rather than
here, because they are yours to decide and not mine.

---

### D1.10 — Ruhi lives on the memorisation side of the app, never in Discover

**Decision, taken by Safa, 24 August 2026.** A Ruhi quotation is never findable when browsing or
searching for prayers. It has its own route, reached from the memorisation side of the app, drilling
from book to unit to section to quotation. It is searchable within that route. It is memorised by
exactly the same machinery as a prayer. The To Memorise and Reflection category belongs to the
quotation's appearance in a section, not to the text.

**This contradicts the scope in two places and needs a revision from Safa.**

- **Scope 5.4** states "Discover surfaces Ruhi books as a browse axis."
- **Scope 6.1** lists Ruhi as one of the values of the By Collection browse axis, which is a Discover
  surface.

Both describe the opposite arrangement. The reason given for the change is that opening the library
at a devotional gathering and finding study-curriculum quotations mixed in with prayers is the wrong
experience. That reasoning is the same reasoning as principle 7.6, which the scope names as the
principle protecting the devotional half of the product, so the change strengthens 7.6 rather than
straining it. Scope 5.4's other clause, "Progress per Ruhi book lives in Log, never in Discover",
already points the same way.

**How it is built, which is not the same question as where it appears.**

Everything Safa described is about where a quotation appears. None of it is about how it is stored,
and separating the two is what makes all of it possible at once.

- **Stored as a passage record,** with `collection` set to `ruhi`, plus a `ruhi_quotations` row
  pointing at it and carrying the section and the category. This is the shape scope section 10
  already describes. It is the only arrangement in which "memorised identically to a prayer" is
  literally true rather than a second code path that has to be kept in step. Segmentation, the
  queue, the quiz ladder, the scheduler, the log and freshness all work on it unchanged, with no new
  code at all.
- **Kept out of Discover by the data layer, not by discipline.** `src/data/` exposes separate
  functions for the devotional surfaces and for the Ruhi route, and the devotional ones do not
  return the Ruhi collection. Discover cannot show a Ruhi quotation because the function it calls
  does not return one. This is decision D0.9's discipline doing the work it was created for, and it
  is checkable by test in the same way principle 7.6 is.
- **One column added to scope section 10:** `ruhi_quotations.designation`, holding `memorise` or
  `reflection`. Chosen over a shared tag because 20 of the 314 quotations appear in two books and the
  category can differ between the appearances. See D1.9 point 4.

**Some Ruhi quotations are excerpts of, or entire, prayers or Hidden Words that also exist in the
devotional corpus.** Those will exist twice: once as a devotional passage and once as a Ruhi
quotation. That is correct rather than duplication to be cleaned up, because the two are read in
different contexts, carry different citations, and one of them must not appear in Discover.
Memorising one does not memorise the other. If that turns out to feel wrong in use, linking them is
an additive change later.

**Sequencing.** Ruhi becomes a session of its own after the V0 exit review, rather than being spread
through sessions 3 and 4. Scope section 14 already lists Ruhi under "Not in V0", so this restores
the release plan rather than departing from it, and it avoids delaying the fortnight of real use that
V0 exists to produce. Sessions 2 to 9 are unchanged. The four `ruhi_*` tables are still declared in
session 2 and left empty, because declaring the schema once is the reason D0.9 exists.

**Reversible.** The storage shape, not cheaply, once real use has begun. Where it appears, yes,
easily and at any time: it is which function a screen calls.

**What this means for you.** Opening the app to pray shows you prayers, and nothing from a study
course. The Ruhi material has its own way in, on the side of the app that is about memorising, and
once you are memorising a quotation it behaves exactly like memorising a prayer. It arrives as one
session after you have used the rest of the app for a fortnight.

---

### D1.11 — Scope revised to v4.2 by Claude, on Safa's explicit instruction

**Decision.** CLAUDE.md section 2 says "Never edit `/docs/scope.md`" and "Safa issues scope
revisions." Safa lifted that for this one revision, in writing, on 24 August 2026: "you issue the
scope revisions your logic makes sense here."

**Treated as a one-off, not a standing change.** The rule in CLAUDE.md section 2 is unchanged and
still binds every future session. A session that finds a contradiction still logs it here and stops.
Recorded so that a future session reading v4.2's changelog does not conclude that Claude may revise
the scope whenever it judges the logic sound.

**What was changed.** Only what D1.9 and D1.10 had already established, plus the consistency fixes
those forced. Ruhi moved from v1.0 to v0.1 as one session after the V0 exit review (3.2, 5, 14, 16).
Ruhi removed from Discover (5.4, 6.1). `designation` added to `ruhi_quotations` (5.3, 10). A Ruhi
quotation stored as a `passages` record (5.3). `**[v0.1]**` added to the tag legend, which 12.3 was
already using without listing it. Curation status recorded in 5.1. Decisions 18.24 to 18.27 added.
CLAUDE.md's pointer to the scope version updated from v4.1 to v4.2.

**No requirement changed, and nothing moved into or out of V0.** Sessions 2 to 9 are untouched.

**Separately, and needing Safa's approval or a revert:** CLAUDE.md section 5 was also edited, to
turn "the last two acts of the session" into a four-part handoff: the sessions.md entry, the merge
instructions, the next prompt, and the open questions. This codifies what Safa's own session 1
prompt asked for but CLAUDE.md did not require, so the chain would have broken at session 2. It is
a change to the build contract rather than to the scope, it was not covered by the instruction
above, and it is one `git revert` away if unwanted.

**What this means for you.** The scope now says what you decided, so a future session reading
section 5 or section 6 builds the right thing without needing this conversation. The one rule you
should know I bent, and bent only because you told me to, is that I edited the scope at all. It goes
back to being yours alone from here.

---

## D2 — Session 2, data layer, strings, theme registry and the shell

---

### D2.1 — Four new tools were added, and what each one is for

**Decision.** Four packages were added, since CLAUDE.md rule 6 requires a logged decision for each.

**Dexie**, the database library. Scope 12.1 already names it. It is the thing that talks to the
browser's own storage, and it is used only inside `src/data/`.

**React Router**, which decides which of the three tabs is on screen. The alternative was writing
about sixty lines of our own. Router was chosen because sessions 4 and 10 both need screens inside
screens (a category, then a passage, then the reading view, with a back arrow that goes back one
step rather than all the way out), and getting that right by hand is a week of small bugs.

**fake-indexeddb**, used only when tests run. It is a complete working copy of the browser's storage
that runs on a laptop, so a test genuinely saves and reads back rather than pretending to.

**jsdom and React Testing Library**, also test-only. They let a test open a screen and look at it.

**Reversible.** Dexie, expensively, and only because everything is stored through it. The other
three, yes, easily.

**What this means for you.** Nothing you can see. Two of the four never reach your phone at all;
they exist so that the tests are testing the real thing.

---

### D2.2 — The anonymous user id lives beside the database, not inside it

**Decision.** The id that scope 13.1 gives every device is stored in the browser's simple key-value
storage rather than as a row in the database.

**Why it came up.** Every user-owned row carries a `user_id`. Two tables, `user_stats` and
`user_settings`, are keyed *by* that id, so the id cannot be stored in a table that is keyed by
itself. Scope section 10 has no other table to put it in, and inventing one would be inventing
schema the scope does not have.

**What each option would have meant.** A new table means a column the scope never described, which
is the beginning of the local database and the future Supabase one drifting apart. The simple
storage is cleared by exactly the same action that clears the database, so the id survives precisely
as long as the data it identifies, which is the correct behaviour.

**Reversible.** Yes, easily.

**What this means for you.** Nothing changes about how the app behaves. Clearing the app's data in
your browser settings still clears everything, together, as you would expect.

---

### D2.3 — Every data function is handed the user id rather than fetching one

**Decision.** No function in `src/data/` looks up who the user is. The app works it out once when it
starts and passes it in.

**Reversible.** Yes, but it gets more expensive with every screen built on top.

**What this means for you.** When accounts arrive at v1.0, signing in changes about five lines. If
each function fetched the id itself, it would change every one of them.

---

### D2.4 — Settings is reached from Log, by default rather than by decision

**Decision.** The Settings screen is opened from a row at the bottom of the Log tab.

**Why it came up.** Scope 3.1 names three tabs and does not say which of them owns Settings, but the
version number has to be visible somewhere from this session onward because it is what a tester
reads off their screen when reporting a problem.

**What each option would feel like.** From Log: settings sit on the personal side of the app,
alongside what you know and your streak. From Discover: they sit on the devotional side, which
principle 7.6 exists to keep uncluttered. From a small control in the header of every screen:
always one tap away, but it adds a permanent piece of furniture to the top of the reading view.

**Reversible.** Yes, easily and at any time. It is one link.

**What this means for you.** Today the Log tab is empty apart from a single row reading "Settings".
Tell me if you would rather it lived somewhere else, and it moves in a minute.

---

### D2.5 — The tab bar ships without icons, because the tokens document defines none

**Decision.** The tab bar is three tracked capital labels. No icons.

**Why it came up.** Design-tokens 5.6 calls for a 15px icon above each label. Design-tokens 8.3 then
says the whole app has exactly three drawings in it: the nine-pointed star, the magnifying glass and
the back arrow. None of those is a tab icon, and the app has no image files at all.

**What each option would have meant.** Inventing three marks would put a permanent piece of the
app's furniture in the hands of a build session rather than yours, and the tab bar is on screen
almost all the time. Three well-set capital labels is a legitimate and rather sober design in its
own right, which suits a vintage printed book.

**Reversible.** Yes. Adding icons later is one component.

**What this means for you.** This is on the open questions list. The bar works and looks
deliberate, but if you want icons, tell me what the three should be.

---

### D2.6 — The text size control clamps how much the user can grow, not how large a typeface is

**Decision.** The user's text size setting is limited per role. The typeface's own size correction
is always applied in full.

**Why it came up.** Design-tokens 2.1 gives each of the seven typefaces three numbers whose job is
to make all seven look the same size on screen despite being very different sizes in the file.
Tangerine's is 1.5, because Tangerine is a small, fine script. Design-tokens 2.4 then says to clamp
each role so that large text does not blow the layout apart.

Read the obvious way, those two rules fight: clamping the final size would cancel out Tangerine's
correction and make its headings smaller than everyone else's, which is the opposite of what the
correction is for. So the limit is applied to the part the user controls.

**Reversible.** Yes.

**What this means for you.** Turning text size up makes prayer text and list text genuinely large,
up to about 175% of normal, which is what scope 7.9 asks for. Headings grow too but stop sooner, at
about 125%, so a title cannot swallow the screen. This is the right trade because the reason the
control exists is to make the writings readable.

---

### D2.7 — Contained decisions

- **Record ids are UUIDs, not counters.** Two devices offline would both write a row 41 and v1.0
  sync would have to untangle them. Changes nothing about how the app behaves.
- **Dates are recorded in your own timezone, not UTC.** Reviewing at nine in the morning in
  Melbourne would otherwise be recorded as yesterday, and you would appear to have broken a streak
  you had not broken.
- **Removing a passage from your list also removes its progress and its review history.** Leaving
  them behind would resurrect a half-learnt state if you ever added the passage again, which is not
  what "remove" means to the person tapping it.
- **A saved palette or typeface that no longer exists falls back to the default** rather than
  failing. A setting can outlive the option it names, and a blank screen is the wrong answer to a
  stale preference.
- **`is_focus` and `high_contrast` are stored as true or false and not indexed.** Browser storage
  cannot index a true or false at all, and the alternative of storing 1 and 0 would break the column
  shape that makes v1.0 sync additive. Nothing to see.
- **The version line shows the commit before the one that contains it.** That is normal for a build
  stamp and it is what makes it useful: it names the code, not the release note.

---

### D2.8 — The largest drop cap any typeface can produce is 120px, and it needs your eye at v0.1

**Decision.** Recorded rather than fixed, because it cannot happen in V0.

**What was found.** The large decorative first letter of a prayer is 64px normally. In Tangerine,
whose size correction is 1.5, that is already 96px, and at the largest text size it reaches 120px,
which is about a third of the width of a phone screen. Design-tokens 2.4 rule 4 asks for every
typeface to be checked at both ends of the text size range before it ships.

**Why it does not matter yet.** V0 ships Italiana only, where the same letter tops out at 80px,
which is comfortable. Tangerine arrives with the typeface picker at v0.1.

**Reversible.** Yes. It is one number.

**What this means for you.** Nothing in V0. When the typeface picker is built, turn the text size to
maximum in Tangerine and tell me whether the big first letter looks right. A test records the
number so it is in front of whoever builds that screen.

---

### D2.9 — Claude merges its own work. Safa reads and answers, and does nothing else

**Decision, taken by Safa, 24 August 2026.** At the end of every session Claude pushes the branch,
pushes the tag, merges into `main` and pushes `main`. Safa runs no commands. His two jobs are
reading and answering questions.

**Why it came up.** Sessions 1 and 2 both ended with a page of numbered git instructions for Safa to
copy out. Safa's words: "I don't want to merge myself, what a waste. I don't want to have to do
anything but read and answer questions." He is right, and the instructions were a page of work
handed over for no benefit.

**What this changes in the build contract.** CLAUDE.md rule 14 said "never push to `main`". It now
says never merge a branch whose five gates have not all passed. Section 5's handoff replaces "write
merge instructions" with "merge it yourself". Section 6.4, "when Safa has to do something himself",
now says merging is not on that list and adds the standing instruction that before asking him to do
anything at a keyboard, work out whether you can do it yourself.

**What was kept, and why.** The five gates still run first and their output is still pasted, so
nothing reaches `main` unproven. The branch and the tag are still pushed before `main` is, so every
session can be read back on its own and any bad merge is recoverable. **If a merge conflicts, it is
aborted, `main` is left untouched, and Safa is told plainly.** Conflicts are never resolved on
`main` to get a merge through. And a fix between sessions is not an exception: same branch, same
five gates, same merge, patch version bump.

**What was considered and not done.** Requiring Safa to approve each merge in advance, which is the
same interruption in a smaller box. And merging without the gates, which is how a broken `main`
happens on a Sunday.

**Reversible.** Yes, entirely. It is a paragraph in CLAUDE.md.

**What this means for you.** Nothing to do at the end of a session. When you open a session summary
it will tell you what landed, what the version is, and what you would see if you opened the app.
The only two things that will ever come back to you are a question and a merge that would not go
through cleanly, and the second should be rare.

---

### D2.10 — The three tab icons, drawn from the product rather than from an icon set

**Decision, requested by Safa, 24 August 2026.** The tab bar gets icons. Safa asked for something to
look at now and said he can edit it later, so these are a first pass rather than a settled design.
Design-tokens 8.3 is updated to record them; it previously named only three drawings for the whole
app and none of them was a tab icon (D2.5).

**What each one is, and why.**

- **Discover, an open book.** Discover is the library, and an open book is the plainest possible
  statement of that. It is the only one of the three that could have come from an icon set, and
  that is fine: it needs no explaining.
- **Memorise, three lines of text growing downward.** Not a generic mark. Scope 8.1's method is
  cumulative line building: you learn line one, then lines one and two, then one, two and three. The
  icon is that.
- **Log, a shelf of bound volumes**, one leaning the way a shelf of books actually leans. Log is
  what you have taken in and still hold.

**Two marks were deliberately not used.** The nine-pointed star, which design-tokens 4 reserves for
the freshness state and which on a tab would read as a rating. And a flame, which on every other app
on the phone means a streak, and a streak on a tab is precisely what principle 7.6 forbids.

**Reversible.** Completely, and cheaply. They are three shapes in one file, `TabIcons.tsx`. Nothing
else in the app knows what they look like, and a test asserts only that there are three of them,
that they are all different, and that they name no colour of their own.

**What this means for you.** The bottom bar now has a small gold drawing above each word, dimmed on
the two tabs you are not on. If you want different shapes, describe them in words and it is a
ten-minute change.

---

### D2.11 — The weakest line sets the pace, confirmed

**Decision, taken by Safa, 24 August 2026.** Scope 8.7's "the slowest of its segments' intervals"
reads both ways. Session 1 built it as the **shortest** interval and flagged it. Safa has confirmed
that reading, so D1.3 stands as built and the open question is closed.

**What this means for you.** When you finish memorising a passage, it comes back as often as its
weakest line needed rather than as rarely as its strongest line allowed. So a passage you have just
finished comes round fairly soon at first and then stretches out. Nothing in the code changes; this
entry exists so that no later session reopens the question.

---

## D3 — Session 3, corpus fetch script and normalisation

---

### D3.1 — A `text` column was added to `passages`

**Decision, taken by Safa, 24 August 2026.** `passages` gains one column: `text`, the whole passage
as plain prose. Session 3 found that nothing in the schema held it.

**Why it came up.** Building the normalisation that turns a fetched prayer into a `passages` row, it
became clear the row had nowhere to put the prayer itself. `first_line` is only the opening, kept for
search and titles. `passage_segments` holds the full text in pieces, but scope 8.4 deliberately leaves
it empty until a user adds the passage to their list, which will not happen for most of the library
for a long time. The reading view planned for next session (scope 6.6, "any passage in full") would
have had a title and nothing to read underneath it.

**Options considered.**
1. **Add `text` to `passages`** (chosen). One column, filled at ingestion, ready for the reading view.
2. **Fill `passage_segments` at ingestion too**, against this session's own instructions, and read the
   full text back by joining segments in order. Rejected: it reuses a table built for a different job
   (memorising, not reading) and blurs a separation scope 8.4 draws on purpose.

**Reversible.** Cheap now: no tester has any data yet, so there is nothing to migrate. `db.ts` needed
no change at all, because Dexie only indexes columns it is told to query, and `text` is not one of
them (see the comment at the top of `db.ts`).

**What this means for you.** Nothing you can see yet; there is no reading screen until next session.
It means that screen can actually show a prayer in full the day it is built, instead of session 4
hitting the same wall and asking the same question.

---

### D3.2 — Two build-time tools were added for the font script

**Decision.** Two packages, both used only by `scripts/fetch-fonts.ts` and never shipped to the app.

**`subset-font`**, which cuts a font down to only the characters it needs. It runs a real font-shaping
engine (the same one browsers use) compiled to run on a laptop, rather than a hand-rolled
approximation, which matters because a subsetting bug looks like a missing letter on a phone.

**`@types/subset-font`**, its type descriptions, so the script is checked by `tsc` like everything
else rather than trusted blindly.

**Reversible.** Yes, easily. Neither reaches the app; both could be swapped for another subsetting
tool without touching anything outside `scripts/fetch-fonts.ts`.

**What this means for you.** Nothing you can see. The two font files in the repository are what came
out of this tool; nothing about how the app looks depends on the tool itself.

---

### D3.3 — Corpus record ids are repeatable, not random

**Decision.** A passage's `id` is derived from its source feed and its id on that feed (a
"version 5 UUID", a standard way of turning a name into an id that always comes out the same for the
same name). Re-running the fetch script produces the exact same id for the exact same prayer every
time.

**Why it came up.** Scope 4.2 says re-fetching must be idempotent (a word meaning "running it twice
has the same effect as running it once") so a corrected translation replaces the old text rather than
sitting beside it. `src/data/ids.ts` already generates ids, but randomly, which is right for something
a person creates on their phone (two people cannot collide) and wrong for the corpus (there is one
source of truth, and it should always produce the same id).

**What this means for you.** If bahaiprayers.net corrects a translation and the fetch script is
re-run, the corrected prayer overwrites the same row everywhere: in the committed file, which shows a
small, readable change instead of the whole file's ids shifting, and on a returning tester's phone,
which gets the correction rather than a duplicate.

---

### D3.4 — The prayers feed embeds non-devotional lines inside the prayer text, and they are stripped

**Decision.** About 130 of the 473 prayers carry a line the source has written directly into the
prayer text rather than as a separate field: a work's name ("Fire Tablet"), who it is for ("For
Women"), when to recite it, or, on the Tablet of Ahmad alone, a title and a quoted note about the
prayer's significance. Normalisation recognises these (they always start with `#` or `*`) and removes
them before anything else runs, so they never appear in the stored text, the first line, the title, or
the word count.

**Why it matters.** Left in, "##For Women" would have opened a prayer's text on a tester's phone, and
"##Tablet of Visitation" would have become that prayer's title. Both read as a bug rather than as
part of the prayer, because neither is.

**What was not kept.** A few of these lines genuinely name the work a prayer is drawn from (the Fire
Tablet, the Tablet of Aḥmad), which is exactly what `source_work` is for. Session 3 did not attempt to
tell those apart from the audience notes and recitation instructions automatically, because guessing
wrong would put an instruction where a work's name should be. `source_work` is `null` for every prayer
in the prayers feed for now (see D3.7). This is named again in the session's open questions.

**Reversible.** Yes. It is a rule in `scripts/lib/textCleaning.ts`, tested against the real records
that carry it (`normalise.test.ts`). Changing which lines are kept or discarded is changing the rule
and re-running the fetch script.

**What this means for you.** Every prayer reads as a prayer, with no stray editorial line breaking the
flow. What it does not yet do is tell you which tablet a prayer came from, beyond "Bahá'í Prayers".

---

### D3.5 — The prayers feed's author is a number with no name attached, decoded from what the data itself proves

**Decision.** Every prayer in the prayers feed carries an `AuthorId` — 1, 2 or 3 — and the feed never
says whose number is whose. Session 3 worked it out from the data itself rather than guessing:
`AuthorId 1` carries "Is there any Remover of difficulties", a well-known prayer of the Báb;
`AuthorId 2` carries "Blessed is the spot", a well-known prayer of Bahá'u'lláh, and every prayer the
feed itself tags "Additional Prayers Revealed by Bahá'u'lláh" also carries `AuthorId 2`; every prayer
tagged "Additional Prayers Revealed by 'Abdu'l-Bahá" carries `AuthorId 3`. The three numbers map onto
the three Central Figures of the Faith, which is also the only set of authors a devotional prayer
compilation like this one would draw from.

**Why this matters more than an ordinary default.** Principle 7.10 requires correct attribution
always. A wrong guess here would not be a cosmetic bug; it would put someone's name on words that are
not theirs, on every one of the hundreds of prayers that number carries. Because of that, the code
throws rather than silently attributing a fourth number, should one ever appear (`normalise.ts`,
tested).

**Reversible.** Yes, if wrong: it is one lookup table, and every prayer would need to be re-fetched
and re-checked. It is written down here so the reasoning survives even though the API gives no way to
verify it from itself alone.

**What this means for you.** Every prayer already carries the right one of the three names. The
Hidden Words, Gleanings, and Prayers and Meditations feeds needed no such decoding: they are
single-author works of Bahá'u'lláh by definition, and carry no `AuthorId` field at all.

---

### D3.6 — The self-hosted fonts cover more characters than design-tokens 8.1 lists, because the document's list was incomplete

**Decision.** Design-tokens 8.1 names a specific set of diacritics to subset the fonts to: á, í, ú,
ḥ, Ḥ, ṭ, Ṭ, ṣ, ẓ, and an apostrophe. Checked against the real, fetched corpus text, that list turns
out to be missing four things the corpus actually contains: capital Á and Í, capital Ṣ, and ḍ (none
of which the document lists — it lists the lower-case form of some of these and not others), plus
ordinary typographic punctuation an en dash, an em dash, curly quotation marks, and an ellipsis that
"Latin" implies without spelling out. `scripts/fetch-fonts.ts` subsets to the union of the document's
list and whatever characters the committed corpus is found to contain when the script runs, rather
than the document's list alone.

**Why it matters.** A font subset to exactly the document's list would have no glyph for a capital Á
or a curly apostrophe. Since "Bahá'u'lláh" is written with a curly apostrophe throughout the real
corpus text, not a straight one, that single gap would have sent a large fraction of the corpus's
words to the fallback system serif, one character at a time — the precise failure design-tokens 8.4's
own test (`fonts.test.ts`) exists to catch for a whole missing file, just quieter, because only a
character disappears rather than a whole word.

**Reversible.** Yes, and self-correcting: because the subset is computed from the committed corpus
rather than copied from the document, a future re-fetch that introduces a new character re-subsets to
cover it automatically, without anyone having to notice and update a list by hand.

**What this means for you.** Nothing you can see: this is exactly the failure that does not happen.
Every apostrophe, dash and accented capital in the real corpus renders in Italiana or Cormorant rather
than falling back to the phone's system font for that one letter.

---

### D3.7 — Contained decisions

- **`LengthBand` gained a fourth value, `'extended'`.** Scope 6.2 defines four length bands (Short,
  Medium, Long, Extended); the type only had three, from session 2. Widened to match the scope, since
  nothing indexes on its exact value set. Changes nothing about how the app behaves yet — length bands
  "no longer lead anywhere" per scope 6.2 until a future filter uses them.
- **A passage's `length_band` is estimated from its sentence count, not its word count.** Scope 6.2
  defines the bands in segments, and segmentation itself does not run until a user adds a passage
  (scope 8.4), so ingestion estimates how many segments a passage would likely become by counting its
  sentences. This is why "Blessed is the spot" (51 words, ten poetic lines, one sentence) bands as
  Short: it is genuinely one unbroken sentence, however long.
- **`collection` is the same value as `source_feed`** for every passage from the four content feeds:
  `prayers`, `hidden-words`, `gleanings`, `prayers-and-meditations`. The simplest mapping, and the one
  `src/data/fixtures.ts` already assumed.
- **`translator` is `null` for every V0 passage, confirmed by Safa, 25 August 2026.** The API supplies
  no translator field anywhere, and he does not want translator credit to be user-facing or
  app-facing for now regardless. Recorded in the database, in case it is wanted later, but nothing
  reads it.
- **`source_work` is the tablet's own name for the 21 prayers D3.8 names, and `null` for every other
  prayer in the feed.** The book's name for the other three feeds
  (`"The Hidden Words"`, `"Gleanings from the Writings of Bahá'u'lláh"`, `"Prayers and Meditations"`).
- **A title longer than eight words is cut at the eighth with an ellipsis**, the same convention a
  printed prayer-book index uses for a long opening line. `display_title` is the title unchanged. No
  authored line break exists in the source data to give it one (design-tokens 8.2); see open questions.
- **`search_vector` is the title, the full text and the author, lowercased and joined.** Search itself
  is `[v1.0]` (scope 6.3); this is a placeholder good enough to search against later without
  re-ingesting the corpus, not a real search index.

---

### D3.8 — 21 prayers are named tablets, and get their own name and a "Special Tablets" category

**Decision, requested by Safa, 25 August 2026.** 21 prayers in the prayers feed are themselves
well-known, individually named tablets — the Tablet of Aḥmad, the Fire Tablet, the Tablet of
Visitation, and 18 others — rather than ordinary prayers. Each now carries its tablet's own name as
its `title` and its `source_work`, in place of an opening line, and all 21 are linked to a new tag,
"Special Tablets", that exists only in this app rather than being one of the feed's own topic tags.

**How the 21 were found.** Not guessed: read from the same embedded editorial lines D3.4 already
strips out of the prayer text, which turn out to also carry each tablet's name — sometimes its
English name alone ("Fire Tablet"), sometimes both its English and its original Arabic or Persian
name ("Tablet of the Branch" beside "Súriy-i-Ghusn"). English is kept. Cross-checked where possible
against the feed's own topic tags: the Tablet of Aḥmad, the Fire Tablet, the Tablet of the Holy
Mariner, the Tablet(s) of Visitation and the Epistle to the Son of the Wolf already carry a
matching tag of their own in the feed, which the new "Special Tablets" tag sits alongside rather
than replaces. The other 16 have no tag of their own in the feed — Bahá'í Prayers files them only
under the occasion each was revealed for (Ascension of Bahá'u'lláh, Ridván, Martyrdom of the Báb,
Declaration of the Báb) — so "Special Tablets" is the only place the app gathers them together.

**What was deliberately left out.** The three Obligatory Prayers (Long, Medium, Short) are each
individually named in the feed's own tags too, but Safa's examples were specifically tablets, and an
Obligatory Prayer is a different kind of thing in Bahá'í practice, not a tablet. Left as ordinary
prayers for now; see the session's open questions if a category for these is wanted as well. The
"Tablets of the Divine Plan" prayers were also left out, because that set already has its own
functioning topic tag from the feed and gains nothing from a second one.

**Reversible.** Yes. `NAMED_TABLETS` in `scripts/lib/normalise.ts` is one table mapping a prayer's feed
id to its tablet name; adding, removing or renaming an entry and re-running the fetch script is the
whole change.

**What this means for you.** Discover's category list, once session 4 builds it, will show a "Special
Tablets" category holding all 21, and each of those 21 will read by its own name in every list rather
than by its opening words.

---

### D3.9 — A passage's opening reaches past a bare invocation, so titles are more distinctive

**Decision, requested by Safa, 25 August 2026.** `first_line` (and the title built from it) no longer
stops at the passage's first sentence, full stop. It keeps gathering whole sentences until it has at
least eight words, the same width a title is truncated to, so a short opening like "He is God." or "O
Lord!" is extended into the sentence that follows rather than left to stand alone as the entire title.

**Why it came up.** About an eighth of the prayers feed opens with a bare, repeated invocation before
the prayer proper. Left as the whole title, dozens of rows in a future browse list would have read "He
is God." with nothing to tell them apart (named as an open question at the end of the session's first
pass; Safa asked for the fix rather than leaving it).

**What was not done.** No attempt to detect and specifically skip "the invocation" as its own category
of sentence — a rule like that is fragile (which sentences count as an invocation is a judgement call)
and unnecessary, because gathering by word count until the title's own width is reached already solves
it: a two-word first sentence is never distinctive enough to reach the eight-word floor on its own, so
it always pulls in more.

**Reversible.** Yes, one number (`TITLE_WORDS` in `scripts/lib/textCleaning.ts`) and a re-run of the
fetch script.

**What this means for you.** "O Lord! Bless this family and grant it…" instead of "O Lord!". Nothing
changes for a prayer whose first sentence was already long enough on its own, such as "Blessed is the
spot" or "Is there any Remover of difficulties save God?".

---

### D3.10 — The three Obligatory Prayers get their own name and category too

**Decision, requested by Safa, 25 August 2026.** The same treatment as D3.8, for the three daily
Obligatory Prayers: each now carries its own name — "Short Obligatory Prayer", "Medium Obligatory
Prayer", "Long Obligatory Prayer" — as its `title` and `source_work`, and all three are linked to a
new "Obligatory Prayers" tag, a category of its own, separate from "Special Tablets".

**One small correction made along the way.** The embedded marker for the Short Obligatory Prayer
reads "Short obligatory prayer", inconsistently cased against the other two. The feed's own topic tag
for all three is correctly and consistently cased, so the tag's name is used as the title rather than
the embedded marker's.

**Reversible.** Yes, the same way as D3.8: `NAMED_OBLIGATORY_PRAYERS` in `scripts/lib/normalise.ts`.

**What this means for you.** A second clickable category next to "Special Tablets" once session 4
builds category browse, holding these three.

---

## D4 — Session 4, Discover: category browse, passage list, reading view

---

### D4.1 — More than half the library cannot be reached in V0, because the tag feed only tags prayers

**A contradiction the build found in the scope, not a decision taken freely.** Recorded here so the
next session does not rediscover it, and named in this session's open questions because it is Safa's
to resolve.

**What was found.** The corpus holds 976 passages. 503 of them carry no topic tag at all: every one
of the 153 Hidden Words, the 166 Gleanings and the 184 Prayers and Meditations. The tag feed at
bahaiprayers.net tags the prayers feed and nothing else. Category browse is built on those tags, so
it reaches the 473 prayers and no more.

**Why this matters.** Scope 6.1 says "V0 ships category browse only" and calls it "the single axis
that makes the library usable for the devotional case". That reasoning holds for prayers and does not
hold for the rest: browse by collection, which is the axis that would reach The Hidden Words and
Gleanings, is tagged `[v1.0]` in the same table. So in V0, a tester can read any of 473 prayers and
cannot reach a single Hidden Word except by knowing its address.

**What was built instead.** Exactly what scope 6.1 specifies, unchanged. CLAUDE.md is explicit that
`[v1.0]` content is read for context and not built, and adding four collection rows to the category
list would have been building it. The three untagged collections are loaded, stored, and openable by
their address; nothing in the interface leads to them.

**Reversible.** Cheaply, in either direction. Making collections browsable is one more list on the
screen that already exists and reads through `listDevotionalPassagesByCollection`, which is already
written and already excludes Ruhi material. About half a session, whenever you want it.

**What this means for you.** If you open the app today and go looking for a Hidden Word, you will not
find one. Everything else works: 473 prayers, 63 categories, all of it readable and bookmarkable. The
question of whether V0 should reach the other 503 is in this session's open questions.

---

### D4.2 — Discover commits a passage to the list through a door that hands nothing back

**Decision.** Adding a passage to the list from the reading view calls a new function,
`addPassageToList`, in `src/data/passages.ts`, rather than `addToList` in `src/data/userPrayers.ts`
where the writing actually happens. It returns nothing.

**Why it came up.** Scope 6.6 puts "add to my list" in the reading view's toolbar, so Discover has to
be able to make that commitment. But the function that makes it returns the row it just wrote, and
that row carries the passage's due date, its upkeep state and its focus flag. Both walls around
Discover, the lint rule and the test, refuse that module and refuse that name, and they are right to:
a screen holding the row could render every piece of chrome principle 7.6 exists to keep out of the
library.

**Options considered.**
1. **A function in the module Discover already reads from, returning nothing** (chosen). The
   commitment crosses the boundary; the progress does not, because there is nothing to cross with.
2. **Let Discover import `userPrayers` and trust it not to render the row.** Rejected. That is
   exactly the trust the two walls were built to replace, and it would have meant switching off a
   lint rule and deleting a test to get a green build.
3. **Route the write through the Memorise side.** Rejected as ceremony: a second module doing nothing
   but forwarding the same two arguments.

This is the same reasoning that already made `isOnList` return a boolean instead of a row, so it sits
next to it in the same file, under the same comment.

**Reversible.** Yes, trivially. It is four lines.

**What this means for you.** Nothing you can see. It is the reason the reading view can never grow a
"due in 3 days" line by accident.

---

### D4.3 — "Add to my list" is one way from the reading view

**Decision, defaulted rather than asked, and the one most likely to be overturned.** Bookmarking
toggles: tap to keep a place, tap again to let it go. Adding to the list does not. Once a passage is
added, the button reads as already added and stops responding.

**Why.** Removing a passage from the list is not the opposite of adding it. `removeFromList` deletes
the row and, with it, every segment's progress and the whole review history for that passage — which
is correct, because leaving them behind would resurrect a half-learnt state if the passage were ever
re-added. But that makes removal a destructive act, and putting it one mis-tap away from a reading
screen means a moment's fumble can throw away three weeks of work with no warning and no undo.

**Options considered.**
1. **One way from here, removable from the list itself** (chosen). The commitment is easy, undoing it
   happens where you can see what you are undoing.
2. **A toggle, like bookmark.** Simpler and symmetrical, and it puts a destructive action on a
   surface whose whole purpose is reading.
3. **A toggle with a confirmation.** Rejected for V0: a confirmation dialogue on a devotional screen
   is exactly the study-app furniture principle 7.6 is written against.

Principle 7.6's own wording supports this: "a passage already on your list shows nothing in the
reading view except that the add button reads as already added". It describes a state, not a control.

**Reversible.** Yes, easily, and worth revisiting once the list screen exists in session 6 and you
can see both halves.

**What this means for you.** Tapping the list mark on a prayer you have already added does nothing
and shows a tick. To take something off your list you will go to the list, which does not exist yet.
If you would rather it toggled here, say so and it is a small change.

---

### D4.4 — The reading view's toolbar carries two marks where design-tokens describes one

**Decision.** Design-tokens 5.1's compact header has "an optional 17px trailing icon", singular.
Scope 6.6 requires two: "Different icons, both one tap, neither nested in a menu. They are different
intents and conflating them makes both worse." The header carries two.

CLAUDE.md section 2 settles it: the scope owns behaviour, the tokens document owns appearance, and
where they conflict the scope wins. Every measurement the tokens table gives is kept — 46px 22px 15px
padding, 17px marks, the same gold.

**One measurement was added rather than changed.** Each mark sits in a 44px touch target, because
design-tokens 5.3 sets 44px as the production minimum and calls the reference's 43px "a bug in the
reference, not a spec". A bare 17px mark would have been a far smaller target than that on the two
actions the scope insists are one tap. The marks still land 22px from the edge; the target simply
extends past them.

**Reversible.** Yes.

**What this means for you.** Two small gold marks at the top right of a prayer: a ribbon to keep the
place, and lines with a plus to add it to your list.

---

### D4.5 — The two new marks, drawn from the product rather than from an icon set

**Decision.** Design-tokens 8.3 defines six drawings for the whole app and neither a bookmark nor an
add-to-list mark is among them, so two were drawn, in the same idiom as the tab icons and as open to
being redrawn as those were (D2.10).

- **Bookmark** is a ribbon marker, notched at the foot: the thing you actually put in a prayer book.
- **Add to my list** is the Memorise tab's three ascending rules, which are cumulative line building
  (scope 8.1), with a mark beside them. A plus before adding, a tick after.

**Deliberately not used: the nine-pointed star.** It is the obvious mark for "saved", and
design-tokens 4 reserves it for the freshness state and bans it from the reading view by name. A star
here would have read as a rating and breached principle 7.6 by looking like it, without importing a
single thing.

**State is carried by colour and by the mark, never by a fill**, because design-tokens 8.3's drawing
rules permit no fills. An unset mark is `on-field-66`, a set one is gold.

**Reversible.** Yes. Two small files, and nothing depends on which shapes they are.

**What this means for you.** Two marks you have not approved. They are in the screenshots; say if
either is wrong and they are quick to redraw.

---

### D4.6 — The drop cap's defined fallback is no drop cap

**Decision.** Design-tokens 8.2 asked for one: "The drop cap takes the first character of the
passage. Corpus text may open with a quotation mark, a diacritic, or a non-Latin character. The drop
cap logic needs a defined fallback." It is this: if the passage does not open with a letter, it is
set without a drop cap and simply begins at reading size.

**Options considered.**
1. **No drop cap** (chosen). Loses an ornament, never mangles anything.
2. **Set the punctuation as the cap.** A 64px opening quotation mark floated into the margin reads as
   a mistake rather than as an ornament.
3. **Skip the punctuation and cap the letter after it.** Rejected outright: it silently moves a
   character of the text, and moving characters of sacred text to make a layout work is not a trade
   this app gets to make.

**A letter carrying a diacritic is a letter** and gets a cap like any other. `Ḥ` comes through whole,
including when the accent is stored as a separate mark after the letter, which a naive first-character
slice would have split down the middle.

**Reversible.** Yes, and it is one small tested function.

**What this means for you.** Nothing you will see today: all 976 passages open with a plain capital,
and every one of them has a drop cap. This is the answer for the personal library at v1.0 and for
whatever a later feed contains.

---

### D4.7 — The subset font was widened three times, each for a mark the app draws rather than quotes

**Decision.** `scripts/lib/fontCharset.ts` gained three groups of characters and the font script was
re-run. Nothing was hand-edited; the two font files in the repository are what came out.

**Why it came up.** The subset is cut from the characters the committed corpus actually contains,
which is exactly right for text and silently wrong for anything the interface writes on top of it. A
test that put the app's own output through the same charset found three:

- **The uppercase forms of every accented letter.** The caps slot renders an author or a work's name
  in capitals, and those are data, so the app folds the case at render time. "Súrih of the Pen"
  becomes "SÚRIH OF THE PEN", and Ú appears nowhere in the corpus in that case.
- **The middle dot and the copyright sign.** The dot separates every attribution on every row and in
  every reading view, and the copyright sign opens the notice principle 7.10 requires. Neither is in
  any prayer.
- **The fleuron**, the ornament that closes every reading view. Cormorant draws it, so it is now set
  in the same face as the text above it rather than in whatever the phone has.

Every one of these would have fallen back to the system serif on the most-repeated characters in the
app. This is decision D3.6's bug again, one step further on, which is why the check is now a test
(`src/strings/attribution.test.ts`) rather than an observation: every character the app can produce
must have a glyph in the subset.

**Cost.** The two font files grew by 700 bytes together.

**Reversible.** Yes, by changing the script and re-running it, which is the only way either file is
ever allowed to change (CLAUDE.md rule 12).

**What this means for you.** Small marks on the reading screen — the dot between the author and the
work, the copyright symbol, the little flower — are now drawn in the app's own typeface instead of
the phone's default, which on some Android phones would have been a blank box.

---

### D4.8 — Contained decisions

- **The shell stopped scrolling and each screen started.** Design-tokens 5.1 and 5.4 want a fixed
  header with the body scrolling beneath it, and a header inside a scrolling box scrolls with it. The
  three existing screens were wrapped in the same `Screen` component so none of them clips the day it
  holds more than a screenful. Nothing looks different today.
- **The library's eyebrow is the app's own name, "BY HEART".** Design-tokens 5.1's tall header has an
  eyebrow above the title and the scope names no text for it. The app's name on its opening screen is
  a masthead, and it invents no vocabulary. Easy to change.
- **The reading view's fixed header names the collection**, in capitals, from a four-entry list in
  the strings module: PRAYERS, THE HIDDEN WORDS, GLEANINGS, PRAYERS AND MEDITATIONS. It is the only
  thing on screen that still says what you are reading once you have scrolled past the title. The
  reading surface's own eyebrow names the kind of text instead: PRAYER, HIDDEN WORD, GLEANING.
- **The byline under a title is the author's name alone.** The reference design read "Revealed by
  Bahá'u'lláh". "Revealed by" is correct for Bahá'u'lláh and the Báb and is not the word Bahá'ís use
  of 'Abdu'l-Bahá's prayers, and the byline is generated from a column rather than written per
  passage. The name alone is always right. On the open questions list.
- **Case is folded in JavaScript, not in CSS.** Design-tokens 2.3 bans `text-transform` because
  tracking on transformed text renders inconsistently and screen readers announce it differently. An
  author's name cannot be a literal, so real capitals are produced before the text reaches the page.
  D4.7 is the other half of that bargain.
- **A passage row shows the author and the word count, and not the work.** Scope 6.2 asks for title,
  author and word count. A screen of Hidden Words repeating "THE HIDDEN WORDS" 153 times down one
  column tells a reader nothing; the work is one tap away in the reading view, where the full
  attribution is.
- **A category that carries no passage is not offered.** Nothing in the corpus is in that state. It
  would take a later feed tagging only Ruhi material.
- **The back chevron goes back one step, not up one level.** A reader who reaches a passage from a
  category expects that category back, and when search and browse-by-author arrive they will expect
  those. A passage opened cold — a reload, a shared link — has nothing behind it, so it falls back to
  the library rather than stepping out of the app.
- **The first-run corpus load is shared.** The app starts loading the library beside the first render,
  and Discover waits on the same promise rather than starting a second load and reading an empty
  table before the first has finished.
- **The Discover component test lives in `src/app/`, not in the Discover folder.** It reads the
  database directly, to prove that adding a passage really wrote a row and really did not segment
  anything. Both walls forbid that import inside the folder and both are right to. A test driving the
  app from outside is not part of the folder, so it sits beside the existing shell test.

---

## D4 follow-up — after Safa's first read of session 4 (v0.4.1)

---

### D4.9 — Browse by collection moves into V0, as the library's first screen

**Decision, taken by Safa, 25 August 2026, in answer to the open question in D4.1.** Scope 6.1 tags
"By collection" `[v1.0]`. It ships in V0 instead, and it is not four extra rows at the foot of the
category list: it is the level above.

```
Discover
  Prayers                  →  63 categories  →  passages  →  the passage
  The Hidden Words         →  passages       →  the passage
  Gleanings                →  passages       →  the passage
  Prayers and Meditations  →  passages       →  the passage
```

**Why a level above rather than a list beside.** Every one of the 63 categories belongs to a prayer.
"Healing" is a way of finding a prayer; it is not a way of finding a Hidden Word and never was. Put
beside the collections, the two axes would have looked like alternatives and one of them would have
been quietly lying about its reach. Put above, the shape says what is true: a contents page, then an
index within the part of the book that has one.

**One screen, decided by the data.** The obvious build is "Prayers has categories, the other three do
not". True today, and true by accident: it is a fact about what bahaiprayers.net has tagged, not
about what a collection is. So a collection's screen asks what categories it has and shows passages
when the answer is none. If the Gleanings are ever tagged, they gain a category level and no code
changes. If the tag feed is withdrawn, Prayers falls back to a list of 473 and stays usable.

**The category is carried in the path**, `/discover/collection/prayers/category/…`, and its passages
are filtered to that collection. Today that filter changes nothing, because every tagged passage is a
prayer. It is there so the hierarchy is true rather than accidentally true.

**Reversible, and this is the question Safa asked.** Yes, easily, and it is a screen-shape change
rather than a data one. The passage list and the reading view are untouched by it; what changes is
what the first screen lists and that there is one more tap to a prayer. Rearranging it after looking
at it - collections and categories side by side, categories promoted back to the top, a different
order - is an hour, at any point, with nothing to migrate.

**What this means for you.** Every one of the 976 passages can now be reached. The library opens on
four names instead of 63, and the 63 sit one tap inside Prayers.

---

### D4.10 — Adding to the list is confirmed where it happened, with a way back

**Decision, taken by Safa, 25 August 2026**, replacing the default recorded in D4.3.

D4.3 made adding one way from the reading view, because removal also destroys everything learnt of a
passage and that should not sit one mis-tap from a devotional screen. The objection to it was the
right one: a mis-tap then had no remedy at all until a list screen exists.

**Both actions now say what they did**, in a band across the foot of the screen. **Adding carries an
undo** for as long as the band is there. **Bookmarking does not**, because the mark that set it is
44px away and toggles, and an Undo doing exactly what the button above it does is clutter.

**Why an undo window is safe where a permanent remove control is not.** A passage added seconds ago
has nothing learnt of it to lose. The window closes; the destructive version of this - taking a
passage off the list after three weeks of work - stays where it belongs, on the list screen, where a
person can see what they are giving up. So the mark itself is still one way.

**Six seconds for the undo, three for a plain confirmation.** Long enough to notice and reach, short
enough not to sit on a prayer.

**Drawn as a printed band**, not a floating card: `field` navy with the cloth grain, full width, no
radius and no shadow, sitting on top of the tab bar rather than over the text, so it never covers the
last line of a passage. Motion is opacity and position only, 160ms (design-tokens 3 and 6).

**Reversible.** Yes. The durations are two constants and the band is one small component, which
session 5's confirm screen and session 6's list will both reuse.

**What this means for you.** Tap the list mark and a navy band says "Added to your list" with "Undo"
beside it. Tap Undo and it is off again, with nothing left behind. Bookmarking says "Bookmarked" and
goes away by itself.

---

### D4.11 — Contained decisions

- **The byline stays the author's name alone**, confirmed by Safa: "Bahá'u'lláh", "The Báb",
  "'Abdu'l-Bahá", with no "Revealed by" before it. The open question from D4.8 is closed.
- **Two title collisions in the corpus are accepted.** Two prayers under Healing both open "Glory be
  to Thee, O Lord my God!" and are told apart on the row only by their word counts. Confirmed by
  Safa as good enough for now.
- **`Screen` gained a footer.** A band below the scrolling body and above the tab bar, holding the
  toast today and session 5's pinned buttons (design-tokens 5.5) next. A sibling of the body rather
  than a layer over it, so nothing it shows can cover the last line of a prayer.
- **`DEVOTIONAL_COLLECTIONS` is written out rather than read off the database**, because the order is
  editorial and `SELECT DISTINCT` would return it alphabetically. A test checks it against the
  committed corpus, so a fifth feed fails a test rather than quietly becoming unreachable.
- **A test that triggers a write now waits for the write before it ends, and assertions about a
  user's rows are scoped to that user.** An intermittent failure turned out to be a previous test's
  fire-and-forget write landing in the next test's freshly reset database, under the previous test's
  discarded device id: the app was correct and the assertion was counting rows across all devices.
  `user_id` on every row from the first migration (scope 13.1) is what made the fix a one-line filter.

---
