# By Heart

A Bahá'í prayer book with a spaced repetition memorisation engine built into it. Both halves are
first class: reading is not a concession to memorisation, and memorisation is not a bolt-on to
reading.

React, Vite and TypeScript, built as a PWA. Local-first, fully offline, free, solo build.

## Where things live

| Document | Owns |
|---|---|
| `CLAUDE.md` | How a build session runs. Rules, guardrails, versioning, what to read before starting. |
| `docs/scope.md` | The product. What gets built, what it does, what ships in V0 and what waits for v1.0. Wins any disagreement. |
| `docs/design-tokens.md` | The look. Colour, typography, spacing, iconography, motion, and the patterns they produce. |
| `docs/session-prompt-template.md` | The template used to start each build session. |
| `docs/decisions.md` | Append-only log of decisions taken during a session, and contradictions found in the scope. |
| `docs/sessions.md` | Append-only log of what each session actually shipped. Written at the end of every session. |
| `docs/archive/` | Superseded material. Reference only, never read when building. |

Scope beats design tokens. Design tokens beat improvisation. Anything tagged `[v1.0]`, `[v1.1]`,
`[v2]` or `[v3.0]` in the scope is not in the current release: read it for context, do not build it.

## Build status

Documentation complete and agreed. No application code yet. Session 1 of nine has not started, so
there is nothing to run. Each session ships a minor version, so session 3 ends at `v0.3.0`, and
`docs/sessions.md` is the running record.

## Running the app

Not yet applicable. Once session 1 lands, this section covers installing dependencies and starting
the local development server.
