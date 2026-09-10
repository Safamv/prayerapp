// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { forgetThemeHint, readThemeHint, THEME_HINT_KEY, writeThemeHint } from './themeHint'

/**
 * The pre-paint theme hint. Decision D13.2.
 *
 * Until session 13 the app painted the **default** theme and then replaced it
 * with the stored one a few milliseconds later, once IndexedDB had been read.
 * With one typeface and one palette in use that was invisible. With seven
 * typefaces it is a flash of Italiana on every launch for six of them, and a
 * face that flashes in and out on every launch is worse than one face.
 *
 * This module is the cache that makes the first paint correct. **Its whole
 * contract is that it is never trusted**: it can be missing, stale or written by
 * a version of the app that no longer exists, and every one of those must cost a
 * launch painted in the default theme rather than a crash or a blank screen.
 * That is what most of these tests are about.
 */

const selection = { paletteId: 'oxblood-cloth', typefaceId: 'bodoni-moda', textScale: 1.3 }

beforeEach(() => {
  forgetThemeHint()
  vi.restoreAllMocks()
})

describe('readThemeHint', () => {
  it('returns what was written', () => {
    writeThemeHint(selection)
    expect(readThemeHint()).toEqual(selection)
  })

  it('returns nothing on a device that has never chosen anything', () => {
    expect(readThemeHint()).toBeNull()
  })

  it('returns nothing rather than throwing for a value that is not JSON', () => {
    localStorage.setItem(THEME_HINT_KEY, 'this is not json')
    expect(readThemeHint()).toBeNull()
  })

  it('returns nothing for a value of the wrong shape', () => {
    // A hint written by a later version of the app, or by something else
    // entirely. Every field is checked rather than cast, because this is the one
    // piece of state in the product that can arrive in a shape no code here
    // ever produced.
    for (const bad of [
      'null',
      '42',
      '"a string"',
      '[]',
      '{}',
      '{"paletteId":"p"}',
      '{"paletteId":"p","typefaceId":"t"}',
      '{"paletteId":"p","typefaceId":"t","textScale":"large"}',
      '{"paletteId":1,"typefaceId":"t","textScale":1}',
    ]) {
      localStorage.setItem(THEME_HINT_KEY, bad)
      expect(readThemeHint(), `${bad} should not be trusted`).toBeNull()
    }
  })

  it('returns nothing for a text scale that is not a finite number', () => {
    localStorage.setItem(THEME_HINT_KEY, '{"paletteId":"p","typefaceId":"t","textScale":null}')
    expect(readThemeHint()).toBeNull()
  })

  it('survives storage that throws, which some embedded browsers do', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage is disabled')
    })
    expect(readThemeHint()).toBeNull()
  })
})

describe('writeThemeHint', () => {
  it('overwrites the previous hint rather than accumulating', () => {
    writeThemeHint(selection)
    writeThemeHint({ ...selection, typefaceId: 'tangerine' })
    expect(readThemeHint()?.typefaceId).toBe('tangerine')
  })

  it('gives up quietly when the write is refused', () => {
    // A full quota, or a private window. The next launch paints the default
    // theme and corrects itself once the database is read, which is exactly
    // what happened on every launch before this file existed.
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })
    expect(() => {
      writeThemeHint(selection)
    }).not.toThrow()
  })
})

/**
 * **The hint is only worth anything if it is read before React renders.**
 *
 * This reads the real `main.tsx` rather than running it, because what it is
 * asserting is an ordering between two statements and there is no way to observe
 * that from inside the app once both have run. The failure it guards against is
 * somebody moving the theme call below the render call while tidying imports,
 * which would restore the flash and break no other test in the suite.
 */
describe('main.tsx', () => {
  const source = readFileSync(join(import.meta.dirname, '..', 'main.tsx'), 'utf8')

  it('applies the theme before it renders anything', () => {
    const applied = source.indexOf('applyThemeVariables(')
    const rendered = source.indexOf('createRoot(')
    expect(applied).toBeGreaterThan(-1)
    expect(rendered).toBeGreaterThan(-1)
    expect(applied, 'the theme must be written before the first render').toBeLessThan(rendered)
  })

  it('paints from the stored hint rather than from the defaults', () => {
    expect(source).toContain('readThemeHint()')
  })
})
