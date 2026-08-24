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

**What this means for you.** The Ruhi part of the app is months closer than the scope thought. Three
questions need your answer before it can be built, and they are in the session summary rather than
here, because they are yours to decide and not mine.
