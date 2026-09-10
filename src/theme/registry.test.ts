import { describe, expect, it } from 'vitest'
import { themeVariables } from './cssVariables'
import { DEFAULT_PALETTE_ID, getPalette, PALETTES } from './palettes'
import {
  DEFAULT_TYPEFACE_ID,
  fontStack,
  getTypeface,
  opticalScalar,
  shippedTypefaces,
  TYPEFACES,
  TYPE_SLOTS,
} from './typefaces'
import { TYPE_ROLES } from './typeScale'

/**
 * The registry itself. Decision D0.8: adding a palette or a typeface must be
 * appending an object, never editing a component, and a theme missing a colour
 * must fail loudly rather than ship with an invisible label.
 *
 * The compiler catches the missing colour, because `PaletteTokens` requires
 * every key. These tests catch the things a type cannot: that both palettes
 * carry the same token names at runtime, that the gold really is constant, and
 * that no colour has been left out of the CSS variables the app actually reads.
 */

describe('the palettes', () => {
  it('ships the two of design-tokens 1, with Paris Navy the default', () => {
    expect(PALETTES.map((palette) => palette.id)).toEqual(['paris-navy', 'oxblood-cloth'])
    expect(DEFAULT_PALETTE_ID).toBe('paris-navy')
  })

  it('gives every palette exactly the same token names', () => {
    const first = Object.keys(PALETTES[0]?.tokens ?? {}).sort()
    for (const palette of PALETTES) {
      expect(Object.keys(palette.tokens).sort()).toEqual(first)
    }
    // The 33 colours of design-tokens 1.1, plus `ink-shadow` and the primary
    // button's `letterpress` highlight, which design-tokens 3 defines outside
    // the palette table and session 5 needed as a token like any other.
    expect(first.length).toBe(35)
  })

  it('keeps the gold constant across both, per design-tokens 1.2', () => {
    const navy = getPalette('paris-navy').tokens
    const oxblood = getPalette('oxblood-cloth').tokens

    for (const token of ['accent', 'accent-dk', 'accent-md', 'accent-90', 'accent-80'] as const) {
      expect(oxblood[token]).toBe(navy[token])
    }
  })

  it('changes the cloth and the paper, which is what a palette is', () => {
    const navy = getPalette('paris-navy').tokens
    const oxblood = getPalette('oxblood-cloth').tokens

    expect(oxblood.field).not.toBe(navy.field)
    expect(oxblood.deep).not.toBe(navy.deep)
    expect(oxblood.paper).not.toBe(navy.paper)
    expect(oxblood.ink).not.toBe(navy.ink)
  })

  it('falls back to the default for an id that no longer exists', () => {
    // A stored setting can outlive the option it names. A blank screen is the
    // wrong answer to a stale preference.
    expect(getPalette('a-palette-from-a-later-version').id).toBe(DEFAULT_PALETTE_ID)
  })
})

describe('the typefaces', () => {
  it('defines all seven of design-tokens 2.1 from this session', () => {
    expect(TYPEFACES.map((typeface) => typeface.id)).toEqual([
      'italiana',
      'tangerine',
      'cormorant-unicase',
      'cormorant-italic',
      'im-fell-english',
      'goudy-1911',
      'bodoni-moda',
    ])
  })

  it('ships all seven from session 13, with Italiana still the default', () => {
    // Scope 12.3 ships one typeface in V0 and tags the seven-option picker
    // `[v0.1]`. Session 13 fetched the other eight families, so every option
    // now has its font files and the picker may offer all seven.
    expect(DEFAULT_TYPEFACE_ID).toBe('italiana')
    expect(shippedTypefaces()).toHaveLength(7)
    expect(shippedTypefaces().map((typeface) => typeface.id)).toEqual(
      TYPEFACES.map((typeface) => typeface.id),
    )
  })

  it('gives every option the specimen size design-tokens 5.8 names for it', () => {
    const sizes = Object.fromEntries(
      TYPEFACES.map((typeface) => [typeface.id, typeface.specimenSize]),
    )
    expect(sizes).toEqual({
      italiana: 25,
      tangerine: 38,
      'cormorant-unicase': 22,
      'cormorant-italic': 30,
      'im-fell-english': 26,
      'goudy-1911': 18,
      'bodoni-moda': 23,
    })
  })

  it('gives a specimen line height only to the two design-tokens 5.8 names', () => {
    const withLineHeight = TYPEFACES.filter((typeface) => typeface.specimenLineHeight !== null)
    expect(withLineHeight.map((typeface) => [typeface.id, typeface.specimenLineHeight])).toEqual([
      ['tangerine', 0.9],
      ['goudy-1911', 1.3],
    ])
  })

  it('carries the three optical scalars design-tokens 2.1 gives each option', () => {
    const tangerine = getTypeface('tangerine')
    expect([tangerine.ds, tangerine.bs, tangerine.cs]).toEqual([1.5, 0.92, 1.05])

    const goudy = getTypeface('goudy-1911')
    expect([goudy.ds, goudy.bs, goudy.cs]).toEqual([0.62, 0.95, 0.88])
  })

  it('gives Italiana a scalar of one in all three slots, being the reference', () => {
    const italiana = getTypeface('italiana')
    expect([italiana.ds, italiana.bs, italiana.cs]).toEqual([1, 1, 1])
  })

  it('reads a scalar by slot name', () => {
    const tangerine = getTypeface('tangerine')
    expect(opticalScalar(tangerine, 'display')).toBe(1.5)
    expect(opticalScalar(tangerine, 'body')).toBe(0.92)
    expect(opticalScalar(tangerine, 'caps')).toBe(1.05)
  })

  it('puts a system serif behind every family, so a face that fails to load still reads', () => {
    for (const typeface of TYPEFACES) {
      for (const name of TYPE_SLOTS) {
        expect(fontStack(typeface, name)).toMatch(/serif$/)
      }
    }
  })

  it('puts the coverage face in every stack that is not already it', () => {
    // Decision D13.1. Six of the ten families have no ḥ, no ṣ and no fleuron,
    // and subsetting cannot invent a glyph the source never had. Without
    // Cormorant in the stack those characters reach Georgia, which is decision
    // D4.7's bug on the two most-repeated marks in a reading view.
    for (const typeface of TYPEFACES) {
      for (const name of TYPE_SLOTS) {
        const stack = fontStack(typeface, name)
        expect(stack, `${typeface.id} ${name} has no coverage face`).toContain('Cormorant')
      }
    }
  })

  it('names the chosen family first, so the coverage face is only ever reached per character', () => {
    // A browser resolves a stack per character. The coverage face must sit
    // behind the chosen one or it would draw the whole screen.
    expect(fontStack(getTypeface('bodoni-moda'), 'body')).toBe(
      "'Bodoni Moda', Cormorant, Georgia, 'Times New Roman', Times, serif",
    )
  })

  it('does not name the coverage face twice when it is the chosen one', () => {
    const stack = fontStack(getTypeface('italiana'), 'body')
    expect(stack.match(/Cormorant/g)).toHaveLength(1)
  })

  it('quotes a family whose name contains a space', () => {
    expect(fontStack(getTypeface('goudy-1911'), 'body')).toContain("'Goudy Bookletter 1911'")
  })

  it('falls back to the default for an id that no longer exists', () => {
    expect(getTypeface('a-typeface-from-a-later-version').id).toBe(DEFAULT_TYPEFACE_ID)
  })
})

describe('the CSS variables', () => {
  const variables = themeVariables(getPalette('paris-navy'), getTypeface('italiana'), 1)

  it('writes one variable per palette token, named exactly as design-tokens 1.1 names it', () => {
    expect(variables['--field']).toBe('#1F3A63')
    expect(variables['--accent']).toBe('#C9A961')
    expect(variables['--on-paper-72']).toBe('rgba(20,36,61,.72)')
    expect(variables['--ink-shadow']).toBe('rgba(42,36,25,.35)')
  })

  it('leaves no palette token without a variable', () => {
    for (const token of Object.keys(getPalette('paris-navy').tokens)) {
      expect(variables[`--${token}`]).toBeDefined()
    }
  })

  it('writes the three slot families, weights, styles and scalars', () => {
    for (const name of TYPE_SLOTS) {
      expect(variables[`--family-${name}`]).toBeDefined()
      expect(variables[`--weight-${name}`]).toBeDefined()
      expect(variables[`--style-${name}`]).toBeDefined()
      expect(variables[`--scalar-${name}`]).toBeDefined()
    }
  })

  it('writes six variables for every one of the eighteen roles', () => {
    for (const role of Object.keys(TYPE_ROLES)) {
      const kebab = role.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
      for (const part of ['size', 'family', 'weight', 'style', 'tracking', 'line-height']) {
        expect(variables[`--type-${kebab}-${part}`]).toBeDefined()
      }
    }
  })

  it('carries the tracking and line height design-tokens 2.2 gives each role', () => {
    expect(variables['--type-tab-label-tracking']).toBe('.18em')
    expect(variables['--type-passage-body-line-height']).toBe('1.58')
    expect(variables['--type-eyebrow-reading-tracking']).toBe('.3em')
  })

  it('writes normal where the table leaves tracking or line height blank', () => {
    expect(variables['--type-passage-body-tracking']).toBe('normal')
    expect(variables['--type-settings-title-line-height']).toBe('normal')
  })

  it('marks the byline italic even though its slot is upright', () => {
    expect(variables['--type-byline-italic-style']).toBe('italic')
    expect(variables['--type-passage-body-style']).toBe('var(--style-body)')
  })

  it('follows the palette, so switching one rewrites every colour', () => {
    const oxblood = themeVariables(getPalette('oxblood-cloth'), getTypeface('italiana'), 1)
    expect(oxblood['--field']).toBe('#5A1F22')
    expect(oxblood['--accent']).toBe(variables['--accent'])
  })
})
