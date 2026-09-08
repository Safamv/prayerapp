import { join, sep } from 'node:path'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { importsOf, label, lineOf, parse, sourceFilesUnder, SRC_DIR } from './sources'

/**
 * **The star is drawn once, and it is memorisation chrome.** Design-tokens 4 and
 * 8.3, principle 7.6.
 *
 * Two rules, and both of them close a gap that a reader of the prose would not
 * see.
 *
 * ## One drawing
 *
 * > The icons are **generated during the build**, from the same eighteen numbers
 * > section 4 draws the freshness star with. They are not a second drawing of
 * > the star; they are the star. (design-tokens 8.3)
 *
 * Session 10 moved the eighteen points into `src/theme/ornaments.ts` so that the
 * home screen icon and the freshness star would be one shape. There were still
 * two copies until session 11: the selection mark of design-tokens 5.7 carried
 * its own, written out in session 2. The failure mode of two copies is silent -
 * somebody corrects one star and the other quietly stops matching it - so this
 * asserts that the numbers appear in one file.
 *
 * ## One folder
 *
 * > The star never appears in Discover or in the reading view. (design-tokens 4)
 *
 * `discover-isolation.test.ts` enforces principle 7.6 by reading what the
 * Discover folder imports, and **a star component in `src/components/` would go
 * straight through it**: handed its state as a prop, importing nothing
 * forbidden, and breaching 7.6 the first time a passage row in the library drew
 * one. Session 11 is the first session to render memorisation chrome at all, so
 * it is the first session where that gap is reachable.
 *
 * So the freshness star lives in `src/features/memorise/`, where the folder is
 * the wall, and nothing outside that folder may import it. A star cannot then
 * reach Discover by being made shareable first.
 *
 * **The selection star of design-tokens 5.7 and the decorative one in the tab
 * bar are not freshness usages**, which design-tokens 4 says in as many words.
 * They are exempt from the second rule and not from the first: they draw the
 * same eighteen points from the same place.
 */

const ORNAMENTS = join(SRC_DIR, 'theme', 'ornaments.ts')
const FRESHNESS_STAR = join(SRC_DIR, 'features', 'memorise', 'FreshnessStar.tsx')
const MEMORISE_DIR = join(SRC_DIR, 'features', 'memorise') + sep

/**
 * Three of design-tokens 4's eighteen coordinates. They are matched as bare
 * numbers rather than as `13.44,8.05` pairs because the one legitimate copy
 * holds them as numbers and a second drawing would most likely hold them as a
 * path string: matching the number catches both notations, and nothing else in
 * this app has any reason to contain 21.85.
 */
const POINTS = ['13.44', '21.85', '15.42']

function everySourceFile(): string[] {
  return sourceFilesUnder(SRC_DIR, ['.ts', '.tsx'])
}

describe('the nine-pointed star is drawn in one place', () => {
  it('has the points in src/theme/ornaments.ts', () => {
    const source = readFileSync(ORNAMENTS, 'utf8')
    for (const point of POINTS) expect(source).toContain(point)
  })

  it('has them nowhere else in the app', () => {
    const elsewhere: string[] = []

    for (const path of everySourceFile()) {
      if (path === ORNAMENTS) continue
      // This file names two of the points in order to look for them.
      if (path.endsWith('one-star.test.ts')) continue
      const source = readFileSync(path, 'utf8')
      if (POINTS.some((point) => source.includes(point))) elsewhere.push(label(path))
    }

    expect(elsewhere).toEqual([])
  })
})

describe('principle 7.6 - the freshness star is memorisation chrome', () => {
  it('lives inside the Memorise feature, where the folder is the wall', () => {
    expect(everySourceFile()).toContain(FRESHNESS_STAR)
  })

  it('is imported by nothing outside src/features/memorise/', () => {
    const breaches: string[] = []

    for (const path of everySourceFile()) {
      if (path.startsWith(MEMORISE_DIR)) continue
      const source = parse(path)
      for (const use of importsOf(source)) {
        if (!use.specifier.includes('FreshnessStar')) continue
        breaches.push(`${label(path)}:${String(lineOf(source, use.node))} imports the star`)
      }
    }

    expect(breaches).toEqual([])
  })

  it('binds the name nowhere outside that folder either', () => {
    const breaches: string[] = []

    for (const path of everySourceFile()) {
      if (path.startsWith(MEMORISE_DIR)) continue
      const source = parse(path)
      for (const use of importsOf(source)) {
        if (use.names.includes('FreshnessStar')) breaches.push(label(path))
      }
    }

    expect(breaches).toEqual([])
  })
})
