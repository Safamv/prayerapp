# Session Prompt Template
## By Heart build sessions

**Version:** 1.0
**Date:** 23 August 2026
**Repo path:** `/docs/session-prompt-template.md`

---

## The template

```
Recommended: [Sonnet|Opus] / [Normal|High|Max] effort

**Session N — <title>**
**Version on completion: v0.N.0**

**Read first**
- /docs/scope.md sections <list>
- /docs/design-tokens.md sections <list>   (omit if the session builds no UI)
- Last entry in /docs/sessions.md

**Goal**
<One sentence. If it needs two, the session is too big.>

**In scope**
1. …
2. …
(maximum six items)

**Explicitly out of scope**
- …
- …

**Definition of done**
The five gates in CLAUDE.md section 5, run in order, output pasted verbatim. Version bumped
to 0.N.0, tagged, branch pushed, merged into main and main pushed, by you and not by Safa.
Entry appended to /docs/sessions.md. Next session's prompt in a fenced code block. Open
questions for Safa, or an explicit statement that there are none.
```

---

## How to use it

**Name the scope sections, always.** This is the mechanism that replaces reading the whole scope
every session. CLAUDE.md instructs the agent to stop and ask if the list is missing, so an omission
is loud rather than silent. Getting the list slightly wrong is fine. Leaving it out is not.

**The "explicitly out of scope" block is the one that earns its place.** Agent sessions fail far
more often by helpfully building adjacent things than by building too little. Session 4 building
Discover will be tempted to add search, because search belongs in a library. Naming what not to
touch is worth more than another paragraph on what to do.

Populate it from three places:
1. Anything tagged `**[v1.0]**` or later inside the scope sections being read
2. The obvious adjacent feature the agent will reach for
3. Anything a previous session deferred

**Six items maximum.** More than that and the session runs long, quality drops in the back half, and
`/compact` lands mid-task. Split at the natural seam and accept nine sessions becoming eleven.

**Run `/compact` between sessions**, and again inside a session that passes roughly ten exchanges.

**Model and effort** follow the standing rules: Opus for new screens, architecture, and complex
interaction; Sonnet for feature additions, bug fixes, CSS, and scripts. Max effort for new screens,
architecture, and multi-file refactors. When the two rules disagree, effort wins. When in doubt,
Opus Max.

---

## Worked example: session 1

```
Recommended: Opus / Max effort

**Session 1 — Repo scaffold and SM-2 scheduler**
**Version on completion: v0.1.0**

**Read first**
- /docs/scope.md sections 8.2, 8.3, 8.5, 8.7, 9.6, 10 (segment_progress and user_prayers only)
- Last entry in /docs/sessions.md (none yet; this is the first session)

**Goal**
Stand up the repository and build the SM-2 scheduler as a pure, isolated, fully unit-tested module
with no UI and no dependencies.

**In scope**
1. Vite + React + TypeScript (strict) scaffold, Tailwind, Vitest, ESLint, Prettier.
2. ESLint `no-restricted-imports` rule: nothing outside `src/scheduler/` and its own types may be
   imported into `src/scheduler/`. This must fail the build, not warn.
3. `src/scheduler/` implementing SM-2 over per-segment state: ease factor, interval, repetitions,
   due date, lapses. Input is a self-rating of Again, Hard, Good or Easy. Nothing is auto-scored.
4. Whole-passage promotion: on milestone, a passage schedules on the slowest of its segments'
   intervals; a rating of Again demotes it back to segment review.
5. Upkeep multipliers: active 1x, occasional 3x, resting never queued.
6. Unit tests including a synthetic simulation over at least 200 review days, asserting that
   intervals grow sensibly, that lapses reset correctly, and that no interval goes negative or
   infinite.

**Explicitly out of scope**
- Queue construction, daily caps and overflow. That is session 6.
- Focus mode. Session 6.
- Any UI, any component, any screen, any routing.
- Dexie, IndexedDB, or any persistence. The scheduler takes state in and returns state out.
- Streak logic.
- FSRS. The module must be swappable for it, not contain it.

**Definition of done**
The five gates in CLAUDE.md section 5, output pasted. Version bumped to 0.1.0 and tagged.
Entry appended to /docs/sessions.md.
```

---

## Why the scheduler is session 1

It carries all the risk, it has no dependencies, and it can be fully tested against synthetic data
before a single screen exists. Layer-sequencing would put it behind six sessions of plumbing.
Risk-sequencing puts the thing that can invalidate the project at the front, where being wrong costs
least.

The 200-day simulation in item 6 is the point of the session. It is the cheapest possible answer to
"do the intervals feel right", and it arrives before anything has been built on top of an answer of
no.
