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

### D4.12 — Scope revised to v4.3 by Claude, on Safa's instruction

**Decision.** CLAUDE.md section 2 says "Never edit `/docs/scope.md`" and "Safa issues scope
revisions." This is the second time that has been lifted, and like the first (D1.11) it is **a
one-off, not a standing change.** The rule is unchanged and still binds every future session: a
session that finds a contradiction logs it here and stops.

**Why the scope had to change rather than only this file.** Two of the things Safa decided on
25 August 2026 are things the scope owns and future sessions read it for. Section 6.1 still tagged
browse by collection `[v1.0]`, which would have told a later session not to build something already
built. And CLAUDE.md section 5 tells every session to take the next session's goal "from the build
sequence table in scope section 16", so a table that did not contain the new session would have
un-decided it at the next handoff.

**What was changed.** Only what Safa decided, plus the consistency edits those forced. Browse by
collection moved from `[v1.0]` into V0 and above category rather than beside it (6.1, 14, 18.28).
Bookmarks given a described behaviour, with the ordering rule applied to the list as well (new 6.7,
6.5, 14, 18.29). `sort_order` added to `bookmarks` (10, 18.30). One build session added, making
sessions 7 to 9 into 8 to 10 and Ruhi session 11 (16, 18.31). The paragraph "V0 ships category
browse only" deleted, being no longer true. CLAUDE.md's pointer updated from v4.2 to v4.3.

**Nothing left V0.** Two things entered it.

**Reversible.** Yes. It is one commit.

**What this means for you.** The scope now says what you decided, so session 7 builds the bookmarks
screen from the scope rather than from this conversation, which it will not have. The rule you
should know I bent, and bent only because you asked for these to be documented, is that I edited
the scope at all. It goes back to being yours alone from here.

---

### D4.13 — `sort_order` is written from the first bookmark, and read by nothing yet

**Decision.** The column Safa approved exists now, in `types.ts`, in the Dexie schema, and filled by
`addBookmark`, although the screen that lets anyone drag a bookmark is session 7.

**Why now rather than then.** Scope 10's own rule: "Tables and columns are used exactly as named
here, **from the first migration**, including in the V0 Dexie schema." Session 2 followed it to the
letter, declaring four empty Ruhi tables and half a dozen unused columns for the same reason. A
column that starts being written in session 7 has a gap in it exactly where the earliest bookmarks
are, and the person with the earliest bookmarks is Safa.

**A new bookmark goes to the end of the order**, so keeping a place never moves anything already
arranged. Removing one leaves a gap in the numbering, deliberately: the order is read by sorting,
not by counting, and a renumber racing a drag on the same screen is a real bug where a gap is not.

**There is now a schema version 2, and that is the interesting part.** Amending version 1 in place
would have been simpler and quietly wrong. A browser holding a version 1 database never re-reads the
schema for a version it already has, so the new index would have silently not existed there while
existing perfectly on a fresh install - a bug that reproduces on nobody's machine but the one that
matters. Version 2 is correct for both, and its upgrade gives every bookmark already saved a place
in the order, oldest first.

**Reversible.** The column, yes. The version bump, not usefully: version 2 is now the shape any
existing database is in.

**What this means for you.** Nothing you can see. Bookmarks you make from today already know what
order you made them in, so when session 7 gives you the screen, the bookmarks you already have will
be in it and in a sensible order rather than arriving unordered.

---

### D4.14 — The model and effort line is a requirement of the handoff, not a habit of it

**Raised by Safa, 25 August 2026**, after session 4's handoff gave him a prompt with no model or
effort on it.

**What went wrong.** `/docs/session-prompt-template.md` has carried
`Recommended: <Sonnet|Opus> / <Normal|High|Max> effort` as the first line of the template since
session 0, and scope section 16's build sequence table has carried a Model and an Effort column for
every session. Both were read. The line was dropped anyway, because CLAUDE.md section 5, which is
the file actually in front of an agent while it writes the handoff, listed seven requirements for
the next session's prompt and this was not among them. The template is read once, when writing the
prompt; CLAUDE.md is read at the start of every session.

**Why it matters more than a missing line.** It is the first thing Safa acts on, before he has read
a word of the prompt, and it is the one part of it he cannot supply himself: the build sequence
table is in the repository, not in front of him. A prompt without it stops the session before it
starts and costs a round trip.

**The fix, in the file that is always loaded.** CLAUDE.md section 5, handoff item 3, now opens with
it and says a prompt without it is to be reissued rather than explained. The template's own
paragraph on model and effort now says the same thing and names the session it was dropped in, so
the reason survives the next person who wonders why it is stated three times.

**This is a change to the build contract rather than to the scope**, made on Safa's explicit
instruction ("make sure each session gives me that information with the prompt"). One `git revert`
away if unwanted.

**What this means for you.** Every prompt from here opens with the model and effort to switch to.
Session 5 is Opus at Max effort.

---

## D5 — Session 5, segmentation: suggested then confirmed, at add time

---

### D5.1 — The screen that confirms the lines is a Memorise screen, and the list mark is a door to it

**Decision.** Tapping "add to my list" in the reading view no longer adds anything. It opens a new
screen, at `/memorise/add/<passage>`, which shows the lines the app proposes to break the passage
into. Nothing is on the list until that screen is confirmed. While it is open, the Memorise tab is
the lit one.

**Why it came up.** Scope 8.4 runs segmentation "at the moment a user adds a passage to their list",
and the session had to decide where that moment lives. Principle 7.6 forbids memorisation anywhere in
Discover, and a screen full of the lines a quiz will ask for is memorisation by any reading of it.

**Options considered.**

1. **A screen on the Memorise side, reached from the reading view** (chosen). The reader crosses over
   deliberately, and the tab bar says so. The reading view keeps its two marks and gains no furniture.
2. **A screen inside Discover.** It would have needed the walls around that folder switched off, or a
   second write path built around them, and it would have put the first screen of memorising
   something inside the prayer book.
3. **A panel sliding over the prayer.** Rejected: it covers the text being committed to, at the exact
   moment a person is deciding whether to commit to it.

**What happens to the undo.** The band of decision D4.10 still appears, but on the reading view when
you come back from confirming, rather than at the tap. It says "Added to your list" with Undo beside
it, for six seconds, and Undo now takes the lines away as well as the row (D5.4).

**Reversible.** The screen could move without changing anything it does: the whole crossing is one
path and one route. What would be expensive to reverse is the decision that nothing is written until
the lines are confirmed, because session 6's queue is about to be written against that.

**What this means for you.** Tapping the lines-and-plus mark on a prayer no longer adds it on the
spot. It opens a screen showing the prayer broken into the lines you would learn it in, with the
number of lines and the number of words above them, a way to join two lines together or split one in
half, and one button at the foot: ADD TO MY LIST. Going back instead adds nothing.

---

### D5.2 — Where the app proposes a break, and where it only offers one

**Decision.** The splitter finds five kinds of break and proposes three of them.

| Kind | Where | Proposed |
|---|---|---|
| Paragraph | a blank line | yes |
| Line | a single line ending, which is how the corpus sets verse | yes |
| Sentence | a full stop, question mark, exclamation mark or ellipsis, then a capital letter | yes |
| Clause | a colon or a semicolon | no, offered on Split |
| Phrase | a comma | no, offered on Split |

Scope 8.4 asks for "sentence and line boundaries", which is the top three. The bottom two are found
but never proposed, and exist so that the Split control always has somewhere to cut.

**Why the weaker two are there at all.** A single sentence of the Gleanings runs to fifty words and
fills a phone screen; the longest in the corpus is 255 words. Without the comma, the first line of
the very first Gleaning tried on screen had no way to be split at all, and it is far too long to
learn as a line. The app still never proposes those cuts, because a comma is not where a sentence
ends.

**Why a capital letter decides whether a full stop is a full stop.** The corpus contains 35 places
where a mark is followed by a lower-case word: "Alas! for the poor", "and lo! they have turned away".
Breaking on every mark would cut all 35 sentences in half. Requiring a capital after the mark tells
them apart, and needs no list of abbreviations, because the corpus was checked and contains none.

**The invariant the tests are written against.** Every break remembers the exact whitespace that was
there, so the lines rejoined are the passage again, character for character. All 976 committed
passages are put through that check. Where a break falls is a matter of taste and you can fix it on
the screen; a character lost between two lines would be sacred text altered by a regular expression,
and nothing on screen would ever show it had happened.

**Reversible.** Yes, and cheaply, for anything already added: the lines live in their own table and
are rewritten whenever a passage is confirmed again.

**What this means for you.** A prayer set as verse breaks a line per line. A prose passage breaks a
line per sentence. Colons, semicolons and commas are never used as breaks unless you ask for one by
tapping Split.

---

### D5.3 — Split cuts at the strongest break inside the line, rather than asking you where

**Decision.** Each line carries a Split control only when there is still a break inside it. Tapping
it cuts at the strongest one available - a paragraph before a sentence, a sentence before a
semicolon, a semicolon before a comma - and at the first of them when several are equally strong.
Tapping again cuts what is left, top to bottom.

**Options considered.**

1. **The app picks the cut** (chosen). One control per line, a 44px target, and the result is visible
   immediately and undone by one tap on Join.
2. **A small tappable mark at every possible cut, inside the text.** More direct, and it would show
   you every place the app could break. It also means tap targets of about twenty pixels sitting
   inside a line of scripture, which is the wrong place for a fiddly control, and 7.9's full touch
   target audit is not until v1.0.
3. **Tapping a line to open a chooser.** A dialogue on a screen of sacred text, which is exactly the
   study-app furniture principle 7.6 exists to keep out.

**Reversible.** Yes. It is one function, `splitPoint`, and the screen would not change shape if it
picked differently.

**What this means for you.** Split is a guess, but a good one and never a destructive one, and Join
puts it straight back. If it feels wrong when you use it, say so: the alternative is option 2 and it
is a day's work, not a rebuild.

---

### D5.4 — Nothing is written until you confirm, and undo takes the lines away with the row

**Decision.** Confirming writes three things in one go: the lines, the number of them onto the
passage, and the row that puts the passage on your list. Going back writes none of them. Undo removes
all three, leaving the passage exactly as the library ships it, unsegmented.

**Why the lines go too.** Scope 8.4 says the library ships unsegmented, and a passage taken off the
list is a passage back in the library. Leaving the lines behind would mean the passage still claimed
a number of lines it no longer had, and a passage re-added later would silently inherit breaks from a
decision the user had already thrown away. `removeFromList` already threw away the progress and the
review history for exactly that reason; this session added the lines to the same list, so the
permanent remove session 7 puts on the list screen behaves the same way.

**The three writes are one transaction**, so a passage cannot end up on the list with no lines under
it. Session 6's queue is about to assume it never can.

**Reversible.** The transaction, easily. The rule that undo takes the lines away is worth revisiting
only if session 7's list screen ever gains a way to re-segment a passage already being learnt, which
is not planned.

**What this means for you.** Undo really does undo. Nothing is left behind on the passage, and the
next time you add it you get a fresh proposal rather than yesterday's edits.

---

### D5.5 — Normalisation is genuinely not needed yet, and stays in session 8

**Decision.** Scope 9.7 asks for normalisation - lowercasing text, stripping punctuation, collapsing
spaces and folding accents, so that two ways of writing the same words can be compared as equal. It
was in this session's list, conditionally. It is not needed by anything built here and is not built.

**Why not.** Segmentation cuts text; it never compares two pieces of text. The splitter works on the
punctuation and the capitals as the corpus wrote them, which is the opposite of what normalisation
produces. The two places 9.7 names are chip matching, which is session 8, and search, which is
`[v1.0]`.

**Building it now would have been the worse choice**, not merely a neutral one: it would have been
written with no caller to be right or wrong for, and CLAUDE.md section 11 requires it to be unit
tested, which means a test written against guesses about what session 8 will ask of it.

**What this means for you.** Nothing you can see. It is a note to whoever builds the quiz that this
piece is still theirs to build.

---

### D5.6 — Contained decisions

- **`addPassageToList` is deleted.** Decision D4.2 created it as the door Discover added a passage
  through, returning nothing so that no memorisation state could come back through it. The door is a
  path now (D5.1), and a path carries nothing at all, so the function has no caller and no reason to
  exist. `removePassageFromList` stays, for the undo.
- **A new folder, `src/text/`,** for pure functions over passage text. Segmentation is its first
  tenant; normalisation (9.7) is meant to be its second. It is not a feature folder because the
  splitter has no screen in it, and it is not `src/data/` because it never touches the database.
- **`useAsyncValue`, `useBack` and the route paths moved to `src/app/`.** All three are now used by
  both Discover and Memorise, and two feature folders importing each other to share a hook is how
  folders stop meaning anything. `src/app/` already held `userContext` for the same reason.
- **`letterpress` is now a palette token.** Design-tokens 3 allows exactly one shadow in the app, the
  white line inside the top edge of a primary button, and gives it as a raw colour value. CLAUDE.md
  rule 1 admits no raw colour outside the theme, so it is a token like every other colour, the same
  in both palettes.
- **The pinned buttons of design-tokens 5.5 are built, primary only.** The secondary variant is
  described in the same section and no screen needs one yet, so it is not written: an unused
  component is a component nobody has ever seen rendered.
- **One new sentence of copy**, on the confirm screen: "These are the lines you will learn, one at a
  time. Join or split them before you start." It is the only sentence in the app that explains a
  mechanic, and it is in the strings module like everything else. Listed as an open question.
- **The user-facing word is "line", never "segment".** The data model says segment, because scope
  section 10 does; the scope's own prose says line ("cumulative line building", 8.1) and so does the
  screen.
- **The Epistle to the Son of the Wolf proposes 2,138 lines.** It is 46,232 words, it is a book that
  arrived inside the prayers feed, and it is the only passage in the corpus over 400 lines. The
  splitter handles it in eight milliseconds; drawing two thousand rows is what would be slow. Nothing
  was built to handle it, on the grounds that one absurd passage is not worth a scrolling machine
  that the other 975 would also have to run through. Listed as an open question.
- **Two races were found in the reading view's marks, and both are fixed.** A test that failed about
  one run in five was chased rather than re-run. The first: the mark's state was copied out of the
  database by an effect that runs *after* the screen appears, so a tap landing in that gap was drawn
  and then silently put back, while the write it started stood. The mark now works out what it shows
  while drawing, and a tap wins from the moment it happens. The second, underneath it: each tap
  starts a write without waiting for it, so bookmark-then-unbookmark could finish in the other order
  and leave a bookmark the screen said was gone. Writes from the marks now queue, so the last tap is
  the one that decides. Neither is reachable by a human hand at a normal speed, and both are the kind
  of undefined behaviour that becomes somebody's bug report in a year.

---

## D5 follow-up — after Safa's first read of session 5 (v0.5.1)

---

### D5.7 — The Epistle to the Son of the Wolf is out of the corpus

**Decision, taken by Safa, 7 September 2026**, in answer to the open question in D5.6.

The prayers feed carries one record that is a book: 46,232 words, forty times longer than anything
else in the library, and a prayer book entry only in the sense that the feed had nowhere else to put
it. It is now excluded, so the library is 975 passages and 472 prayers.

**It is excluded in the fetch script and not filtered in the app** (CLAUDE.md rule 12). The committed
dataset never holds it, so no screen has to remember to leave it out.

**A tripwire underneath the exclusion.** The exclusion is a list of one, and a list of one is a list
somebody forgets to add to. The fetch now refuses to write a corpus containing anything over 10,000
words, naming the record and telling whoever runs it to add it to the list or raise the limit. The
longest passage left is 5,665 words, so the limit sits with a wide margin either side of it and is a
tripwire rather than a judgement about length.

**Reversible.** Yes: delete one line in `scripts/lib/normalise.ts` and run `npm run fetch:corpus`.

**What this means for you.** The Epistle no longer appears in Prayers or in Special Tablets, and it
has gone from your phone as well, without you doing anything. See D5.9 for how.

---

### D5.8 — A cut is a mark you tap, in the line, where the cut would fall

**Decision, taken by Safa, 7 September 2026**, replacing the default recorded in D5.3.

D5.3 gave each line a SPLIT control that decided where to cut: the strongest break inside the line,
then the next, top to bottom. The objection to it was the right one. The app was choosing, and the
person who knows where a line should break is the person about to learn it.

**Every place a line can be cut now carries its own mark**, drawn in the line at the gap where the
cut would fall: a one pixel hairline of gold, `0.9em` tall, in the space after the comma or the
semicolon. Tapping it cuts there and nowhere else. Joining is unchanged: the seam between two lines
still carries JOIN.

**The mark is drawn rather than written.** It is an element, not a character, so no typeface has to
carry a glyph for it (decision D4.7, where three characters the app draws itself turned out to be
missing from the subset font).

**The target is bigger than the mark.** Ten pixels of padding above and below it, pulled back by the
same amount in margin, so the tap area is about 24 pixels tall while the line of scripture is set
exactly as it would be without it. A line cannot be opened up to fit a 44 pixel control inside it,
and design-tokens 5.3's 44 pixel minimum is written about rows. The full touch target audit is scope
7.9, at v1.0.

**What a screen reader hears.** There can be several marks in one line, so each says which words the
new line would begin with: "Split line 1 before 'suffer not the dust'".

**Reversible.** Yes. It is one small component and one function.

**What this means for you.** Tap the little gold line and the prayer breaks exactly there. There is
one at every comma, semicolon and colon that is not already a break, so a long sentence from the
Gleanings can be cut wherever you want it cut.

---

### D5.9 — The corpus can withdraw a record now, and a device notices

**A problem the build found, not a decision taken freely**, and the reason D5.7 is actually true.

**What went wrong.** The library loads once. The load was guarded on "are there any passages here
already", which is correct the first time and wrong for ever afterwards: dropping the Epistle from
the committed dataset did nothing at all to a phone that had already opened the app. A corpus that
can gain a correction but never lose one is not a source of truth, and the only two devices that
exist are yours and mine.

**The fix.** The dataset's manifest already records a hash of every file, which changes exactly when
the committed data changes. That fingerprint is now what the load is guarded on, and it is kept
beside the anonymous user id in the same place, for the reason given in `userId.ts`. So a corrected
corpus is loaded once, on the next open, and never again; a re-fetch that produced identical files is
not a change at all and costs one string comparison.

**What a withdrawal takes with it.** The passage, its lines, its tag links, any bookmark of it, and
any trace of it having been on a list. Leaving those behind would leave session 6's queue holding a
row whose passage cannot be read.

**What it will never touch.** Anything that is not `global`, so the personal library of scope 4.4 is
safe whatever it claims to be; and any feed the committed dataset does not itself carry, so the Ruhi
collection is out of reach until session 11 commits it. It also does nothing at all when handed an
empty set, so a load that failed to import anything cannot empty the library.

**One consequence for tests.** A test that seeds four passages of its own used to be left alone
because the table was not empty. It now has to say "this device already holds the library"
explicitly, through `rememberCorpusLoaded`. That is the honest version: the old quiet was the bug.

**Reversible.** Yes, but there is no reason to: this is what scope 4.2 meant by a committed dataset.

**What this means for you.** You do not have to do anything to get a corrected library. Open the app
and it corrects itself, once, and says nothing about it.

---

### D5.10 — Contained decisions

- **"Line" stays the word**, confirmed by Safa. "Passage" already means a whole prayer on the library
  rows ("473 PASSAGES"), and using it for the pieces of one would have put "9 PASSAGES" at the top of
  a screen showing one passage. The open question from D5.6 is closed.
- **Adding stays two steps**, confirmed by Safa. The confirm screen stands.
- **The one sentence of copy stands**, confirmed by Safa: "These are the lines you will learn, one at
  a time. Join or split them before you start."
- **`splitPoint` and `splitLine` are gone from the splitter**, replaced by `partsOfLine` and
  `splitAt`. Nothing decides where a cut falls any more, so nothing needs a table of which boundary
  is stronger than which.
- **The build stamp test refused September.** `Intl` renders September in Australian English as
  "Sept", four letters, and the test written in session 2 allowed exactly three. It passed every day
  until the first of September and would have failed every build for a month. The format was right
  and the expectation was too narrow; the expectation now allows both.
- **Session 5's log entry was dated 25 August**, copied from session 4's. It was 7 September. Fixed
  in `sessions.md`, and worth stating rather than quietly correcting, since the dates are how the
  build is read back.

---
## D6 — Session 6, the daily queue: caps, silent overflow, upkeep and focus

---

### D6.1 — The overflow is not hidden, it is never counted

**Decision.** The function that builds today's queue returns an array of the lines to do and
nothing else. There is no field in it for how many lines the cap left out, and nothing anywhere in
the app works the number out.

**Why it came up.** Principle 7.3 is the one the scope calls the single most important requirement
in the document: "overdue items roll forward silently and no discouraging count is ever displayed."
Every other spaced repetition app in existence displays exactly that count, so the pull towards it
is constant, and a later session that has forgotten why would add it in good faith.

**Options considered.**

1. **Compute the count and forbid rendering it** (rejected). The usual arrangement, and it survives
   exactly as long as the comment above it is read. A queue that knows it dropped 40 lines will
   eventually show a badge.
2. **Never compute it** (chosen). The cap is a selection: the lines above it are simply not
   selected, and nothing counts what was not selected. A number that does not exist cannot be
   rendered by accident.

There is a test that asserts the shape of what comes back, so adding the field is a failing build
rather than a code review someone has to notice.

**Reversible.** Trivially, and that is the risk rather than the comfort. It would take one line.

**What this means for you.** If you put the app down for a fortnight and come back, the app shows
you fifteen lines, exactly as it does on a day you have missed nothing. It will never tell you that
there were ninety, because you cannot do ninety and being told so helps nobody.

---

### D6.2 — Which lines is decided by urgency, what order they come in is decided by your list

**Decision.** The cap is filled with the most overdue lines from anywhere on the list. Those lines
are then arranged by where their passage sits on the list, and within a passage by the order the
lines are learnt in. New lines are taken from the top of the list downward, and a line is never
offered before the lines above it in its own passage.

**Why it came up.** Scope 8.3 gives a cap and says new and due are mixed rather than separated, and
says nothing about which fifteen or in what order. Both answers matter and they are different
questions.

**Options considered.**

- *Fill the cap in list order.* Simple, and it starves the list. A long passage at the top would
  take every review every day and everything below it would decay untouched for months.
- *Fill the cap by urgency, arrange the day by list.* Chosen. Selection is fair across the whole
  list; presentation arrives as prayers rather than as a shuffle of lines from four texts.
- *Take one new line from each passage in turn.* Rejected. Scope 6.5 says the list "feeds the queue
  when current material is finished", which is depth first, and scope 8.1's cumulative building
  learns a passage line by line rather than four passages a line at a time.

**Reversible.** Yes, cheaply. It is two comparison functions and their tests, and no stored data
depends on either.

**What this means for you.** The prayers you have neglected longest come back first, wherever they
sit on your list. Within a day, the work arrives one prayer at a time and in the order the lines
run, rather than jumping between texts. And a new prayer only starts once the one above it on your
list has no unstarted lines left, so adding six things at once does not mean starting six things at
once.

---

### D6.3 — Upkeep and focus are set from a roll call on the Memorise tab, not from the queue

**Decision.** The Memorise tab carries two sections: TODAY, which is the queue, and UPKEEP, which
lists every passage on your list with the state it is in. A row in UPKEEP opens a screen for that
passage holding the three upkeep states and the focus switch. A row in TODAY does nothing at all
this session, because the quiz ladder is sessions 8 and 9.

**Why it came up.** This session had to build focus and upkeep so they work, and the two screens
where they would naturally live are both later: the list screen is session 7 and the passage detail
view is session 10. So the session had to decide where the door goes, which is item 6 of its own
brief.

**Options considered.**

1. **A mark on the queue row** (rejected, and this is the one that looks right until you try it). A
   resting passage is never in the queue and a passage not due today is not either, so the door
   would shut behind the first passage you put to rest. You would have no way to wake it.
2. **A control in the reading view** (rejected). Principle 7.6 keeps memorisation chrome out of the
   prayer book entirely, and "how often does this come round" is memorisation chrome by any reading.
3. **A roll call on Memorise** (chosen). Everything on your list is reachable whatever state it is
   in, it is on the memorisation side of the app where it belongs, and it is visible rather than
   hidden behind a mark a tester would not find.

**What it is not.** It is not the list screen of scope 6.5, and session 7 still builds that. This
has no reordering, no removing, no statuses and no filtering. It is a way in to upkeep and nothing
else, and session 7 should feel free to fold it into the list screen or leave it where it is.

**Reversible.** Yes. It is one section of one screen and one route.

**What this means for you.** Open Memorise and you see today's work at the top and, underneath,
everything you have taken on with a word beside each saying ACTIVE, OCCASIONAL, RESTING or FOCUS.
Tap one and you get a screen where you can change that, and turn focus on with a number of days.
The rows under TODAY do not respond to a tap yet: there is nothing behind them until session 8.

---

### D6.4 — What the two caps can be set to, and why a review cap of nought is not allowed

**Decision.** Reviews move between 5 and 50 in steps of 5. New lines move between 0 and 10 in steps
of 1. A focus runs between 1 and 30 days.

**Why it came up.** Scope 8.3 says the caps are user-adjustable and does not say between what.

**Why these.** The new floor is nought because "no new lines today, just review" is a real thing to
want and there is no other way to say it. The review floor is five rather than nought because a
review cap of nought is an app that never shows you anything, which reads as broken rather than as
restful, and scope 8.5's resting state is the honest way to stop a passage coming round. The focus
ceiling is thirty days because scope 8.6 is explicit that the expiry exists to stop an open-ended
focus, and a range stretching to a year would hand that failure straight back.

**Reversible.** Yes, three numbers in `src/config/defaults.ts`.

**What this means for you.** In Settings you can take the day between 5 and 50 lines, and new lines
between none and ten. These are guesses at a sensible range rather than anything the scope decided,
so if either end feels wrong when you use it, say so and it is a one line change.

---

### D6.5 — Focus stores the day it lifts, not the last day it holds

**Decision.** `focus_until` is the first day focus is no longer in force. A focus started on the 7th
with the seven day default stores the 14th and is in force on the 7th through the 13th.

**Why it matters.** It makes "Everything else is paused until 14 September" a true sentence rather
than a nearly true one, and seven days of focus is exactly seven days.

**The queue checks the date rather than the column.** A passage whose focus has run out is released
the next time you open the app, which is what tells you. But an app left closed for a month has a
row still claiming focus, so the queue works out for itself whether focus is in force every time it
is built. The release is what tells you; it is not what makes it true.

**Reversible.** Yes now. Awkward once real tester data exists, because a stored date would mean two
different things depending on when it was written.

**What this means for you.** Focus lasts exactly as long as it says on the screen, and if you leave
the app alone for a month it does not come back still suppressing your list.

---

### D6.6 — Contained decisions

- **`src/queue/` is a new sealed folder**, pure, with no database and no clock, on the pattern
  `src/text/` set in session 5. Nothing new went into `src/scheduler/`: the queue calls
  `isSegmentDue`, `isQueueable` and `effectiveIntervalDays` and adds no arithmetic of its own.
- **The Discover wall grew three entries.** `src/queue/`, `src/data/dailyQueue.ts` and
  `src/data/upkeep.ts` are all now forbidden to Discover, in the lint rule and in the principle
  test. A due count and a focus banner are the first two things principle 7.6 names.
- **The queue row shows the attribution and no word count.** Scope 6.2 puts a word count on a
  passage row in Discover, where the question is how long a thing is before you read it. On
  Memorise that question has been answered, and the only number on the screen is how many lines
  today holds.
- **A queue row is a passage, not a line.** A line's own text is what the quiz is about to ask for,
  so listing lines would give the answers away; and three rows carrying the same prayer name tell
  the reader nothing.
- **The selection mark is the nine-pointed star**, per design-tokens 5.7, hidden rather than removed
  when unselected so the rows do not jump. It is the same glyph as the freshness star of
  design-tokens 4, which session 10 will render and which nothing renders yet.
- **`14 September` is how the app writes a date**, in a new `src/strings/dates.ts`, beside
  `attribution.ts` and for the same reason: the day is data but the language is the app's. The build
  stamp keeps its own format, because one is a sentence and the other is a serial number.
- **Memorise took the tall navy header** that Discover already had, so the two tab screens are built
  the same way. The app's name in the caps slot now has one definition rather than two.

---

### D7.1 — The tab bar is split down the middle, Log is folded into Memorise, and Discover is called Devotions

**Decided by Safa, 7 September 2026**, when session 7 asked where the two new screens should be
reached from and he answered with a shape for the whole navigation instead.

**The decision.** Three tabs, in this order, and they are not scope 3.1's three:

```
DEVOTIONS   BOOKMARKS  ‖  MEMORISE
└─ the prayer book ──┘     └─ the work ─┘
```

**Safa's own words for it:** "i want the left half of the nav icons to be library buttons that when
using the app to pray you use those and the right side is the memorising and activity side."

**Four things changed.**

1. **Bookmarks became a tab**, rather than a row inside the library. It is the door scope 6.7 never
   had.
2. **Log stopped being a tab, and stopped being a screen.** It held one row, Settings. What it was
   going to hold - the streak, the freshness states and the passage detail of scope 11 - belongs on
   the same screen as today's work rather than a tab away from it, and Safa described the Memorise
   tab as "almost like a home page for the memorise section with your log streaks and dash".
   Session 10 builds those onto Memorise. `src/features/log/` is deleted rather than left empty,
   because an unrendered screen is a screen nobody has ever seen.
3. **Settings moved to a row on Memorise.** Decision D2.4 put it on Log "by default rather than by
   decision" and asked Safa to say where it belonged. This is him saying.
4. **Discover reads "Devotions"** on the tab and as the screen's title.

**Recents is not here, and could not be.** Safa's four-tab shape was Devotions, Recents, Bookmarks,
Memorise. Recents (scope 6.4) is tagged `[v1.0]`, scope 14 lists it under "Not in V0", and it needs a
`reading_history` table that is not in the V0 database. CLAUDE.md makes adding a table something to
stop and ask about rather than do, so it waits. **It is the fourth tab when it arrives**, in the left
pair, and that is written down here so the shape does not have to be rediscovered.

**Why three tabs is a happy accident.** Design-tokens 5.6 draws the bar as "three 80px items". Four
of those measure 372px, which fits an iPhone 14 and overflows a 360px Android, so a fourth tab means
narrowing the items. Because Recents cannot ship yet, the bar stays at three and the tokens document
needs no change this session. The narrowing and the fourth tab arrive together, later, when there is
something to put in it.

**What did not change, deliberately.** The word "discover" is still the folder name, the route and
the strings key. That name is what principle 7.6's wall is written against, in `eslint.config.js` and
in `discover-isolation.test.ts`, both of which match on the folder path. Renaming the folder to match
a label would move the wall, and a wall that moves when a word changes is not a wall. **The folder is
not the tab**: the Bookmarks screen lives in it, because a screen full of prayers that must never
grow a freshness state belongs inside the wall whichever tab reaches it.

**Scope 3.1 now needs revising** and only Safa issues those. Its table says three tabs named
Discover, Memorise and Log. It should say what the app does.

**Reversible.** Yes, and cheaply. It is a route table, a list of three tabs and a strings file.
Rebuilding a Log tab is smaller than deleting it was.

**What this means for you.** The bottom of the app now reads DEVOTIONS, BOOKMARKS, MEMORISE. The
first two are what you open to pray. Memorise is everything you do about learning, and Settings is a
row at the bottom of it where the Log tab used to be a tab. Nothing you could reach before is
unreachable now.

---

### D7.2 — The four sorts and two filters on Bookmarks, and why a filter row appears only when it means something

**Decided by Safa, 7 September 2026.** Scope 6.7 declines to fix the axes and says "the session that
builds it should propose a set and ask", so this session did.

**Four sorts:** **My order**, which is the hand arrangement and the default; **Recent**, newest kept
place first; **Title**, alphabetical; **Shortest**, fewest words first.

Scope 6.2 demoted length as a way of browsing the library ("length is not what you browse by" at
6am) and it is right about the library. A bookmark list is the one place the question is real,
because you are choosing something to read in the ten minutes before a gathering starts.

**Two filters: collection and author.** The library has four collections and exactly three authors,
so both are short, closed lists. Safa chose both over collection alone, knowing the cost was more
furniture on the screen.

**A filter row is drawn only once your bookmarks span more than one value on it.** Four bookmarks all
by Bahá'u'lláh get a sort row and no author row at all; the row appears the day a second author is
kept. A control that can only be switched between "all" and "all" is furniture, and this is a
devotional screen where furniture costs the most.

**The manual order is protected structurally rather than carefully.** Two things do it. The sorting
is a pure function in `bookmarkView.ts` that touches no database and therefore cannot write one. And
**the drag handles are simply absent under any sort but My order**, so a sorted view is visibly a
view: you can see it is one because you cannot drag it. Scope 6.7 is explicit that any other
behaviour "makes dragging feel unsafe, because one tap on a sort control would silently destroy an
arrangement the user built by hand".

**Reversible.** Completely. Adding or removing a sort is one entry in a list and one label.

**What this means for you.** Bookmarks opens in the order you arranged, and you can drag rows in that
order. Tapping RECENT, TITLE or SHORTEST shows the same bookmarks a different way and the handles
disappear while you are in it, so nothing can be dragged out of place. Tapping MY ORDER again gives
you your arrangement back exactly.

---

### D7.3 — My list absorbed the upkeep roll call, and the Memorise tab is a queue and two doors

**Decision.** Session 6's UPKEEP section, which listed every passage on the list with the state it
was in, is gone from the Memorise tab. My list carries it: the same word beside every row - ACTIVE,
OCCASIONAL, RESTING or FOCUS - and the same upkeep screen behind every tap. The Memorise tab now
holds TODAY, then a row reading "My list" with the count, then Settings.

**Why.** Decision D6.3 built the roll call as a door and said so in as many words: "It is not the
list screen of scope 6.5, and session 7 still builds that... session 7 should feel free to fold it
into the list screen or leave it where it is." Leaving it would have meant the same passages listed
on two screens one tap apart, which is the thing that makes an app feel as though it were built in
stages, because it was.

**What it costs.** Upkeep is one tap further away than it was. What it buys is a Memorise tab that is
about today, and room between TODAY and the doors for session 10's streak and freshness.

**One thing was fixed on the way through.** The roll call showed the upkeep state and nothing else,
which made it a surface naming a passage without naming who wrote it. Principle 7.10 admits no
exception, so **My list rows carry the author**: `BAHÁ'U'LLÁH · RESTING`. A word count would be the
wrong number here, because the question on this screen is not how long a thing is but how it is
going.

**Reversible.** Yes. It is one section of one screen.

**What this means for you.** Open Memorise and you see today's work, then a row saying "My list" with
how many passages are on it, then Settings. Tap My list and everything you have taken on is there,
with the author and the state beside each, draggable into the order you want and removable. Tapping
one still opens the screen where you set how often it comes round and turn focus on.

---

### D7.4 — The chip is design-tokens 5.5's two buttons at chip size, rather than a new object

**Decision.** The sort and filter controls of scope 6.7 are drawn as chips, and a chip is built out
of the two buttons the tokens document already defines. Selected takes the primary: `field` fill, 1px
`deep` border, the letterpress highlight, caps label in `accent`. Unselected takes the secondary:
transparent, 1px `rule-str` border, caps label in `on-paper-60`. Square corners, because
design-tokens 3 gives the whole product a radius of nought.

**Why it is derived and not invented.** Design-tokens 5 names seven construction patterns and none of
them is a chip. Scope 6.2 uses the word, so the object is sanctioned even though its drawing is not.
In a visual language this tight the risk of a new object is not that it looks bad, it is that it
looks as though it came from a different app. Deriving it means the chip follows a future palette
change without anyone remembering it exists.

**Two measurements are the build's own.** The chips **wrap rather than scroll sideways**, because a
row that scrolls hides choices behind an edge with nothing to say they are there. And the padding is
tighter than a button's: three rows of chips at button height cost a quarter of a phone before the
first bookmark. Design-tokens 5.3's 44px minimum is written about list rows and is met by every row
beneath these; scope 7.9 puts the full touch-target audit at `[v1.0]`, and this is one of the things
it should look at with a real thumb.

**Reversible.** Yes, one small component.

**What this means for you.** The controls at the top of Bookmarks look like small versions of the
buttons elsewhere in the app, filled in navy with gold lettering when they are on.

---

### D7.5 — Dragging is written, not installed: pointer events, the pressed wash, and the arrow keys

**Decision.** The reorderable list is about a hundred and fifty lines in
`src/components/Reorderable.tsx`. No drag-and-drop library was added.

**Why not a library.** CLAUDE.md rule 6 makes a dependency a decision. Every drag-and-drop package in
the ecosystem is larger than this file, ships its own motion vocabulary that design-tokens 6 would
have to be argued out of, and solves a general problem - nested lists, several containers, transfer
between them - that this app does not have. What it has is one flat list of rows on a touch screen.

**Pointer events rather than the browser's own drag-and-drop**, which does not fire on touch at all,
and this is a phone app first.

**The lifted row does not float.** It takes the pressed wash of design-tokens 6 - "a low-opacity
`field` wash, no scale, no ripple, no bounce" - and the rows swap places under the finger as it
crosses their midpoints. A row that lifted, tilted and cast a shadow would be the only object in the
product that behaved like software.

**The handle is a button, and the arrow keys move the row it belongs to**, with a live region saying
where it landed. That is not an enhancement: it is the only way to reorder anything without touch.

**One component for both screens.** Scope 6.7 says Bookmarks and My list "are the same interaction on
different material", so they hand their rows to the same component and cannot drift apart.

**Reversible.** Yes, though a library would now have to match behaviour this already has.

**What this means for you.** Press and hold the two short rules at the right of a row and drag it up
or down. The row you are moving goes slightly darker, the others move out of its way, and it stays
where you leave it.

---

### D7.6 — Contained decisions

- **Removing a passage is one tap, and the Undo really undoes it.** Scope 6.5 forbids friction, so
  there is no "are you sure". What stands behind it is the band of decision D4.10 with Undo in it,
  and `takeOffList` hands back the lines, the progress and the review history it destroyed so that
  `putBackOnList` can put them back with the same ids and the same place in the list. An Undo that
  re-added the passage as a fresh row would look right in every way except that your prayer had
  moved to the bottom, which is a bug nobody reports precisely enough to find. *What this means for
  you: tap REMOVE by mistake and "Undo" gives you back everything, in its old position.*
- **The two doors at the foot of Memorise have no section header.** Design-tokens 5.3 gives a section
  a caps label, a rule and a count. A header above rows reading "My list" and "Settings" would only
  repeat them, so the group gets the rule and no word. Added to `ListSurface` as `SectionRule`.
- **`ListRow` gained an optional second line and an optional trailing count**, so that a row whose
  title says the whole of what it is does not have to invent a subtitle.
- **The count of passages is written once** and read by the category rows, the My list row and the
  Bookmarks screen, the way the word count and the line count already were.
- **The Bookmarks screen re-reads after every drag** rather than trusting its own copy, and shows the
  reader's arrangement until that read lands. This is `useMark`'s bargain from the reading view
  (decision D5.6) applied to a list: a screen that copied the order into an effect could redraw a
  drag and then quietly undo it when a slower read came back.
- **Two chips are both labelled ALL**, one per filter row. A screen reader tells them apart by the
  label on the group around them, which is what a radiogroup is for.

---

### D7.7 — Scope revised to v4.4 by Claude, on Safa's instruction

**Instructed by Safa, 8 September 2026**, answering the first open question of session 7's handoff:
"1, yes update scope with our decision."

This is the third departure from the rule in CLAUDE.md section 2 that only Safa revises
`/docs/scope.md`, after D1.11 (v4.2) and D4.12 (v4.3). The pattern is the same each time: Safa
decides, Claude drafts, and the decision log records that it happened.

**What changed in the scope.**

1. **Section 3.1 rewritten**, from "Three tabs" to "Four tabs, in two halves", with the halves stated
   as the principle a future tab has to answer to. V0 ships three of the four.
2. **Log removed as a tab**, with a paragraph saying why and stating plainly that section 11 is
   unchanged in substance and still ships in full, onto Memorise.
3. **Section 6.4 (Recents)** gains that it is a tab, in the devotional half, and that it does not
   merge with Bookmarks. **Section 6.7 (Bookmarks)** gains that it is a tab and that My list is not.
4. **Sections 14 and 16** reworded where they named a Log screen or a Log session. Session 10 is
   unchanged in content and now says where it renders.
5. **Principle 7.6's wording** changed from "lives in Memorise and Log only" to "lives in Memorise
   only", which is the same rule over one place instead of two. `CLAUDE.md` section 3 quotes 7.6 in
   full and was updated to match, because a quotation that drifts from its source is worse than no
   quotation.
6. **Four rows added to the scope's own decision log**, 18.32 to 18.35.

**Nothing entered or left V0.** This is a revision about where things are reached from.

**What this means for you.** The scope now describes the app you have rather than the one it
described in August, so the next session reads the right thing without being told about this
conversation.

---

### D7.8 — The chip you tap is 44px; the chip you see is 24px

**Raised by Safa, 8 September 2026**, on the fifth open question of session 7's handoff: "25px
visually is fine but the touch target has to be larger for a touch screen so might as well go
bigger no?"

He is right, and the original reasoning had the trade the wrong way round. A chip drawn at 44px is a
button, and three rows of buttons above a screen of prayers costs a quarter of a phone. But a chip
*tapped* at less than 44px is a control a thumb misses, and that is the failure that actually
matters.

**So the two were separated.** The `<button>` is the target and measures 44px tall. The bordered box
inside it is the drawing and measures 24px. The extra height is real, tappable, and simply has no ink
in it.

**The height was paid for out of the layout rather than out of the screen.** The label moved from a
fixed 62px column into the same wrapping flow as the chips, which is worth about 74px of width per
row and takes a wrapped line off two of the three rows. Measured in a browser at 390px: the controls
were 204px tall with 24px targets and are 190px tall with 44px ones. The screen got shorter and the
targets got nearly twice as tall.

**What was deliberately not done: clawing the height back with a negative margin.** It would have
worked and it would have made the targets of vertically adjacent rows overlap, so a tap in the
overlap would land on whichever row happened to be drawn on top. Choosing an author while aiming at
a collection is worse than a row of tall chips.

**Width was left alone.** The narrowest chip, ALL, is 35px wide. Height was the failure; width never
was.

**Reversible.** Yes, one component.

**What this means for you.** The controls look the same and are much easier to hit. The tap area of
each one now reaches most of the way to the row above and below it, without ever overlapping them.

---

### D7.9 — Contained decisions, session 7 follow-up

- **Recents and Bookmarks stay separate tabs**, asked and answered (scope 18.34). Recorded so that a
  later session reaching v1.0 does not rediscover the question and answer it differently.
- **`listBookmarkedPassages` returns one row per passage**, whatever the table holds. Found while
  seeding a browser by hand, which put two bookmark rows on one passage and made React complain about
  two children with the same key. Nothing in the app can create that row: `addBookmark` is
  idempotent, and `[user_id+passage_id]` is an index rather than a unique constraint. v1.0 sync
  merging two devices is how one would arrive, and a screen with two rows for one prayer would have
  two rows with one identity, so the one you dragged would not be the one that moved. The earliest
  place in the arrangement wins, because that is the one the user put there.

---

---

## D8 — Session 8, the chip quiz: levels 2, 3 and 4

### D8.1 — A row of today's queue opens that prayer, and there is no button that begins the day

**Decided by Safa, 8 September 2026.** Session 6 drew the rows of today's queue and left them inert,
because the ladder did not exist. Making them do something is this session's goal sentence, and there
was more than one door it could be.

**Chosen: the row is the door.** Tap a prayer and you work through its lines for today, one after
another. When they are done you are back on the Memorise tab and that prayer's row has gone. Do
another, or stop. When the last row goes, the section says you are up to date.

**Options considered.**

- *One button that begins the whole day.* The rows stay a summary and a single button walks all
  fifteen lines in one sitting. Rejected: fifteen lines with no landmark in the middle needs
  something to say how far through you are, and a counter ticking down is exactly the chrome this
  product has kept out everywhere else.
- *Both a row and a button.* Rejected as two doors to the same room, on the one screen whose whole
  virtue so far has been that it holds almost nothing.

**Three things fall out of it, and they are why it is the right shape rather than merely the one
chosen.** The shrinking list is the only progress indicator in the product, and it is made of the
work itself rather than of a number. The day is resumable for free, because every rating is written
the moment it is given. And a prayer is a natural unit to stop at, which matters at six in the
morning.

**Reversible.** Yes. It is one route and one link, and the queue underneath already knows the whole
day.

**What this means for you.** Open Memorise and today's prayers are listed. Tap one and it takes you
through its lines. Finish it and you are back on the list with one row fewer. Nothing counts down at
you and nothing says how many you got right.

---

### D8.2 — A line climbs one rung of the ladder per correct review

**Decided by Safa, 8 September 2026.** Scope 9.1 says "quiz type is selected by mastery level, not at
random" and then does not say what mastery level means. The session was asked to propose and ask.

**Chosen: the count of times you have got the line right in a row.**

| Times right in a row | What you meet |
|---|---|
| 0 | The line, to read |
| 1 | About one word in seven taken out |
| 2 | About two words in five taken out |
| 3 | The lines to put back in order |
| 4 | First letters as a scaffold (session 9) |
| 5 or more | From memory (session 9) |

Rating everything Good, that is day 0, day 1, day 7, day 22, day 60, day 155.

**Options considered.**

- *By how long the line has been sticking* - the rung follows the gap the scheduler has stretched to
  rather than the count of correct answers. Kinder to a line you keep rating Hard, because its gap
  grows slowly and it would linger on the gentler rungs. Rejected as harder to predict: two lines you
  have met the same number of times could sit on different rungs with nothing on screen to say why.
- *Two correct reviews on each rung.* Rejected as far too slow. Reciting would arrive about two years
  in, and in the fortnight of real use V0 exists to produce, a tester would only ever see the first
  two rungs, so most of what has been built would stay invisible.

**Forgetting a line puts it back to reading it, and that is not a separate decision.** Decision D1.5
sets `repetitions` back to nought on a rating of *Again*, so the ladder simply reads it. It is also
the only shape the stored data allows: `segment_progress` holds ease, interval, repetitions, due
date, last reviewed and lapses, and no rung, so a "drop one rung" rule would have to know the rung
before the lapse. Storing it would mean a new column, which CLAUDE.md forbids without asking.

**Two rungs the material can refuse.** A line of one or two words has nowhere to hide a blank and is
served at level 1. A passage's first two lines cannot be put in an order, so a line with fewer than
two before it is served at level 3 instead of level 4. Neither is a rule about the reader.

**Reversible.** Completely. It is one pure function, `servedLevel` in `src/quiz/level.ts`, with no
stored data behind it. Changing it changes tomorrow and nothing in anybody's history.

**What this means for you.** The first time a line comes up you just read it. The next morning a
couple of words are missing and you tap them back. A week later nearly half of it is missing. A
fortnight after that you are putting the lines in order. Forget one at any point and it goes back to
being read, and climbs again.

---

### D8.3 — Level 4 reuses session 7's drag, and the one thing it needed was a voice

**Decision.** `src/components/Reorderable.tsx` is used as session 7 wrote it: pointer events rather
than the browser's own drag-and-drop, the pressed wash of design-tokens 6 rather than a floating
card, and the arrow keys as the way to move a row without touch. Decision D7.5's reasoning holds
without amendment, and no drag-and-drop dependency was added.

**One change was needed, and it is not about dragging.** The component owned a polite live region,
and the review screen has something of its own to announce - that the true order has been shown. Two
polite live regions on one screen give a screen reader two announcement queues with no defined order
between them, so the component now takes an optional `announcement` and speaks it in the one region
it already has. Eight lines.

**Found by a test rather than by reading.** The component test failed with "found multiple elements
with the role status", which is the sort of thing that is invisible to anyone not using a screen
reader and would have shipped.

**Two things were settled outside the component**, because they are about scripture rather than about
dragging. A row announces itself by its opening five words rather than its full text, because forty
words of the Gleanings read out on every move is not an announcement. And the misplaced-line mark is
drawn as an underline under the words rather than a rule across the row: full width it lands a few
pixels above the row's own divider, and two hairlines that close together read as a drawing error.
It is now the same mark a corrected word gets in a chip cloze, so the reader meets one idea.

**What was considered and not built: tapping a line to place it.** Scope 9.1 says "tap or drag" and
this is the drag. Tap-to-place would be a second way to move a row on the same screen, and two ways
of doing one thing is two mental models for a rung that a reader meets perhaps six times in a
passage's life. The handles are 44px and the arrow keys work.

**Reversible.** Yes. The `announcement` prop is optional and the two lists that do not pass one are
untouched.

**What this means for you.** Putting lines in order works exactly like arranging Bookmarks or My
list, because it is the same thing. When you show the order, the lines you had somewhere else are
underlined in gold.

---

### D8.4 — What a wrong answer looks like: the word in its place, with a rule under it

**Decision.** When the reader taps a chip that is not the word, the **correct word takes its place**,
drawn from the line's own text, with a hairline rule beneath it in `accent-dk`. There is no colour,
no cross, no strike-through of what was chosen, and no sound. A word tapped correctly is drawn as
though it had always been there.

**Why it is drawn this way.** Principle 7.2 asks for the correct text to be shown after every attempt
with deviations highlighted, and principle 7.1 forbids the buzzer. A printed correction under a word
is what that looks like on paper. The alternative every other app of this kind reaches for is a
colour that means "wrong", and this product has no such colour: the palette is a navy, a gold, a
paper and a set of greys, and acquiring a red for this would be acquiring a whole register of
judgement with it.

**The reward for getting it right is that the line is whole.** Nothing else happens, and nothing is
counted. Scope 9.6 says the reader's own rating is the only input to SM-2 and that nothing is
auto-scored, so **the app does not know how many words you got right, because it never worked it
out.** There is nowhere for a score to be rendered from, which is the same technique principle 7.3
uses for the overflow count.

**The line is never rebuilt from the chips.** A chip carries a word with the punctuation taken off
both ends, because a chip reading `spot,` would say where in the line the word belongs. The blank it
fills is redrawn from the line's own token, comma and all. So whatever the reader taps, what they end
up looking at is the passage exactly as the corpus wrote it.

**That is also the bug CLAUDE.md section 11 asks for a component test against**, and it is one
character wide: the chip says `God` and the line says `God,`. Compared as raw strings, the reader
taps the right word and is told, gently and immediately, that it was the wrong one - with the right
one appearing in its place, which is exactly what a correct answer looks like too. Nothing on screen,
in the log or in the stored data would distinguish that from working perfectly. Matching goes through
`isSameWords` in `src/text/normalise.ts`, and `src/app/quiz.test.tsx` drives the real screen and taps
a real chip to hold it there.

**Reversible.** Yes, and cheaply: it is one span in `ClozeLine.tsx`.

**What this means for you.** Tap the right word and the line simply becomes whole. Tap another and
the right word appears anyway, with a thin gold rule under it, and the app says nothing about it.

---

### D8.5 — Contained decisions

**A chip carrying a word of a prayer is set in the body face, not in 8.5px capitals.** The sort
controls of decision D7.4 say `TITLE` in the caps slot because they are labels. These carry
scripture, so they take the 19px body role. It costs no height at all: decision D7.8 separated the
chip you tap from the chip you see, and the 44px touch target is taller than either box. The drawing
itself is now `ChipBox`, exported from `src/components/Chips.tsx`, so the two kinds of chip cannot
drift apart when a palette changes.

**A spent chip fades and stays where it is.** A bank that reflows after every tap moves the next chip
somewhere else between one tap and the next, which is how a reader ends up choosing a word they did
not mean. Design-tokens 6 gives opacity and nothing else.

**A wrong tap spends two chips: the one tapped and the one that was right.** A chip still in the bank
is a chip that could still be needed, and the answer to a blank already filled cannot be.

**The words taken out are chosen with a seeded shuffle rather than a real one.** Three reasons, and
the first is the one a reader would notice: a re-render must not move the chips under their thumb.
A line closed halfway through and come back to is also the same puzzle rather than a different one,
and a test can state what a particular line gives up.

**Longer words are taken out first, and never two side by side.** A cloze that blanks `the`, `my` and
`of` teaches nothing, so words of four letters or more are drawn on first and three-letter words are
reached only when a short line has nothing else to offer. Two adjacent holes stop being a cloze: the
scaffolding either side of a missing word is the whole of what makes this assisted production rather
than the recall cliff scope 9.2 describes.

**Ordering is capped at five lines, ending at the one the queue served.** Scope 8.1 builds a passage
cumulatively, so the group never reaches past the served line: a line the reader has not met must not
appear in a puzzle about the order of the ones they have. Twelve lines to arrange is a clerical task
rather than a memory one, and twelve rows do not fit a phone above a bank of controls.

**A shuffle is never allowed to land on the correct order.** A puzzle that arrives finished would
have the reader rate themselves on something they had not done.

**Normalisation strips an apostrophe and spaces a hyphen, and the corpus decided which.** Counted
across all 975 passages: 2,266 hyphens inside a word (`All-Merciful`, `loving-kindness`) against 21
used as dashes, and 432 apostrophes, every one of them inside a word. So `Bahá’í` folds to `bahai`,
which is the only spelling a search box will ever be given, and `All-Merciful` folds to
`all merciful`, findable as one word or two. Stripping both would give `allmerciful`; spacing both
would give `baha i`. The one known cost is that `allglorious` typed as one word will not find
`all-glorious`, and no passage writes it that way. Search itself is `[v1.0]` and is not built.

**`user_prayers.status` moves from `list` to `learning` on the first review.** A third write, where
the brief named two, inside a transaction that was already open. A column saying `list` about a
passage you have reviewed twenty times is a column that lies, and scope section 10 gives the value
its meaning. Nothing reads it yet; session 10's passage detail will. A passage already `memorised` is
left alone, so session 9's milestone cannot be undone by an ordinary review.

**Design-tokens 5.5's secondary button was written, and its horizontal padding gives way.** Four
self-ratings sharing one row on a 390px phone cannot each carry 13px of padding around a tracked caps
label. The vertical measurement is kept exactly, because height is what a 44px touch target is made
of; the four share the width equally. The row also carries its question, `HOW DID THAT GO?`, drawn as
well as read: four bordered words with nothing above them are four words, and this is the most
important control in the product.

**A tap is written against the state as it stands, not as the render saw it.** Found in a real
browser by tapping two chips inside one frame, which sent both at the same blank and quietly
overwrote the first answer. A double tap or a stray second finger does that on a screen of 44px
targets above a tab bar. `src/app/quiz.test.tsx` reproduces it, and was checked against the old
handler to confirm it fails there.

**The visually-hidden helper moved out of `Reorderable.tsx` into `src/components/VisuallyHidden.tsx`,
because session 8 needed three more of them** - a live region on the review screen and the word a
blank has to be when a line is read aloud.

---

## D9 — Session 9, recite and reveal, and the milestone

---

### D9.1 — The door to the milestone is a section of the Memorise tab that is usually not there

**Decided by Safa, 8 September 2026.** Scope 9.5 says the milestone is "deliberately attempted"
rather than served by the queue, and does not say from where. The session was asked to propose and
ask, because it decides whether the emotional centre of the product is something the reader finds or
something the app offers them.

**Chosen: a section on the Memorise tab, drawn only when there is a passage to attempt.** It is
headed FROM MEMORY and sits between today's work and the two doors below it. A passage appears in it
once the app has shown the reader every one of its lines at least once, and stays there until it is
recited right through.

**Options considered.**

- *At the end of that prayer's lines.* Finish the last line of the day and be asked whether you want
  the whole thing. The moment is perfect, because you have just recited all of it in pieces.
  Rejected on three counts: it is the app choosing the moment, which is the opposite of "deliberately
  attempted"; it puts something at the end of a prayer's work where decision D8.1 deliberately put
  nothing; and it would ask again every morning the reader declined, which is a nag with a devotional
  text attached to it.
- *A button on the upkeep screen*, two taps down from My list. Genuinely found rather than offered,
  and nothing changes on the morning path. Rejected because in the fortnight of real use V0 exists to
  produce, almost nobody would find it, so the emotional centre of the product would ship invisible.
  That is the same trap decision D8.2 avoided when it refused a two-reviews-per-rung ladder.

**Why the section is not a second door in the sense D8.1 refused.** That decision rejected "two doors
to the same room, on the one screen whose whole virtue so far has been that it holds almost nothing".
This is a different room, and on an ordinary morning the section is not drawn at all, so the tab
holds exactly what it held before. When it is drawn it is because a reader has got a whole passage
into their head, which is not an ordinary morning.

**The one condition, and why it is not a test of readiness.** The app offers a passage once it has
shown the reader every one of its lines. That is a fact about what has been shown, not a verdict on
how well it is known. Scope 9.6 makes the reader's own rating the only judgement in the product, and
a gate built out of mastery levels would be the app quietly keeping a second opinion. It also has to
be reachable: a gate at the top rung would take about five months per line, so no tester would ever
see the milestone.

**Reversible.** Completely. It is one query, one section and one route.

**What this means for you.** Once you have met every line of a prayer, a short section appears on
Memorise offering the whole of it. It sits there until you feel like it. Nothing asks you, nothing
counts down, and ignoring it costs nothing.

---

### D9.2 — What "significant" means on the milestone screen: the navy, inverted

**Decided by Safa, 8 September 2026.** Scope 9.5 calls the milestone "the one place where the visual
treatment is allowed to be significant" and leaves what that means open. Design-tokens 3 leaves very
little to be significant with: no rounded corners anywhere, no shadows except one letterpress
highlight, no animation beyond 200ms of opacity, and a palette of a navy, a gold, a bone paper and
some greys.

**Chosen: navy cloth edge to edge, dressed as the reading surface dresses a passage.** Every other
screen in the app is bone paper with a navy header over it. This one is navy all the way down, with
the gold eyebrow, the 40px gold title, the twin rules, a gold floated drop cap, the fleuron and the
attribution of design-tokens 5.4. It reads as the cover of the book rather than a page of it.

**Options considered.**

- *Navy, plainly set.* The inversion alone, with no drop cap, no rules and no fleuron. Quieter, and
  arguably closer to the product's temperament. Rejected as not different enough to feel like an
  occasion: from arm's length it is a dark screen rather than a moment.
- *Paper, fully dressed.* The reading view's full printed treatment on the usual ground. Rejected
  because it would look like the reading view, which is a screen you meet every day, so the occasion
  would be muted by familiarity.

**No token was invented and no rule was bent.** Design-tokens 1.1 already names `accent` as "display
type on navy" and `paper` as an ink on navy; the twin rules take the two the tokens give a line on
navy. The ink-bleed shadow is dropped on this screen alone, because it is a dark smudge under a pale
letter and there is no ink on navy to bleed. `Screen` and the pinned button band now take a tone,
so the two grounds live in one place and a third screen cannot invent a third by accident.

**Reversible.** Yes. It is one word on two components and a handful of colour tokens on one screen.

**What this means for you.** When you go to recite a whole prayer, the screen turns navy. It is the
only screen in the app that does, and it is set like a page of the book rather than like a quiz.

---

### D9.3 — The log gains a passage and a milestone, and nothing in the database changes shape

**Decided by Safa, 8 September 2026.** Scope 11.3 says `review_log` "stores every self-rating with a
timestamp from day one", and its columns in scope section 10 are a **segment** id and a quiz type
whose values are the six rungs of the ladder. A recital of a whole passage is neither, so there was
nowhere to record one.

**This is not only about the one milestone moment.** Scope 8.7 promotes a passage on its milestone
and stops surfacing its lines, so from that day the reader produces reviews that are not of any one
line. A reader who had memorised everything on their list would have been writing no log rows at all
- and session 10 derives the streak from this table, so their streak would have stopped.

**Chosen: a `passage_id` column on `review_log`, a `milestone` value for `quiz_type`, and
`segment_id` allowed to be empty on those rows.**

**Options considered.**

- *File a recital against the passage's opening line, at level 6.* No change to anything, and the
  streak keeps working. Rejected because the log would quietly say something that did not happen, and
  the one question the raw history exists to answer later - what did I actually do, and when - could
  not be answered honestly.
- *Do not record it.* The scheduler still gets the rating, so the passage still comes round. Rejected
  for the reason above: a finished list would be a dead streak, and scope 11.3's promise that the raw
  data is captured from day one would have a hole in the place that matters most.

**Nothing in the stored database changed.** Dexie's schema string declares the primary key and the
indexes, not the columns, so a column that nothing is queried by is simply stored. No version was
bumped, no upgrade ran, and no row on a tester's device was touched. Doing this later, once people
have a fortnight of real history on their phones, would have been a migration running on their
device - which is the whole reason this project declares columns early.

**Rows written before today have no passage on them.** They are found through their line, and nothing
backfills them, for the same reason.

**Reversible.** The column is additive and nothing reads it yet. Removing it would be one line.

**What this means for you.** Nothing you can see today. It means that when session 10 counts your
days in a row, a morning spent reciting whole prayers counts like any other, and that the app can
still answer honest questions about your own history in a year's time. **Scope section 10's
`review_log` line needs two words added when you next revise it: `passage_id`, and `milestone` among
the quiz types.**

---

### D9.4 — A first-letter scaffold is drawn and not read aloud

**Decision.** At level 5 the line is drawn as the first letter of each word with its punctuation
kept - `Remove not, O Lord,` becomes `R n, O L,` - and a screen reader is told "The first letter of
each word of this line" instead of being given the letters.

**Why.** A first-letter scaffold is a visual mnemonic and nothing else. Read aloud, `R n, O L,` is
either spelled out character by character or run together into a word that is not one, and both are
noise rather than a prompt. So the region says what is on the screen, and the recital a screen reader
user is asked for is the one level 6 asks for, which is the rung above and is a real rung.

**What was considered and not built.** Announcing each letter individually. It would take a
twelve-word line and read out twelve letters, which is slower to listen to than the line and helps
less.

**Reversible.** Yes, it is one `aria-label`.

**What this means for you.** Nothing, unless you use a screen reader, in which case level 5 sounds
like level 6 and the app says so rather than reading you an alphabet.

---

### D9.5 — Contained decisions

**The top two rungs ask for the run of lines, not the single line.** Scope 8.1 builds a passage
cumulatively and scope 9.5 calls level 6's scope a "segment group", so levels 5 and 6 recite the
served line and up to four before it - the same run level 4 puts in order. That run now has one name,
`cumulativeGroup` in `src/quiz/group.ts`, because three rungs asking for it in three places is three
copies that agree today.

**The cap on a recital is its own number, although it is the same five.** Ordering caps at five
because twelve draggable rows do not fit a phone; reciting caps at five because the queue can serve
four lines of one passage in a morning and four recitals of a twenty line passage is an hour drawn
from a queue that scope 8.3 caps precisely so a morning cannot run away. Two reasons, so two numbers.

**A hidden line is a hairline rule, which is the mark a blank already uses.** The reader meets one
idea for "something is missing here" across the whole ladder rather than a new one at each rung.
Stacked down a passage the rules also say how many lines are still to come, which is the one thing a
reciter needs and the only thing the screen tells them. They are full width rather than traced to the
length of each line, because a rule the length of its line gives away the shape of the passage.

**A first attempt rated *Again* changes nothing at all.** Scope 8.7 describes the demotion of a
promoted card and says nothing about a failed first attempt. Promoting the passage and demoting it in
the same act would be true of the columns and false of the morning, so the lines simply carry on. The
rating is still recorded, because it is a rating.

**A demotion keeps `milestone_reached_at`.** The four scheduling columns are what say whether a
passage is promoted now; the date is history, and history does not un-happen. Scope 11.3 puts
"milestone date, if reached" on the passage detail view session 10 builds. This is also why no column
had to be invented to tell a demoted passage from one that never got there.

**A promoted passage is refused for a partial reading of itself.** Reachable only by a typed URL. The
card is scheduled on the weakest of its lines (D1.3), and a line never met has no interval to be the
weakest, so promoting there would schedule the whole passage off whichever lines happened to have
been started.

**A whole-passage card is suppressed by focus and by rest exactly as a line is**, and counts against
the review cap exactly as a line does. A reader who has memorised six passages and has three due has
three pieces of work today, not three free ones.

**A recital goes with its passage when the passage is removed**, both from `takeOffList` and from the
corpus withdrawal of session 5. A log row naming only a passage would otherwise survive a removal
that scope 6.5 makes permanent and total.

---

## D10 — Session 10, installable: the manifest, the icon, and offline

### D10.0 — This session took the number 10, and the streak session became session 11

**Decided by Safa, 8 September 2026.** The session prompt was written as session 11 and assumed
session 10 had already been built. It had not: the repository was at v0.9.0, `main`'s last merge was
session 9, and the V0 list in scope section 14 still had "Freshness states and passage detail" and
"Daily streak" unticked.

**Chosen: install now, and this session is 10.** The build sequence in scope section 16 is otherwise
unchanged and nothing is resequenced away: freshness, streak and the passage detail view are now
session 11, and Ruhi, which the table had at 11, is session 12.

**Options considered.**

- *Build the streak and the freshness stars first, install afterwards.* The fortnight would begin on
  a complete V0 with nothing missing. Rejected because the two weeks are for finding out whether the
  app is pleasant to hold and whether the daily queue feels punishing, and both of those can be
  found out today.
- *Install now but keep the number 11.* Rejected because CLAUDE.md section 8 makes the minor version
  the session number, so the tags would have read 0.9.0, 0.11.0, 0.10.0, and the version line in
  Settings would have stopped saying which build is newer. That line is how a tester tells us what
  they are holding, so it has to be readable in order.

**Reversible.** The numbering, no. The sequencing, yes and cheaply: session 11 is next either way.

**What this means for you.** The app goes on your phone now. What is not in it yet is the daily
streak and the little gold stars that show how fresh each prayer is, so for the moment you cannot
see your own progress at a glance. Those are the next session, and they will arrive on your phone by
themselves without you doing anything.

---

### D10.1 — The manifest is generated from the theme registry, not written

**Decided by Claude, 8 September 2026.** A web app manifest is a static JSON file the browser reads
before any of the app has run, so it cannot ask the theme provider anything. It also has to name two
colours: the navy behind the status bar and the colour a launch shows before the first paint.
CLAUDE.md rule 1 admits no hard-coded colour anywhere, and there are two palettes with two different
navies, so writing one of them into a file would have put a third copy of the palette in the
repository.

**Chosen: the manifest, the icons and the one head tag that carries a colour are all generated during
the build**, by `scripts/vite/installable.ts`, reading `defaultPalette()` from the theme registry.
Changing `field` in `src/theme/palettes.ts` changes the shipped manifest at the next build and there
is nothing else to remember. A test hands the generator the second palette and fails if the result
does not follow it, which is the assertion a pasted hex cannot survive.

**Options considered.**

- *Write `public/manifest.webmanifest` with the navy in it.* One small file, no build machinery.
  Rejected: it is precisely the breach rule 1 exists to prevent, and the copy would have been silent
  and permanent.
- *Read the manifest at runtime and rewrite it.* Not possible. It is read at install time, once,
  before the app exists.

**The exception this does not remove.** It is still the *default* palette. Someone using Oxblood
Cloth has an installed app whose status bar strip and launch colour are navy, because a manifest
describes the installed thing rather than the running one. The only way round it is a manifest per
palette, which would mean reinstalling the app to change a colour. Recorded rather than hidden.

**Reversible.** Yes, entirely. One plugin file.

**What this means for you.** Nothing you can see, unless you switch to the Oxblood palette, in which
case the strip behind the clock at the very top of the screen stays navy. Tell me if that bothers you
and I will look at it again.

---

### D10.2 — The app icon is a real image file, and it is the only one

**Decided by Safa (the design) and Claude (the boundary), 8 September 2026.** Design-tokens 8.3 says
"No image or icon files. Every mark in the app is an inline SVG." That has been true of every mark on
every screen for nine sessions. A home screen icon cannot be one of those marks: iOS reads
`apple-touch-icon` as a bitmap and will not take an SVG, and neither will the manifest's icon list.
So this is a genuine conflict with a rule the visual language depends on, not a technicality.

**Chosen: the exception is drawn as narrowly as it can be, and then enforced.**

- The icons are **generated during the build** from the same eighteen numbers design-tokens 4 draws
  the freshness star with, which now live in `src/theme/ornaments.ts`. They are not a second drawing
  of the star; they are the star.
- Nothing is committed. The four PNGs and the favicon exist only in `dist/`, which is gitignored, so
  the repository still contains no image file at all. `public/favicon.svg`, which had been Vite's
  scaffold logo since session 1, is deleted rather than replaced.
- `src/principles/no-image-files.test.ts` fails the build if any image file is ever committed
  anywhere. The exception is now a rule with a wall around it rather than a paragraph somebody has
  to remember.
- No image library was installed. The PNG encoder is forty lines over `node:zlib`
  (`scripts/lib/png.ts`), because the alternative was a native binary of tens of megabytes to draw
  one star on a flat ground. This follows D7.5.

**The design, which Safa chose.** The old gold nine-pointed star, filled, on the navy cloth of
`field` - the same navy the milestone screen inverts to in D9.2, so the icon is the cover of the book
whose pages the app is. Considered and rejected: the star in navy on a gold ground, which is easier
to pick out on a home screen but matches no screen in the app; and gold on bone paper, which is the
quietest and the hardest to find among other pale icons.

**The crop, which is not negotiable.** iOS rounds every icon's corners regardless of design-tokens
3's "border radius: 0 everywhere", and Android launchers crop harder still. The icon is drawn to
survive that rather than to argue with it: the navy runs to all four edges so a crop of any radius
takes cloth, and the star spans 64% of the square, well inside the 80% centre circle a maskable icon
must keep its content within. One geometry for all four sizes, so they cannot drift apart.

**Reversible.** Yes. The colours are two token names and the size is one number.

**What this means for you.** The app on your home screen is a gold nine-pointed star on navy. It is
the same star that will show how fresh each prayer is when session 11 builds that, and it is the
only picture file this app has ever had.

---

### D10.3 — A service worker, written rather than installed, that caches the app and never the data

**Decided by Claude, 8 September 2026.** Scope 12.2 says the app "works fully offline", and until
this session that was half true. IndexedDB held every prayer and every review, so the data was local;
but the app itself was a set of files on a server, and a phone in aeroplane mode could not fetch them
to run. The fortnight includes mornings without signal.

**Chosen: a hand-written service worker, generated at build time, precaching the whole app.** All
seventeen files, four and a half megabytes raw and just over one over the wire, including the four
corpus chunks, which are most of it.

**Two boundaries that are the point of the entry.**

**It caches the app. It does not touch IndexedDB.** IndexedDB is the source of truth and is already
local. A worker that took an interest in it would be a second copy of the data with its own opinions
about which was right. Nothing in the worker reads or writes a record, and a test asserts the
generated source never mentions it.

**It is not a breach of CLAUDE.md rule 11.** Rule 11 forbids the application making a network call.
Registering a worker asks the browser for one file from the origin the app was served from, and that
worker then caches the app's own files. It is the opposite of a call out: it is what stops the app
needing one. The boundary is that the worker may fetch the app and nothing else, and there is no code
path in it that could fetch anything else.

**Why written rather than installed.** The obvious alternative is Workbox by way of
`vite-plugin-pwa`. What is needed from it is a list of filenames, `cache.addAll`, and a fetch handler
that prefers the cache: about forty lines. Workbox is a large dependency tree whose defaults -
`skipWaiting`, runtime caching strategies, navigation preload - are mostly things this app wants
turned off, and CLAUDE.md rule 6 asks for a decision before any dependency. No dependency was added
this session. This follows D7.5.

**Why the file list is generated.** Vite hashes every chunk, and the corpus is four dynamic imports,
so the files that matter most offline are named things like `prayers-C8QwaqbG.js` and are renamed by
any change to the dataset. A hand-written list would have been wrong the first time the corpus was
re-fetched, and wrong *silently*: the app would still have started offline and simply had no prayers
in it. `assertCorpusPrecached` fails the build instead, naming the missing file.

**Reversible.** Yes, but not invisibly: removing it from a phone that already has it installed means
the worker has to be told to unregister, not merely deleted. Worth knowing before it is ever done.

**What this means for you.** After you have opened the app once, it works with no signal at all -
every prayer, the whole library, the queue. Aeroplane mode, the Tube, a valley in the country.

---

### D10.4 — A new build arrives on its own and starts on the next cold launch, with nothing asked

**Decided by Claude, 8 September 2026.** Once the app is on a home screen, a deploy has to actually
reach it. The choice is what happens at the moment a new build is found.

**Chosen: it downloads in the background and takes effect the next time the app is opened from
cold.** Nothing is announced, nothing asks to reload, no session is interrupted. In service worker
terms there is no `skipWaiting`: the new build installs itself, waits, and takes over when the last
page the old one controlled goes away, which is what closing the app does.

**Options considered.**

- *Take over immediately.* The tempting one and it is actively wrong here. The new worker would seize
  control mid-session and delete the cache the running page was loaded from - and that page is still
  lazily reading the corpus out of it. Someone would be reading a prayer and the library would empty
  underneath them.
- *Ask.* A banner saying a new version is available. Rejected on principle 7.1: this is a screen
  someone opened at six in the morning to pray, and a software update notice is exactly the chrome
  7.1 and 7.6 keep out. It would also be the only thing in the app that ever interrupted anybody.

**The cost, stated plainly.** A build is one cold start behind. Deploy in the morning, close the app
and open it again, and you have it.

**How to tell which build you are holding.** The last line at the foot of Settings, below the two
queue caps. It reads `v0.10.0 · 6f2ad19 · 8 Sep 2026`: the version, the commit and the build date.
Read the first part. If it says what it should, the update has landed; if it still says the old
number, close the app fully and open it again.

**Reversible.** Yes. It is the absence of one line in the generated worker.

**What this means for you.** You never have to update the app and you will never be asked to. When I
deploy something, closing it and opening it again is all it takes, and the version line in Settings
is how you check.

---

### D10.5 — Contained decisions, session 10

**The status bar is `black`, not `default` or `black-translucent`.** iOS's behaviour here has changed
across versions and cannot be verified from here. `black` gives a dark strip with light glyphs above
the navy header under every version, so both the old behaviour and the current one land somewhere
correct. `black-translucent` would hand the notch and the home indicator to the page, and nothing in
the app reads a safe-area inset. On the install checklist for confirmation on the device.

**`viewport-fit=cover` is deliberately absent**, for the same reason: without it iOS keeps the web
view clear of the notch and the home indicator by itself, which is what the fixed tab bar of
design-tokens 5.6 needs. Asserted by test so it is not added casually.

**The manifest has no `description`.** The field is optional and iOS ignores it, and the scope has no
tagline for the app, so writing one would have been inventing user-facing copy outside
`src/strings/`. Principle 7.11 and the strings module's own first rule both forbid that.

**The icon has no cloth grain.** Design-tokens 3's navy grain is a four pixel dot pattern meant to be
met at one to one on a screen. At icon scale it either vanishes into the navy or beats against the
display's own grid.

**The nine-pointed star moved into `src/theme/ornaments.ts`**, as eighteen numbers rather than a path
string, so that the icon and session 11's freshness star are drawn from one source. Nothing renders
it yet; session 11 will.

**`vercel.json` rather than `netlify.toml`.** Scope 12.1 names either. Vercel is named first and its
GitHub import is the shorter path for someone who does not run git. `docs/hosting.md` records the
Netlify equivalent, which is four lines.

---

## D11 — Session 11, freshness, the streak, and the passage detail view

### D11.1 — Everything you know is a section on the Memorise tab, and its rows open the passage detail

**Decided by Safa, 8 September 2026.** The session asked where the stars and the streak should sit,
because a star has to appear next to prayers and the only prayers on the Memorise tab are the ones
with work today. A prayer you know well has no work today, so a star drawn only on today's rows could
never be gold: today's rows are, by definition, the lines that are slipping.

**The decision.** A section called WHAT YOU KNOW on the Memorise tab, below today's work and above
the two doors, listing every passage on the list with its star and the state's own word. Its rows
open the passage detail view of scope 11.3. The streak is one quiet line at the top of the same tab.

The alternative offered was to leave the tab as it was, put the stars on My list, and reach the
detail view from there. Safa chose the section, which is the shape he described when he folded Log
into Memorise in the first place: "almost like a home page for the memorise section with your log
streaks and dash" (D7.1).

**What about decision D7.3.** Session 7 removed a list of every passage from this tab and gave the
reason plainly: "two screens listing the same passages one tap apart was the thing worth removing."
That reason still stands and this is not the thing it removed. What session 6 put here was a roll
call whose only purpose was to open the upkeep screen, which is precisely what My list already did.
This section asks a different question and opens a different door, and it is the only place in the
app where a passage with nothing due today appears at all. **My list keeps its own job**: the order,
the removing, and the door to how often a passage comes round. Nothing on the Memorise tab opens the
upkeep screen, which is what session 7's test now asserts.

**A passage with work today is named twice on the screen**, once in TODAY with its count of lines and
once below with its star. That was in the sketch Safa chose from and he chose it knowing. The two
rows say different things - what to do, and how it is going - and the alternative, hiding a passage
from WHAT YOU KNOW on the days it has work, would take the star away on exactly the mornings its
state is changing.

**Reversible.** Yes, and cheaply. It is one section in one file and one route.

**What this means for you.** The Memorise tab now tells you how you are going as well as what to do.
At the top, one line saying how many days in a row you have kept up, and nothing at all if the answer
is none. Below your work for the day, every prayer on your list with a small gold star showing how
fresh it is, and the word beside it. Tap any of them for the fuller picture.

---

### D11.2 — A day counts towards the streak because you did some, not because you finished

**Decided by Safa, 8 September 2026.** Scope 11.4 says the streak "counts days on which the day's
queue was completed". The app cannot know that about a past day, and this had to be settled before
the streak could be built at all.

**Why it cannot be known.** Finishing a line moves its due date. So the queue that stood on Tuesday
does not exist anywhere on Thursday - not in `review_log`, not in `segment_progress`, nowhere. The
app records every review with its time, and nothing records that a day was finished.

**Chosen: a day counts when the reader completed at least one line, or one whole passage, on it.**

**Options considered.**

- *Start writing down "finished today" from now on.* Closer to the scope's sentence. Rejected by
  Safa: it needs a new column, every day before it becomes unreadable, the count restarts at nought
  on the day it ships, and a long day half done breaks a streak.
- *Count the day if the queue is empty right now.* Coherent for today and impossible for yesterday,
  so history and today would be counted by two different rules.

The chosen reading is also the forgiving one, which scope 11.4 says in as many words is the direction
the product's principles already point.

**Reversible.** The rule, yes: it is one function. The history, no - the days before a "finished"
column existed could never be read that way, which is the whole reason this was Safa's to decide.

**What this means for you.** A morning you turn up and do some of your prayers counts, even if you do
not get to the end of the list. Miss a day and the number holds where it is; miss two in a row and it
starts again. Nothing will ever tell you your streak is at risk - scope 11.4 forbids that by name,
and there are no notifications in this app at all.

---

### D11.3 — A prayer you have just added shows the unlit star

**Decided by Safa, 8 September 2026.** Design-tokens 4 gives freshness four states and says nothing
else may encode it. A line the app has not yet shown the reader fits none of them cleanly, and every
prayer starts out as nothing but such lines.

**Chosen: it reads as Needs review, which is the dimmest of the three states that are not Resting.**

It is literally true - those lines are exactly what the queue is about to serve - and it gives the
star a life: `field` at .3 is an unlit star, `accent-md` at .5 is half lit, `accent` at 1 is lit. The
star fills in with gold as a prayer settles, which is the only kind of progress indicator principle
7.1 leaves room for, in the same way the shrinking queue is.

**The option not taken** was to draw no star at all until every line had been met. Nothing could then
read as a rebuke on day one, at the cost of a ragged list and a row that says nothing where every
other row says something.

**Reversible.** Yes, one branch in one pure function.

**What this means for you.** A prayer you add today shows a faint, unfilled star and the words "Needs
review". That is the app saying it has not shown you those lines yet, not that you have forgotten
them.

---

### D11.4 — The streak is derived every time, and `user_stats` is written and never read

**Decided by Claude, 8 September 2026.** Scope section 10 gives `user_stats` four columns -
`streak_current`, `streak_longest`, `last_active_date`, `total_reviews` - which invites a running
counter. The streak is computed from `review_log` instead, on every read.

**Why.** A counter that misses one write is wrong for ever, and there is nothing to check it against.
A derivation is wrong only for as long as the bug is. `src/data/reviewLog.ts` was written in session 2
with a comment saying exactly this, and this is the session that made good on it. A test writes
nonsense into the stored row and asserts that the next read corrects it.

**The columns are still written**, as a by-product of each derivation, because a row saying nought
about a reader who has done ninety days is a row that lies and it syncs at v1.0 (scope 13.1). Nothing
displayed ever comes from it.

**`streak_longest` is computed and deliberately never rendered.** Scope 11.1 asks for a daily streak;
scope 11.2 excludes every score. A personal best is a number to beat, and a reader who has just lost
a ninety day run does not need to be shown the ninety.

**Reversible.** Yes.

**What this means for you.** Nothing you can see. If a review ever fails to record itself, your
streak will be wrong for that day and right again afterwards, rather than wrong for ever.

---

### D11.5 — Contained decisions, session 11

**A promoted passage's freshness comes from its card, and it gets no line breakdown.** Scope 8.7
promotes a passage to a single whole-passage card and keeps the line state "retained but not
surfaced". Those lines are not reviewed again after the promotion, so reading them would show a
prayer memorised a fortnight ago as needing review the next morning, and a breakdown of them on the
detail view would say the same thing in numbers. The card is what the app actually asks for, so it is
what the star describes, and the screen states that the passage comes round whole instead of counting
lines that are no longer being asked for.

**Due today is Fading, not Needs review.** The app is asking for a line now and the reader has missed
nothing. The star goes dim only once a day has actually been let go, which costs one comparison and
is what principle 7.1 asks for.

**Fading is a fraction of the rest rather than a number of days.** A quarter: a line resting six days
fades for its last two, one resting a month fades for its last week. The intervals in this app run
from one day to a year, so "fading three days before it is due" would make a line on a one day
interval permanently fading and a line on a year's interval fade for the last one per cent of it.
The fraction is in `src/config/defaults.ts` with the streak rule.

**A passage is as fresh as its weakest line.** The same rule the promotion itself uses (D1.3): a
passage is only as settled as the line you are most likely to lose. So a prayer with seven settled
lines and one just added reads as Needs review, and the detail view is where the fuller picture is.

**The star's eighteen points now exist once.** Session 10 moved them into `src/theme/ornaments.ts`
so the home screen icon and the freshness star would be one drawing, but the selection mark of
design-tokens 5.7 still carried its own copy from session 2. It does not now.
`src/principles/one-star.test.ts` fails the build if a second copy appears anywhere.

**The freshness star lives in `src/features/memorise/` and nothing outside it may import it.**
`discover-isolation.test.ts` enforces principle 7.6 by reading what the Discover folder imports, and
**a star component in `src/components/` would have gone straight through it** - handed its state as
a prop, importing nothing forbidden, and breaching 7.6 the first time a passage row in the library
drew one. This was the first session to render memorisation chrome at all, so it was the first
session where that gap was reachable. The same test closes it from the other side. The decorative
star in the tab bar and the selection star of design-tokens 5.7 are not freshness usages, which
design-tokens 4 says in as many words.

**`src/progress/` is the folder name because both documents already used it.** CLAUDE.md sections 9
and 11 say no component under `src/features/discover/**` may import from "`scheduler`, `progress`, or
progress-related types". The wall was written against this folder before the folder existed; the
ESLint rule and the isolation test now name it.

**The freshness word is printed beside the star, and that is not a second encoding.** Design-tokens 4
bans a second *measure* of freshness by name - a number, a bar, a percentage. Scope 11.5 supplies the
four words precisely so the states can be said, and scope 11.3 requires the current one to be named
in words on the detail view. The star is aria-hidden and the word is what a screen reader is given,
so nothing is announced twice and nothing is announced as a shape.

**Every date the reader sees is converted to their own timezone.** `review_log.created_at` and
`milestone_reached_at` are UTC instants. Counting days off the stored string would tell a reader in
Melbourne they had broken a streak they had not broken, and would put the date of their milestone a
day early. `today()` in `src/data/clock.ts` already carried that reasoning for the queue; both new
readings go through it.

**The lapse count is said as what a lapse is.** "3 times, a line has gone back to the beginning",
which is what decision D1.5 actually does, rather than the word "lapse". That word carries the same
judgement scope 11.5 deleted from the freshness states.

**Nothing was added to the database.** Scope 11.3 promises the passage detail view "falls straight
out of `segment_progress`. No new instrumentation." It did. No column, no Dexie version, no upgrade,
nothing migrated on a phone.

---

### D11.6 — The model line is derived and not copied, Opus is the default, and the table's rows are one behind

**Decided by Safa, 10 September 2026**, after noticing a pattern: "this happens every session wrap
where sonnet is recommended then when i ask you agree opus is better. how can we fix this and reduce
the back and forth?"

He was right that it was a pattern, and the cause turned out to be two mechanical faults rather than
a matter of taste.

**Fault one: the rule that carried the judgement could never fire.**
`/docs/session-prompt-template.md` said the model and effort should be taken from scope section 16's
table, and then, in the next paragraph, "**where the table is silent**, the standing rules decide:
Opus for new screens, architecture, and complex interaction". **The table is never silent.** It
carries a Model and an Effort column for every row. So the clause holding the actual reasoning was
unreachable, the table won every time, and the standing rules were only ever applied when Safa
stopped and asked - at which point whoever was asked would look at the session, notice it contained
two new screens, and say Opus.

**Fault two: an off-by-one the build introduced and nobody wrote down where it was needed.** Decision
D10.0 renumbered the sessions when installability was brought forward, and could not renumber scope
section 16's table, which only Safa may edit. **Table row N has been session N + 1 ever since.**
Session 11's handoff read row 10 - freshness and the streak, Sonnet / High - and put it on session
12, Ruhi, which row 11 marks **Opus / Max**. The prompt then carried a paragraph explaining why the
table's Sonnet recommendation had been left in place, about a recommendation the table does not
make. D10.0 records the renumbering; it did not record it next to the instruction that trips over it.

**What changed.**

- The precedence is inverted. **The standing rules decide; the table is checked afterwards.** Where
  they disagree the standing rules win and the handoff says so in one line with the reason.
- **Opus is the default. A Sonnet call now needs a positive reason written down; an Opus call does
  not.** This is not a preference, it is the table's own record: of eleven rows nine say Opus and
  none has ever needed changing, while of the two Sonnet rows one was right (session 3, a fetch
  script with no UI) and one was overridden to Opus (freshness and the streak, which held two new
  screens). A recommendation wrong half the time is not a default.
- **"Table row N is session N + 1" is now written in both places that need it**, CLAUDE.md section 5
  and the prompt template, rather than only in the decision that caused it.

**Options considered.**

- *Leave the rule and rely on judgement each session.* Rejected: that is what has been happening,
  and it produced a wrong recommendation in a handoff that also stated, confidently, a value the
  source document does not contain.
- *Ask Safa each session which model to use.* Rejected. It is the question he asked to stop having.
- *Edit scope section 16's table so the rows match the sessions.* Not available. CLAUDE.md section 2:
  only Safa issues scope revisions. **It remains worth doing when he next revises the scope**, along
  with the two words `review_log` has needed since D9.3.

**Reversible.** Yes. It is two paragraphs in two documents.

**What this means for you.** You should stop having to ask. The model line at the top of each
session's prompt will now be worked out from what the session actually contains, and it will say
Opus unless there is a stated reason it does not need to. If it ever says Sonnet, the reason will be
written next to it, and that is the sentence to disagree with.

**And a correction to session 11's handoff.** The prompt it issued for session 12 said
`Recommended: Sonnet / High effort` and claimed the table said so. The table says **Opus / Max**.
The prompt was also short three items the table names: the To Memorise and Reflection filter, bulk
add, and search within the route. It has been reissued in full.

---

### D11.7 — Book 3's two curation gaps are closed, and scope 5.1's status paragraph is out of date

**Done by Claude, 10 September 2026**, at Safa's instruction, as a non-coding pass before
session 12 rather than inside it. Scope 16 lists this work under "Parallel, non-coding".

**What scope 5.1 says today.** "**Two pieces remain.** Book 3's 136 quotations carry no
category. And Book 3's extraction deliberately stops before its twenty four per-lesson
memorisation quotations . . . Until the first is done, the To Memorise filter of 5.4 does
nothing in Book 3, which reads as broken rather than absent."

**Both are now done**, in `/Ruhi Books/Extracted Quotes/ruhi_book3_quotations_v2.0.md`.
v1.0 is kept beside it.

**The categories.** All 136 now carry To Memorize or Reflection, assigned on the basis
Books 1 and 2 used for their own v1.1: the instructional sentence that introduces the
quotation in the book. Book 3 says it three ways rather than one - "try to memorize",
"commit them to memory", and "learn or recite by heart" - and all three count, which is a
question v1.0's own notes had flagged and left open. **110 are To Memorize and 26 are
Reflection.** All 26 of the Reflection entries are in Unit 1, which is discursive; Unit 2
is the lesson-preparation unit and every section of it either sets a prayer to be committed
to memory or closes on "Try to memorize at least one passage from each of the sets above".

**The lessons.** Footnotes 98 to 127, in their own subsection at Safa's request: one
memorisation quotation for each of the 24 lessons, and the six prayers, one per block of
four lessons. Thirty entries. **The six prayers already appear earlier in the file**, in
Unit 2 Sections 2, 6, 10, 13, 16 and 19, because the book reprints them in the lessons with
a second footnote number. All six were checked character by character against their earlier
appearance and are identical. A loader should expect one passage to map to two curriculum
positions, which is what `ruhi_quotations` is for.

**How the PDF was read, and how the result was checked.** macOS's own PDFKit, through
`osascript -l JavaScript`, with nothing installed and no conversion step. Plain text loses
bold, and bold is how Ruhi marks a quotation, so the check was done against the PDF's font
runs rather than against the text: **every bold run in the lessons that ends in a footnote
number is in the extraction, and nothing else is.** The 21 bold quotations that carry no
footnote are the coloring-sheet captions, which reprint the lesson's own quotation and are
not separate entries. Three prayers run to a second paragraph and so end a continuation run
rather than an opening one; all three were caught and are joined into one flowing quotation,
which is how Unit 2 already prints them.

**Nothing from v1.0 was altered.** Asserted programmatically: strip the category tags from
v2.0's first 136 entries and the result is byte-identical to v1.0. No quotation text and no
citation was touched.

**What this means for session 12.** The To Memorise and Reflection filter of scope 5.4 can
be built whole, and it will be honest in all three books. The question this prompt was
going to have to put to Safa - what Book 3 does while it has no categories - does not
arise.

**What this means for you.** The Ruhi dataset is finished for all three books. Every
quotation in Book 3 now says whether it is one to learn by heart or one to think about, and
the twenty four lesson quotations the children actually memorise - which are the most useful
part of that book for this app - are in it. **Scope 5.1's curation status paragraph should
be updated when you next revise the scope**, along with section 16's row numbers (D11.6) and
`review_log`'s two words (D9.3).

---

## D12 — Session 12, Ruhi collections: the mapping, the browse, and what you can do with a quotation

### D12.1 — A quotation links to a prayer only when it is the whole of one, and 25 of 315 are

**The decision.** The 344 curated quotations become 315 distinct texts. **25 of those turned out to
be word for word a passage the devotional corpus already carries**, and each of those points at the
prayer or Hidden Word it already is rather than becoming a second copy of it. The other 290 become
passages of their own, in the `ruhi` collection, exactly as decision D1.10 describes.

**The rule, and it is the strictest one available.** Two texts are the same when they are the same
words from end to end, compared through `normalise` - the same fold the chip quiz uses to decide
whether the word you tapped is the word that was taken out: lowercase, accents folded, punctuation
stripped, whitespace collapsed. **Anything short of the whole passage is not a match.**

**Why that line and not a looser one.** 119 of the quotations are *inside* a passage the corpus
holds - one sentence of a Gleaning that runs to nine hundred words. Linking those would have been
easy and would have been wrong in a way the reader would feel immediately: they asked to learn
"Beware, O people of Bahá, lest ye walk in the ways of them whose words differ from their deeds" and
the app would have put the whole Gleaning on their list. So an excerpt keeps its own record, holding
exactly the words the curriculum asks for and nothing else.

**How sure this is.** Certain for the 25, because identity after normalisation is not a judgement.
The residual risk is the other direction - a quotation that *should* have matched and did not,
because the corpus renders it slightly differently - and the cost of that is one extra passage in a
list of 290, which is the state the whole feature would have been in anyway.

**Two passages in the corpus sometimes hold the same words.** 104 of them, because the prayers feed
and the Prayers and Meditations feed both carry them. Two quotations met that. The earlier feed wins,
in the library's own order, so the choice is the app's arrangement rather than whichever file was
read first.

**This departs from D1.10, in the one place D1.10 left open.** That decision said a quotation that is
also a prayer "will exist twice... that is correct rather than duplication to be cleaned up", and
then said: "If that turns out to feel wrong in use, linking them is an additive change later." Two
things have happened since which D1.10 could not have known. Session 11 built WHAT YOU KNOW, which
lists every passage on the list with its freshness star - so a duplicated Short Obligatory Prayer
would now appear twice on that screen, with two different stars, and neither would be wrong. And this
session's prompt asked for the link. It is a narrow change: it touches 25 texts of 315, and only
where identity is exact.

**One fragility, named.** A linked quotation depends on a corpus passage it does not own. If the
prayers feed ever withdraws that passage, `removePassagesNotIn` takes it, and the quotation quietly
drops out of its section rather than breaking anything. Re-running `node scripts/build-ruhi.ts` puts
it back as a Ruhi passage of its own.

**Reversible.** Yes, and it is one function. Making everything its own passage again is deleting the
match; it would change 25 passage ids, so a reader who had already put one of them on their list
would find it there twice.

**What this means for you.** If a Ruhi quotation is a whole prayer or a whole Hidden Word that is
already in the app, it is the same one: put it on your list from the Ruhi side and it is the same
prayer, with one star and one schedule, not a second copy of it. If the quotation is a sentence taken
out of something longer, it is its own thing, and learning it means learning that sentence.

---

### D12.2 — The way into Ruhi is one row at the foot of the Memorise tab, reading "Ruhi books"

**Decided by Safa, 10 September 2026**, from three sketches.

The Memorise tab is the one screen the app is opened on every morning, and it already holds the
streak, today's work, what can be recited whole, everything you know, My list and Settings. The
question was where a study curriculum goes on it.

**The three options.** One row at the foot, between My list and Settings, opening a screen that lists
the three books. A section on the tab itself, listing Books 1, 2 and 3 as three rows. Or one row at
the very top, above the day's work.

**Safa chose the row at the foot.** A book of quotations is something you go and look for, and the
top of that tab is kept for what is due today. It costs one extra tap to reach a book and it keeps
the daily screen exactly the shape it was, which is decision D7.3's argument continuing to hold.

**The row reads "Ruhi books"**, chosen over "Ruhi collections" and "Ruhi quotations". "Collection"
already means something else in this app - it is what Prayers, Gleanings and The Hidden Words are in
Devotions - and "quotations" promises what is two levels down. The screen behind it lists three
books, and that is how it would be said out loud in a study circle.

**No count beside it.** My list carries one because it changes. The number of Ruhi books does not,
and a number that always reads three is a number saying nothing.

**Reversible.** Yes, in about ten minutes. It is one row in one file.

**What this means for you.** Open Memorise and the bottom of the screen now reads My list, Ruhi
books, Settings. Nothing above them moved.

---

### D12.3 — Book 3's twenty four lessons are sections of its second unit, printed under their own names

**The problem.** `ruhi_sections` has four columns - id, unit_id, number, title - and scope section 10
is finished for V0. Book 3's second unit prints its numbered sections and then twenty four lesson
plans, which are a subsection of the unit rather than sections of it, and which are the child-facing
memorisation content D11.7 added (thirty entries, footnotes 98 to 127).

**The decision.** They are sections of Unit 2, listed after the numbered ones, each keeping its own
name: "Lesson 1", not "Section 23". The distinction lives in the two columns there are - **`title` is
what the reader sees and `number` is only what orders** - with a lesson taking `100 + n` so it lands
after every section whatever a later edition renumbers.

**The two arrangements not taken.** A unit of their own would have said Book 3 has three units when
it has two, which is the app confidently stating a wrong address - the exact failure scope 5.2 exists
to prevent. Renumbering them into the section sequence would have printed "Section 23" against a page
the participant is holding that is headed "Lesson 1".

**Reversible.** Yes. It is one constant in `scripts/lib/ruhiSource.ts` and a rebuild.

**What this means for you.** Open Book 3, then "Lessons for Children's Classes", and you get its
teaching sections first and then Lesson 1 through Lesson 24, named as the book names them.

---

### D12.4 — Adding a whole section takes the app's own lines, and says how many

**The tension.** Scope 5.4 asks for a whole section on the list "in one action". Scope 8.4 says
segmentation is suggested then confirmed at add time, and the confirm screen session 5 built is where
a reader joins or splits a line before starting. A section holds two quotations at the median and
sixteen at the worst, so a confirm screen for each would not be one action.

**The decision.** The two doors are different and they say so.

- **Adding one quotation goes through the confirm screen, unchanged.** Same screen a prayer goes
  through, same proposal, same ability to move a break.
- **Adding a whole section takes the proposal for every quotation in it**, and the button states how
  many lines that is: `ADD THIS SECTION · 7 LINES`. That is the same number the confirm screen puts
  above its own list, so nothing is hidden - what is given up is moving a break before starting.

**Why that is a smaller loss than it sounds.** 137 of the 290 Ruhi passages are a single line, so for
nearly half of them the confirm screen has nothing to confirm. A quotation whose lines a reader does
want arranged differently can be taken off My list and added again on its own, which walks through
the confirm screen.

**Two things it is careful about.** The count is of what is **not already on the list**, and a passage
already there is left exactly as it is - its lines, its schedule and its history untouched - so adding
a section twice never throws a schedule away. And **the filter narrows the add**: what the button adds
is what the screen shows, because a button that added something the reader had filtered out would be
doing something they did not ask for.

**Deferred.** Scope 5.4 also offers "a whole book" in one action. This session's brief asked for a
section and that is what was built. A whole book is up to 166 quotations and several hundred lines in
one tap, which is a different kind of commitment and deserves its own question.

**Reversible.** Yes. It is one function and one button.

**What this means for you.** At the foot of a section there is a button saying how many lines adding
the lot would put on your list. Tap it and they are all there, cut into lines the way the app would
have proposed. Add one at a time instead and you still get the screen where you can join and split
them first.

---

### D12.5 — The filter is built whole and drawn in three places out of 115

**Scope 5.4 asks for it**: "filter a section's quotations by To Memorise or Reflection". It is built,
and it appears only where a section holds both categories, **which is 3 of the 115 sections**.

**That is not the filter being half-finished.** It is the curriculum having already sorted its own
material: a Ruhi section is nearly always a run of quotations under one instruction. 112 sections
hold one category only. Decision D7.2 set this rule on the Bookmarks screen - a filter row appears
only when it means something - and a control that can only ever have one answer is chrome on a screen
this app cannot afford to put chrome on.

**Where the categories are actually useful is one level up**, and that is where they went. A section's
row on its unit's screen names the category it holds, where it holds one: `SECTION 3 · TO MEMORISE ·
5 QUOTATIONS`. That is what a participant looking for what to memorise needs, and they can see it
without opening anything.

The same rule governs the word on a quotation's row: it is drawn only where the list it is in holds
both. A column of sixteen rows all reading TO MEMORISE is design-tokens 5.3's caps line spent on a
word the screen has already said, which is the mistake decision D4.8 named about a column of passages
all reading THE HIDDEN WORDS.

**Reversible.** Yes, and it is one boolean.

**What this means for you.** Every section tells you what it is for on the way in, and inside the
three sections that hold a mixture there is a row of chips to show one kind or the other.

---

### D12.6 — Contained decisions, session 12

- **The three curation files are committed to the repository**, at `scripts/ruhi-source/`. They were
  curated in an iCloud folder beside the repository, and scope 4.2's whole argument for committing
  the corpus is that "anyone with the repository can rebuild the database from scratch" - which is
  not true of a build whose input is in somebody's iCloud. They are also the proprietary asset scope
  5.1 describes, which is a further reason to keep them somewhere versioned, diffable and backed up.
  They add 250KB to the repository and nothing at all to the app.
- **The mapping has its own manifest and its own version.** Scope 5.2 requires the dataset to be
  "versioned independently of the app" and to carry the Ruhi edition it was built against.
  `ruhi-manifest.json` holds both, plus a hash. It is a second file rather than more keys in
  `manifest.json` because `fetch-corpus.ts` rewrites that one from scratch, and a Ruhi entry inside
  it would vanish the next time the prayers were re-fetched.
- **The edition is shown at the foot of the book it belongs to.** Scope 5.2 puts it on the credits
  screen, which is scope 4.3's and is `[v1.0]`. Until that exists, "Mapped against Ruhi edition
  4.1.2.PE, May 2020" sits under Book 1's units, which is where somebody holding a printed copy would
  look to find out whether the app is talking about the same book.
- **The build stops rather than guessing at an attribution.** Principle 7.10 admits no exception, and
  a citation is a line of prose. `scripts/lib/ruhiCitation.ts` holds a table of the 39 works the three
  books cite with the author each carries, and anything it cannot resolve fails the build with the
  citation printed - the same shape `refuseBooks` has had in the corpus fetch since session 3. It also
  stops if the same words are ever attributed to two different people.
- **One bug that would have shipped, found by the real material.** `\b` in a JavaScript regular
  expression is ASCII-only, so it never matched after the á of `'Abdu'l-Bahá`. Thirty-two quotations
  were being attributed to whatever volume they were compiled in rather than to him. The unit tests
  written first did not catch it; running the resolver over all 344 real citations did.
- **The mapping is loaded lazily, the first time somebody opens the route**, rather than beside the
  first render as the library is. It is 434KB and a reader who never opens a study circle screen never
  needs it. The service worker precaches the chunk all the same, so that first time can be offline,
  and `assertCorpusPrecached` now fails the build if it is missing.
- **And it waits for the library, which it did not at first.** The 25 linked texts of D12.1 point at
  rows the corpus load writes, not the Ruhi load, so a reader who reached the Ruhi route before the
  library had finished would have found **32 quotations missing from their sections, silently** -
  `listRuhiQuotations` drops a quotation whose passage is not there rather than drawing a blank row.
  The library starts loading beside the first render and would nearly always have won that race,
  which is what makes it the kind of bug that appears once, on a cold morning, and cannot be
  reproduced afterwards. Found by `src/data/loadRuhi.test.ts`, which puts the real 344 through the
  real loader; every smaller test passed.
- **The same words in two places in the curriculum are one passage.** Book 3 reprints its six lesson
  prayers with a second footnote number (D11.7); "Truthfulness is the foundation of all human virtues"
  is in Book 1 and in Book 3's Lesson 4. Deduplicated on the normalised text, they are one passage
  with a `ruhi_quotations` row for each place, which is exactly what scope 5.3 says that table is for
  and why `designation` sits on the quotation.
- **A quotation is addressed by itself**, `/memorise/ruhi/quotation/:id`, rather than under the
  section it was found in. It is reachable from its section and from a search that crosses all three
  books, and a path that spelled out one of those would make the other one lie.
- **The add moment now returns to where it was opened from.** It used to go back to the reading view,
  which is a Discover screen that correctly refuses to draw a Ruhi quotation - so a reader adding one
  would have landed in the library. The screen that opened it says where it came from, and the
  passage's own collection is the fallback for a cold start. The data decides, which is D1.10's own
  arrangement.
- **The search field of design-tokens 5.2 is drawn for the first time**, at every measurement that
  section gives it, inside the compact header of the Ruhi books screen rather than the tall header
  5.2 describes. Scope 5.4's search is on a pushed screen, which has no tall header; the scope owns
  behaviour and the tokens document owns appearance, so where they meet the scope wins (CLAUDE.md
  section 2). The library's tall header still has none, because scope 6.3 is `[v1.0]`.
- **Search results are grouped by section rather than listed flat**, each group headed by its Ruhi
  reference in design-tokens 5.3's own section header row. Scope 5.4 wants every quotation to show
  its source work and its reference together, and on a flat list that reference would be repeated on
  every row.
- **`src/principles/ruhi-in-memorise.test.ts` closes the wall from the other side**, the way
  `one-star.test.ts` does for the freshness star: every Ruhi screen is inside
  `src/features/memorise/`, nothing outside that folder and the data layer reads the mapping, and no
  Ruhi screen imports the star, the queue, the scheduler or anything else that carries how the reader
  is going. Both breaches were introduced deliberately and confirmed to fail the build before being
  removed. Test files are exempt, for the reason decision D4.8 gives: a test driving the app from
  outside is not part of the folder, and what these rules protect is what ships.

---

### D13.1 — Six of the ten typefaces cannot draw the writings' own accents, so every stack now carries a face that can

**Decided by Claude, 10 September 2026.** Found while building the picker, and it is the reason this
session was worth doing carefully rather than quickly.

**What was found.** The app subsets each font down to the characters it can actually render, which
is what decisions D3.6 and D4.7 established. Subsetting removes letters. **It cannot add one.** And
six of the ten families scope 12.3's seven options are built from were cut without the underdot
letters the writings use - ḥ, Ḥ, ṭ, Ṭ, ṣ, Ṣ, ẓ, ḍ - and without the small flower that closes every
reading view.

The corpus contains twenty four of those letters in prayer text, one in a title and one in the name
of a work. So a reader who chose Bodoni Moda, IM Fell English, Goudy 1911, Cinzel Decorative,
Tangerine - or Italiana, which the app has shipped for eleven sessions - would have met a word like
`Ḥusayn` set in their typeface with one letter of it in the phone's default font. And the flower at
the foot of every prayer would have been whatever the phone happened to have, which on some Android
builds is an empty box.

This is decision D4.7's bug for the third time, and the first time it could not be fixed by widening
the subset, because there was nothing to widen it to.

**Chosen: a second face behind every one, before the phone's own.** Every font stack now reads
`<the chosen face>, Cormorant, Georgia, ...`. A browser picks a font **per character**, not per
screen, so the middle entry costs nothing on any letter the chosen face can draw and is reached only
by the handful it cannot. Cormorant is the one because it carries every character the app can
render, it is already in the app for three of the seven options, and it is a serif of the same
period as everything it stands in for.

**Options considered.**

- *Leave it.* Rejected. It is a licence-bearing attribution line and the writings' own transliteration
  on the devotional half of the product, which principle 7.7 says has to be good.
- *Drop the six faces that cannot draw them.* That is scope 12.3's seven options reduced to two, to
  solve a problem that shows up on perhaps thirty characters in a corpus of six hundred passages.
- *Redraw the missing letters.* Real work, and it would put a hand-drawn glyph inside a licensed font.

**And the check that makes it stay true.** `scripts/lib/fontCoverage.ts` reads each font's own
character map before the font is cut down, prints what every family cannot draw, and **stops the
build** if Cormorant itself ever stops being complete. The gap used to be invisible; it is now
printed every time the fonts are fetched.

**Reversible.** Yes. It is one constant in `src/theme/typefaces.ts`.

**What this means for you.** In any of the seven typefaces, a word like `Ḥusayn` and the little
flower at the end of a prayer are drawn properly, in a face that matches, instead of one letter of
the word jumping into your phone's default font. This was already slightly wrong in the app you have
now, and it is fixed for that too.

---

### D13.2 — The app paints what you chose, before it knows what you chose

**Decided by Claude, 10 September 2026.**

**Why it came up.** The app's settings live in the phone's database, and that database can only be
read a few milliseconds *after* the first thing appears on screen. So the app has always painted the
default look first and corrected it immediately afterwards. With one typeface and one palette in use,
there was nothing to correct and nobody could see it.

With seven typefaces, six of them would flash Italiana on every single launch before becoming the
face you chose. **A face that flashes in and out on every launch is worse than one face.**

**Chosen: the choice is mirrored into a second, simpler store that can be read instantly**
(`src/data/themeHint.ts`), and the app paints from that before it renders anything at all. The
database is still the source of truth: it is read a moment later, and where the two disagree the
database wins and the mirror is rewritten. The same storage and the same reasoning as the anonymous
device id, which has worked this way since session 2.

**The mirror is never trusted.** It can be missing, left over from an older version, or nonsense.
Every field is checked rather than assumed, and anything unexpected costs one launch painted in the
default look - which is exactly what happened on every launch before this existed.

**Reversible.** Yes, and harmlessly: deleting the file returns the app to the old behaviour.

**What this means for you.** The first time you open the app after this update it will still show
Italiana for an instant, because there is no mirror on your phone yet and this launch is the one that
writes it. Every launch after that opens straight into the typeface, palette and text size you chose,
with nothing flickering.

---

### D13.3 — A typeface's name comes from the registry and the words about it come from the strings module

**Decided by Claude, 10 September 2026.** Contained, but worth a note because two rules met.

Design-tokens 5.8 words each caption on the picker as a name and a description: "Italiana · art
nouveau". CLAUDE.md rule 2 says a font family is named inside `src/theme/` and nowhere else, and it
is enforced by lint. Principle 7.11 says every user-facing word lives in `src/strings/`. Written
whole in either place, the caption breaks one of them.

So it is assembled from both: the name half stays in the typeface registry beside the family it
names, the description half is in the strings module where a future tone pass would look for it, and
the picker joins them. Neither module holds the other's half, and the name exists once rather than
twice.

The lint rule fired twice while this session was written - once on the captions, once on a test whose
title happened to contain the word "Italiana". Both were reworded rather than excused. It is a blunt
rule and being blunt is what makes it work.

---

### D13.4 — Contained decisions, session 13

- **The font script derives what to fetch from the registry rather than listing it.** Session 2 built
  the theme registry so that "adding a theme is appending an object", and this session was the one to
  find out whether that held. It held everywhere except here: the fetch script kept its own list of
  families beside the registry, so appending an option would have produced a picker row rendering in
  the phone's default font with nothing anywhere failing. The list is now computed from the seven
  options' own slots, and the script stops with the face named if it cannot supply one. A deliberate
  breach - an eighth option with a font nobody has - was introduced and confirmed to stop both the
  script and the test suite before being removed.
- **Fifteen font files, four hundred kilobytes, all of them stored on your phone at install.** Seven
  options across ten families is more than seven files: a face is a family at one weight in one
  style, and several options share Cormorant. They are precached with the rest of the app, so every
  typeface works with no signal.
- **Every option but one has a real italic for the line under a title.** That line appears on fourteen
  screens and was previously slanted by the browser rather than drawn, even in Italiana. Goudy
  Bookletter 1911 was cut as a single upright and has no italic anywhere, so that one option is still
  slanted; it is written down in the script rather than left to be noticed.
- **The variable fonts are pinned to one weight when they are cut.** Cormorant's file defaults to a
  lighter weight than the app asks for, and whether a browser corrects that depends on it reading one
  rule of the stylesheet the way the specification says. Measured in Chrome, it does. Pinning makes
  the file *be* the weight, so it is the same in every browser and the file is smaller. Nothing looks
  different: the pinned and unpinned renderings were measured against each other and are identical.
- **A newline and a bidi mark stopped being asked for.** Both are in the corpus, neither is drawn, and
  no font has a glyph for either. Harmless until something checked - and now something does, so they
  would have been reported as a gap in all fifteen faces and hidden the real ones.
- **The specimen on the picker grows with the text size but is not corrected by the optical scalar.**
  Design-tokens 5.8's seven sizes were already chosen by eye to make the faces comparable, which is
  the same job the scalar does elsewhere; applying both would correct a correction and Tangerine's
  sample would be 57px. Scaling all seven by the user's setting keeps them comparable and keeps the
  picker usable for somebody who has turned the text up.
- **The text size control has no words for its six steps.** Naming them means inventing six labels,
  and scope 11.5 defers vocabulary deliberately. It is the same two marks the queue caps use with a
  letter between them, drawn at the size the setting produces, so the control demonstrates itself.
- **The charset check now covers the whole strings module and the Ruhi mapping**, not the corpus and
  two hand-picked lines. Session 12 added 344 quotations rendered in these faces and the subset was
  never cut from them; it happens to contain no new character, and the point is that the next edition
  cannot quietly introduce one.
