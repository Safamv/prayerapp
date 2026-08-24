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
