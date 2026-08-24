import { describe, expect, it } from 'vitest'
import { getTypeface, TYPEFACES } from './typefaces'
import {
  clampTextScale,
  DEFAULT_TEXT_SCALE,
  roleFontSize,
  TEXT_SCALE_MAX,
  TEXT_SCALE_MIN,
  TEXT_SCALE_STEPS,
  TYPE_ROLES,
} from './typeScale'

/**
 * The type scale of design-tokens 2.2 and 2.4.
 *
 * Two things are worth proving here, and both are the interaction rather than
 * the arithmetic.
 *
 * **The optical scalar is never clipped.** It exists to make all seven
 * typefaces sit at the same apparent size. Clamping the final pixel value would
 * undo that and make Tangerine's titles smaller than everyone else's, which is
 * the opposite of what the scalar is for.
 *
 * **Body text reaches the full range and display type is clipped first**
 * (design-tokens 2.4 rule 3). The accessibility requirement of scope 7.9 exists
 * to serve body text; a 42px title at 1.75 on a 390px viewport would not fit.
 */

const ITALIANA = getTypeface('italiana')
const TANGERINE = getTypeface('tangerine')

/** The largest type any option can produce: the 64px drop cap in Tangerine at full scale. */
const DROP_CAP_WORST_CASE = 120

describe('the user text scale', () => {
  it('offers a genuinely large maximum, per scope 7.9', () => {
    expect(TEXT_SCALE_MAX).toBeGreaterThanOrEqual(1.75)
    expect(TEXT_SCALE_STEPS[0]).toBe(TEXT_SCALE_MIN)
    expect(TEXT_SCALE_STEPS.at(-1)).toBe(TEXT_SCALE_MAX)
    expect(TEXT_SCALE_STEPS).toContain(DEFAULT_TEXT_SCALE)
  })

  it('is clamped to the range rather than trusted', () => {
    expect(clampTextScale(9)).toBe(TEXT_SCALE_MAX)
    expect(clampTextScale(0.1)).toBe(TEXT_SCALE_MIN)
    expect(clampTextScale(1.3)).toBe(1.3)
  })

  it('falls back to the default for a stored value that is not a number', () => {
    expect(clampTextScale(Number.NaN)).toBe(DEFAULT_TEXT_SCALE)
    expect(clampTextScale(Number.POSITIVE_INFINITY)).toBe(DEFAULT_TEXT_SCALE)
  })
})

describe('computed sizes', () => {
  it('is the base size at the default scale in the reference typeface', () => {
    expect(roleFontSize(TYPE_ROLES.passageBody, ITALIANA, 1)).toBe(20)
    expect(roleFontSize(TYPE_ROLES.screenTitle, ITALIANA, 1)).toBe(42)
    expect(roleFontSize(TYPE_ROLES.tabLabel, ITALIANA, 1)).toBe(8.5)
  })

  it('applies the optical scalar in full, never clipped', () => {
    // Tangerine's display scalar of 1.5 is the face being visually smaller, not
    // the user asking for larger text. 42 x 1.5 = 63.
    expect(roleFontSize(TYPE_ROLES.screenTitle, TANGERINE, 1)).toBe(63)
    expect(roleFontSize(TYPE_ROLES.passageBody, TANGERINE, 1)).toBe(18.4)
  })

  it('lets body text reach the full range', () => {
    expect(roleFontSize(TYPE_ROLES.passageBody, ITALIANA, TEXT_SCALE_MAX)).toBe(35)
    expect(roleFontSize(TYPE_ROLES.listRowTitle, ITALIANA, TEXT_SCALE_MAX)).toBe(35)
  })

  it('clips display type first, so a title still fits a 390px viewport', () => {
    const atMaximum = roleFontSize(TYPE_ROLES.screenTitle, ITALIANA, TEXT_SCALE_MAX)
    expect(atMaximum).toBeLessThan(42 * TEXT_SCALE_MAX)
    expect(atMaximum).toBeLessThan(390 / 6)
  })

  it('keeps the worst case in bounds: the largest scalar at the largest text size', () => {
    // Design-tokens 2.4 names this collision by hand: Tangerine at 1.5 against a
    // large user scale would put a 42px title past 110px on a 390px viewport.
    const worst = roleFontSize(TYPE_ROLES.screenTitle, TANGERINE, TEXT_SCALE_MAX)
    expect(worst).toBeLessThan(110)
  })

  it('shrinks as well as grows', () => {
    expect(roleFontSize(TYPE_ROLES.passageBody, ITALIANA, TEXT_SCALE_MIN)).toBe(18)
  })

  it('grows monotonically across every step, for every role and every typeface', () => {
    for (const role of Object.values(TYPE_ROLES)) {
      for (const typeface of [ITALIANA, TANGERINE]) {
        const sizes = TEXT_SCALE_STEPS.map((scale) => roleFontSize(role, typeface, scale))
        for (let index = 1; index < sizes.length; index += 1) {
          expect(sizes[index]).toBeGreaterThanOrEqual(sizes[index - 1] ?? 0)
        }
      }
    }
  })

  it('never produces a size that is zero, negative or absurd', () => {
    for (const role of Object.values(TYPE_ROLES)) {
      for (const typeface of TYPEFACES) {
        for (const scale of [0, 0.1, 1, 3, 1000]) {
          const size = roleFontSize(role, typeface, scale)
          expect(size).toBeGreaterThan(4)
          expect(size).toBeLessThanOrEqual(DROP_CAP_WORST_CASE)
        }
      }
    }
  })

  it('keeps the V0 drop cap under a third of the reference viewport', () => {
    // Italiana is the only face V0 ships (scope 12.3). 64 x 1.0 x 1.25 = 80.
    expect(roleFontSize(TYPE_ROLES.dropCap, ITALIANA, TEXT_SCALE_MAX)).toBe(80)
    expect(roleFontSize(TYPE_ROLES.dropCap, ITALIANA, TEXT_SCALE_MAX)).toBeLessThan(390 / 3)
  })

  it('records the worst drop cap any typeface can produce, which is Tangerine', () => {
    // 64 x 1.5 x 1.25 = 120, which is 31% of a 390px viewport. Large, but it is
    // a drop cap and it is decorative. Design-tokens 2.4 rule 4 requires every
    // option to be checked at both ends of the range before it ships, and
    // Tangerine ships with the [v0.1] picker rather than in V0. This assertion
    // exists so the number is visible when that check happens rather than
    // discovered on a phone.
    expect(roleFontSize(TYPE_ROLES.dropCap, TANGERINE, TEXT_SCALE_MAX)).toBe(DROP_CAP_WORST_CASE)
  })
})
