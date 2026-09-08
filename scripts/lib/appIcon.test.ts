import { describe, expect, it } from 'vitest'
import { defaultPalette } from '../../src/theme/palettes.ts'
import { STAR_POINTS } from '../../src/theme/ornaments.ts'
import {
  appIconSvg,
  hexToRgb,
  ICON_STAR_FRACTION,
  renderAppIcon,
  STAR_POINT_COUNT,
} from './appIcon.ts'

/**
 * The icon is generated rather than drawn by hand, so these are the assertions a
 * designer would otherwise make by looking at it: the ground reaches the corners,
 * the star is the app's own star, and nothing a mask can crop is near the edge.
 */

const tokens = defaultPalette().tokens
const COLOURS = { ground: tokens.field, star: tokens.accent }

function pixel(rgb: Uint8Array, size: number, x: number, y: number): number[] {
  const at = (y * size + x) * 3
  return [rgb[at] ?? -1, rgb[at + 1] ?? -1, rgb[at + 2] ?? -1]
}

describe('the app icon', () => {
  const SIZE = 64
  const icon = renderAppIcon(SIZE, COLOURS)

  it('is drawn from design-tokens 4, not from a second copy of the star', () => {
    expect(STAR_POINT_COUNT).toBe(18)
    expect(STAR_POINTS).toHaveLength(18)
  })

  it('is three opaque bytes for every pixel of a square', () => {
    expect(icon).toHaveLength(SIZE * SIZE * 3)
  })

  it('runs the ground into all four corners, so a rounded crop takes cloth', () => {
    const ground = [...hexToRgb(tokens.field)]
    for (const [x, y] of [
      [0, 0],
      [SIZE - 1, 0],
      [0, SIZE - 1],
      [SIZE - 1, SIZE - 1],
    ] as const) {
      expect(pixel(icon, SIZE, x, y)).toEqual(ground)
    }
  })

  it('puts the star at the centre', () => {
    expect(pixel(icon, SIZE, SIZE / 2, SIZE / 2)).toEqual([...hexToRgb(tokens.accent)])
  })

  /**
   * A maskable icon must keep its content inside a centre circle of 80% of the
   * width. This is the assertion that a future change to the star's size cannot
   * silently push a point under an Android launcher's crop.
   */
  it('keeps every point inside the maskable safe circle', () => {
    expect(ICON_STAR_FRACTION).toBeLessThanOrEqual(0.8)
    const edge = Math.round((SIZE * (1 - ICON_STAR_FRACTION)) / 4)
    expect(pixel(icon, SIZE, SIZE / 2, edge)).toEqual([...hexToRgb(tokens.field)])
  })

  it('antialiases the points rather than stepping them', () => {
    const ground = hexToRgb(tokens.field)
    const star = hexToRgb(tokens.accent)
    const blended = []
    for (let y = 0; y < SIZE; y += 1) {
      for (let x = 0; x < SIZE; x += 1) {
        const found = pixel(icon, SIZE, x, y)
        const isGround = found.every((channel, index) => channel === ground[index])
        const isStar = found.every((channel, index) => channel === star[index])
        if (!isGround && !isStar) blended.push(found)
      }
    }
    expect(blended.length).toBeGreaterThan(SIZE / 2)
  })

  it('names no colour of its own', () => {
    expect(() => hexToRgb('rgba(90,70,40,.055)')).toThrow(/six-digit hex/)
    expect(() => hexToRgb('#fff')).toThrow(/six-digit hex/)
    expect(hexToRgb('#1F3A63')).toEqual([31, 58, 99])
  })
})

describe('the vector icon', () => {
  const svg = appIconSvg(COLOURS)

  it('carries the ground and the star from the palette', () => {
    expect(svg).toContain(`fill="${tokens.field}"`)
    expect(svg).toContain(`fill="${tokens.accent}"`)
  })

  it('draws all eighteen points on a full bleed ground', () => {
    expect(svg).toContain('<rect width="100" height="100"')
    const points = /points="([^"]+)"/.exec(svg)?.[1]?.split(' ')
    expect(points).toHaveLength(18)
  })
})
