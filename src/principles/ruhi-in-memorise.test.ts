import { join, sep } from 'node:path'
import { basename } from 'node:path'
import { describe, expect, it } from 'vitest'
import { importsOf, label, lineOf, parse, sourceFilesUnder, SRC_DIR } from './sources'

/**
 * **The Ruhi wall, from the other side.** Decision D1.10, principle 7.6,
 * design-tokens 4.
 *
 * `discover-isolation.test.ts` forbids anything under `src/features/discover/`
 * importing `data/ruhi`. That is the wall, and session 11 found the gap in it:
 * **it reads what a file imports.** A Ruhi-aware row component put in
 * `src/components/` and handed its data as a prop would import nothing forbidden,
 * pass every assertion there, and breach D1.10 the first time a library screen
 * drew one. `one-star.test.ts` closes that gap for the freshness star by keeping
 * the star inside `src/features/memorise/`. This closes it for the Ruhi route,
 * the same way, and it is the session that built the route that needs it.
 *
 * Three rules.
 *
 * ## One, the Ruhi screens live in the Memorise feature
 *
 * Every screen of scope 5's route is under `src/features/memorise/`, where the
 * folder is the wall. Not `src/components/`, where the Discover screens could
 * reach them without importing anything forbidden.
 *
 * ## Two, only that folder and the data layer know about them
 *
 * `data/ruhi` and `data/loadRuhi` are imported by `src/features/memorise/` and by
 * `src/data/` and by nothing else. `src/app/App.tsx` names the screens, which is
 * a route table pointing at components, and knows nothing about a quotation.
 *
 * ## Three, no Ruhi screen carries memorisation chrome
 *
 * > No freshness star, streak, due count or progress indicator on a Ruhi browse
 * > screen. Design-tokens 4's second hard rule. The star lives in
 * > `src/features/memorise/` and nothing outside may import it. A Ruhi screen in
 * > that folder *could* import it; that does not mean it should, and a book of
 * > quotations is a reading surface.
 *
 * This is the one rule here that no other test could catch, because a Ruhi
 * screen is inside the folder the star lives in and every import it could make
 * is legal. So it is asserted by name: the files that draw the Ruhi route import
 * nothing that carries how the reader is going.
 */

const MEMORISE_DIR = join(SRC_DIR, 'features', 'memorise') + sep
const DATA_DIR = join(SRC_DIR, 'data') + sep

/**
 * A test is not a screen.
 *
 * `src/app/ruhi.test.tsx` drives the whole app from outside and reads the
 * database directly, to prove that a section really was added and really was
 * segmented. Decision D4.8 made the same carve-out for the Discover component
 * test and gave the reason: "A test driving the app from outside is not part of
 * the folder." What these rules protect is what ships, and no test does.
 */
function isTest(path: string): boolean {
  return path.endsWith('.test.ts') || path.endsWith('.test.tsx')
}

/** The modules that hold what a Ruhi screen must never draw. */
const MEMORISATION_CHROME = [
  'FreshnessStar',
  'progress',
  'data/progress',
  'data/dailyQueue',
  'scheduler',
  'queue',
  'quiz',
  'data/segmentProgress',
  'data/reviewLog',
  'data/userStats',
]

function everySourceFile(): string[] {
  return sourceFilesUnder(SRC_DIR, ['.ts', '.tsx'])
}

/** The files that draw the Ruhi route: `RuhiBooksScreen.tsx` and its four siblings. */
function ruhiScreens(): string[] {
  return sourceFilesUnder(MEMORISE_DIR, ['.tsx']).filter(
    (path) => basename(path).startsWith('Ruhi') && !isTest(path),
  )
}

describe('decision D1.10 - the Ruhi route lives on the memorisation side', () => {
  it('has screens to check, so this suite cannot pass vacuously', () => {
    expect(ruhiScreens().length).toBeGreaterThan(3)
  })

  it('keeps every Ruhi screen inside src/features/memorise/', () => {
    const outside = everySourceFile().filter(
      (path) =>
        basename(path).startsWith('Ruhi') &&
        !path.startsWith(MEMORISE_DIR) &&
        !path.startsWith(DATA_DIR) &&
        !isTest(path),
    )
    expect(outside.map(label)).toEqual([])
  })

  it('lets nothing outside the Memorise feature or the data layer read the mapping', () => {
    const breaches: string[] = []

    for (const path of everySourceFile()) {
      if (path.startsWith(MEMORISE_DIR) || path.startsWith(DATA_DIR)) continue
      if (isTest(path)) continue
      const source = parse(path)
      for (const use of importsOf(source)) {
        if (!/data\/(ruhi|loadRuhi)/.test(use.specifier)) continue
        breaches.push(`${label(path)}:${String(lineOf(source, use.node))} reads the mapping`)
      }
    }

    expect(breaches).toEqual([])
  })
})

describe('design-tokens 4 - a Ruhi screen is a reading surface', () => {
  it('draws no star, no streak, no due count and no progress', () => {
    const breaches: string[] = []

    for (const path of ruhiScreens()) {
      const source = parse(path)
      for (const use of importsOf(source)) {
        const forbidden = MEMORISATION_CHROME.find((module) => use.specifier.includes(module))
        if (forbidden === undefined) continue
        breaches.push(
          `${label(path)}:${String(lineOf(source, use.node))} imports '${use.specifier}'`,
        )
      }
    }

    expect(breaches).toEqual([])
  })
})
