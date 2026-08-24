import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  exportedNames,
  importsOf,
  label,
  lineOf,
  parse,
  sourceFilesUnder,
  SRC_DIR,
} from './sources'

/**
 * **Principle 7.6, as a failing build.** Decisions D0.4 and D1.10.
 *
 * > Memorisation chrome never appears in Discover. No due counts, no focus
 * > banner, no streak, no freshness state, no progress indicator anywhere in the
 * > library, the category lists, the search results or the reading view.
 *
 * The scope names this the principle that protects the devotional half of the
 * product: opening the app at a gathering and being met with "3 due today" turns
 * worship into a chore reminder. A principle that important should not depend on
 * an agent remembering a paragraph it read forty turns ago.
 *
 * So this test reads the source of every file under `src/features/discover/` and
 * fails if any of them can reach the material 7.6 forbids. It checks two things.
 *
 * **The module.** Nothing may import the scheduler, a progress-bearing data
 * module, or the Ruhi route (D1.10: Discover never surfaces a Ruhi quotation).
 *
 * **The name.** Even through a permitted module, no binding may be one of the
 * names those forbidden modules export. That list is derived from the modules
 * themselves rather than typed out here, so adding a function to
 * `segmentProgress.ts` extends this test automatically and the two cannot drift.
 *
 * There is a matching `no-restricted-imports` rule in eslint.config.js. Both
 * exist on purpose: a lint rule can be switched off to get a build green, and a
 * deleted test is louder than a changed config line.
 *
 * ## What Discover *is* allowed
 *
 * `src/data/passages.ts`, `tags.ts` and `bookmarks.ts`. None of them can return
 * progress, and `isOnList` returns a boolean rather than a row, because 7.6
 * permits Discover to know only that "the add button reads as already added".
 */

const DISCOVER_DIR = join(SRC_DIR, 'features', 'discover')

/** Modules whose contents are memorisation state, or the Ruhi route. */
const FORBIDDEN_MODULES = [
  'scheduler',
  'data/db',
  'data/ruhi',
  'data/userPrayers',
  'data/segmentProgress',
  'data/reviewLog',
  'data/userStats',
  'data/progressMapping',
]

/** The same modules, as paths, so their exported names can be read off them. */
const FORBIDDEN_NAME_SOURCES = [
  join(SRC_DIR, 'scheduler', 'index.ts'),
  join(SRC_DIR, 'data', 'userPrayers.ts'),
  join(SRC_DIR, 'data', 'segmentProgress.ts'),
  join(SRC_DIR, 'data', 'reviewLog.ts'),
  join(SRC_DIR, 'data', 'userStats.ts'),
  join(SRC_DIR, 'data', 'progressMapping.ts'),
  join(SRC_DIR, 'data', 'ruhi.ts'),
]

function forbiddenNames(): Set<string> {
  return new Set(FORBIDDEN_NAME_SOURCES.flatMap(exportedNames))
}

function discoverFiles(): string[] {
  return sourceFilesUnder(DISCOVER_DIR, ['.ts', '.tsx'])
}

describe('principle 7.6 - memorisation chrome never appears in Discover', () => {
  it('has files to check, so this suite cannot pass vacuously', () => {
    expect(discoverFiles().length).toBeGreaterThan(0)
  })

  it('knows what the forbidden names are, so the name check is not empty', () => {
    const names = forbiddenNames()
    expect(names.size).toBeGreaterThan(10)
    expect(names).toContain('reviewSegment')
    expect(names).toContain('listDueSegmentProgress')
    expect(names).toContain('listRuhiQuotations')
  })

  it('imports nothing from the scheduler, a progress table, or the Ruhi route', () => {
    const breaches: string[] = []

    for (const path of discoverFiles()) {
      const source = parse(path)
      for (const use of importsOf(source)) {
        const forbidden = FORBIDDEN_MODULES.find((module) => use.specifier.includes(module))
        if (forbidden !== undefined) {
          breaches.push(
            `${label(path)}:${String(lineOf(source, use.node))} imports '${use.specifier}'`,
          )
        }
      }
    }

    expect(breaches).toEqual([])
  })

  it('binds no name that carries progress, however it was reached', () => {
    const forbidden = forbiddenNames()
    const breaches: string[] = []

    for (const path of discoverFiles()) {
      const source = parse(path)
      for (const use of importsOf(source)) {
        for (const name of use.names) {
          if (forbidden.has(name)) {
            breaches.push(
              `${label(path)}:${String(lineOf(source, use.node))} binds '${name}' ` +
                `from '${use.specifier}'`,
            )
          }
        }
      }
    }

    expect(breaches).toEqual([])
  })
})
