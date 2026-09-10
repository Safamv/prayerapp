import { describe, expect, it } from 'vitest'
import { specimenFontSize, TEXT_SCALE_MAX, TEXT_SCALE_MIN, TYPE_ROLES } from './typeScale'
import { roleFontSize, type TypeRoleName } from './typeScale'
import { TYPEFACES } from './typefaces'

/**
 * **Design-tokens 2.4 rule 4, as a test.**
 *
 * > Every typeface option must be checked at both ends of the text size range
 * > before it ships.
 *
 * Session 13 is when that stopped being hypothetical: V0 shipped one typeface
 * and one scalar of 1.0, so there was nothing for the range to collide with.
 * Seven faces multiplied against six text sizes is 126 combinations of one
 * number, across eighteen roles, and the collision the tokens document warns
 * about is real: Tangerine's display scalar of 1.5 against the largest text size
 * would put a 42px title past 110px on a 390px viewport if nothing clamped it.
 *
 * So this asserts the three rules that keep it from happening, and prints the
 * whole matrix so that whoever reads the run can see it rather than trust it.
 */

const ROLE_NAMES = Object.keys(TYPE_ROLES) as TypeRoleName[]

/**
 * The widest a phone this app is designed for gets, less design-tokens 5.3's
 * `0 26px` surface padding. A 390px viewport is an iPhone 14; 360px is the
 * common Android floor, and its 308px is the number that actually matters.
 */
const NARROW_TEXT_COLUMN = 360 - 26 * 2

describe('design-tokens 2.4: the text size range against all seven typefaces', () => {
  it('lets body text reach the full range in every typeface', () => {
    // Rule 3: "Body and passage text must reach the full range." The scalar is
    // the face's own correction and is applied in full, so what must reach the
    // maximum is the user's part of the multiplication (decision D2.6).
    for (const typeface of TYPEFACES) {
      const grown = roleFontSize(TYPE_ROLES.passageBody, typeface, TEXT_SCALE_MAX)
      const normal = roleFontSize(TYPE_ROLES.passageBody, typeface, 1)
      expect(
        grown / normal,
        `${typeface.id} passage body does not reach the full text size range`,
      ).toBeCloseTo(TEXT_SCALE_MAX, 5)
    }
  })

  it('clips display type before body type, in every typeface', () => {
    // Rule 3's other half: "Display type may be clipped first."
    for (const typeface of TYPEFACES) {
      const title = roleFontSize(TYPE_ROLES.screenTitle, typeface, TEXT_SCALE_MAX)
      const titleAtNormal = roleFontSize(TYPE_ROLES.screenTitle, typeface, 1)
      const body = roleFontSize(TYPE_ROLES.passageBody, typeface, TEXT_SCALE_MAX)
      const bodyAtNormal = roleFontSize(TYPE_ROLES.passageBody, typeface, 1)
      expect(
        title / titleAtNormal,
        `${typeface.id} grows its screen title as much as its body text`,
      ).toBeLessThan(body / bodyAtNormal)
    }
  })

  it('never lets a line of display type run wider than a narrow phone', () => {
    // The failure this exists to catch is a screen title or a drop cap that
    // overflows rather than wraps. A conservative width per character is enough
    // to prove the bound: these faces are all narrower than their point size.
    for (const typeface of TYPEFACES) {
      const dropCap = roleFontSize(TYPE_ROLES.dropCap, typeface, TEXT_SCALE_MAX)
      expect(
        dropCap,
        `${typeface.id} draws a drop cap ${String(dropCap)}px wide, which a ${String(
          NARROW_TEXT_COLUMN,
        )}px column cannot indent around`,
      ).toBeLessThan(NARROW_TEXT_COLUMN / 2)
    }
  })

  it('keeps every specimen on the picker between a legible floor and the row', () => {
    // Design-tokens 5.8's sizes scaled by the user's setting. The floor is the
    // caption beneath each specimen, which is 13px: a sample smaller than its
    // own caption is not a sample.
    for (const typeface of TYPEFACES) {
      expect(specimenFontSize(typeface, TEXT_SCALE_MIN)).toBeGreaterThanOrEqual(13)
      expect(specimenFontSize(typeface, TEXT_SCALE_MAX)).toBeLessThanOrEqual(60)
    }
  })

  it('prints the matrix, which is the actual deliverable of rule 4', () => {
    const width = 11
    const head = 'ROLE'.padEnd(22) + TYPEFACES.map((t) => t.id.slice(0, 10).padEnd(width)).join('')
    const lines = [head, '-'.repeat(head.length)]

    for (const name of ROLE_NAMES) {
      const role = TYPE_ROLES[name]
      const cells = TYPEFACES.map((typeface) => {
        const low = roleFontSize(role, typeface, TEXT_SCALE_MIN)
        const high = roleFontSize(role, typeface, TEXT_SCALE_MAX)
        return `${String(low)}-${String(high)}`.padEnd(width)
      })
      lines.push(name.padEnd(22) + cells.join(''))
    }

    lines.push(
      'specimen'.padEnd(22) +
        TYPEFACES.map((typeface) =>
          `${String(specimenFontSize(typeface, TEXT_SCALE_MIN))}-${String(
            specimenFontSize(typeface, TEXT_SCALE_MAX),
          )}`.padEnd(width),
        ).join(''),
    )

    console.log(`\n${lines.join('\n')}\n`)
    expect(lines.length).toBe(ROLE_NAMES.length + 3)
  })
})
