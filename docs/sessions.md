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
