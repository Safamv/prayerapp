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
