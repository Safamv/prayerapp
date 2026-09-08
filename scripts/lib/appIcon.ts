import { STAR_OUTER_RADIUS, STAR_POINTS, starPolygon } from '../../src/theme/ornaments.ts'

/**
 * The home screen icon: design-tokens 4's nine-pointed star, in gold, on navy
 * cloth that runs to all four edges.
 *
 * ## Why there is a raster path here at all
 *
 * Design-tokens 8.3 says the app contains no image or icon files, and until this
 * session that was true of every mark on every screen. A home screen icon cannot
 * be one of those marks: iOS reads `apple-touch-icon` as a bitmap and will not
 * take an inline SVG, and neither will the manifest's icon list on any platform
 * that matters. Decision D10.2 records the conflict and how narrowly it is
 * being taken. The short of it is that nothing under `src/` gains an image
 * file - these are generated during the build, from the same eighteen numbers
 * the freshness star is drawn from, and only the built output carries a PNG.
 *
 * ## The geometry, and the crop
 *
 * iOS masks every icon to a rounded square regardless of design-tokens 3's
 * "border radius: 0 everywhere", and Android launchers crop harder still. There
 * is no fighting it, so the icon is drawn to survive it: the navy covers the
 * whole square, so a crop of any radius takes cloth, and the star spans a little
 * over half the square, which sits well inside the centre circle a maskable icon
 * is required to keep its content within.
 */

/**
 * The star's widest span, as a share of the icon's width.
 *
 * A maskable icon must keep everything that matters inside a centre circle of
 * 80% of the width. 64% is comfortably inside that, and it is also what stops
 * the star reading as a logo squashed against its own frame at 60 pixels on a
 * home screen. One value for every size and every purpose: the 512 that Android
 * masks and the 180 that iOS rounds are the same drawing, so they cannot drift.
 */
export const ICON_STAR_FRACTION = 0.64

/** Design-tokens 4's inner radius over its outer radius, from the points themselves. */
const INNER_OVER_OUTER = 4.2 / STAR_OUTER_RADIUS

/** Samples per pixel, per axis. Sixteen per pixel, which is enough for a straight edge. */
const SUPERSAMPLE = 4

export type Rgb = readonly [number, number, number]

/**
 * Parses one of the palette's colours.
 *
 * Deliberately strict: design-tokens 1.1 holds both `#1F3A63` and
 * `rgba(90,70,40,.055)`, and only the first kind can be a ground. Pointing this
 * at a grain token should fail loudly at build time rather than quietly produce
 * a black icon.
 */
export function hexToRgb(hex: string): Rgb {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex.trim())
  if (match === null) {
    throw new Error(`The icon needs a six-digit hex colour, received ${hex}`)
  }
  const value = Number.parseInt(match[1] ?? '', 16)
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff]
}

export interface IconColours {
  /** The ground, edge to edge. */
  readonly ground: string
  /** The star. */
  readonly star: string
}

/**
 * Even-odd ray casting, with two shortcuts that skip it for most of the square.
 *
 * A point nearer the centre than the star's inner radius is inside whatever the
 * edges do; a point further out than its outer radius is outside. Between those
 * two circles lies the only region worth testing, which is a thin ring, so the
 * eighteen-edge test runs on a small minority of samples.
 */
function insideStar(
  xs: Float64Array,
  ys: Float64Array,
  centre: number,
  innerRadius: number,
  outerRadius: number,
  px: number,
  py: number,
): boolean {
  const dx = px - centre
  const dy = py - centre
  const squared = dx * dx + dy * dy
  if (squared <= innerRadius * innerRadius) return true
  if (squared >= outerRadius * outerRadius) return false

  let inside = false
  for (let i = 0, j = xs.length - 1; i < xs.length; j = i, i += 1) {
    const xi = xs[i] ?? 0
    const yi = ys[i] ?? 0
    const xj = xs[j] ?? 0
    const yj = ys[j] ?? 0
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

/**
 * Draws the icon at `size` square, as `size * size * 3` bytes of RGB.
 *
 * Antialiased by supersampling rather than by any curve maths: coverage per
 * pixel is the share of its sixteen samples that land in the star, and the two
 * colours are mixed in that proportion. The star has nine sharp points and this
 * is what keeps them from looking like stairs at 180 pixels.
 *
 * Design-tokens 3's cloth grain is deliberately not drawn. It is a four pixel
 * dot pattern meant to be met at one to one on a screen; at icon scale it either
 * vanishes into the navy or beats against the display's own grid.
 */
export function renderAppIcon(size: number, colours: IconColours): Uint8Array {
  const ground = hexToRgb(colours.ground)
  const star = hexToRgb(colours.star)

  const polygon = starPolygon(size, ICON_STAR_FRACTION)
  const xs = Float64Array.from(polygon, ([x]) => x)
  const ys = Float64Array.from(polygon, ([, y]) => y)

  const centre = size / 2
  const outerRadius = (size * ICON_STAR_FRACTION) / 2
  const innerRadius = outerRadius * INNER_OVER_OUTER

  const out = new Uint8Array(size * size * 3)
  const step = 1 / SUPERSAMPLE
  const samples = SUPERSAMPLE * SUPERSAMPLE

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let hits = 0
      for (let sy = 0; sy < SUPERSAMPLE; sy += 1) {
        const py = y + (sy + 0.5) * step
        for (let sx = 0; sx < SUPERSAMPLE; sx += 1) {
          const px = x + (sx + 0.5) * step
          if (insideStar(xs, ys, centre, innerRadius, outerRadius, px, py)) hits += 1
        }
      }
      const coverage = hits / samples
      const at = (y * size + x) * 3
      for (let channel = 0; channel < 3; channel += 1) {
        const from = ground[channel] ?? 0
        const to = star[channel] ?? 0
        out[at + channel] = Math.round(from + (to - from) * coverage)
      }
    }
  }
  return out
}

/**
 * The same icon as a vector, for `favicon.svg` and for anywhere a browser would
 * rather scale a shape than a bitmap.
 *
 * Written on a hundred unit square so the numbers in the file read as
 * percentages. `shape-rendering` is left alone: this is the one drawing in the
 * product that is meant to be smoothed, because it is displayed at sizes the
 * design was never set at.
 */
export function appIconSvg(colours: IconColours): string {
  const points = starPolygon(100, ICON_STAR_FRACTION)
    .map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`)
    .join(' ')
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">',
    `<rect width="100" height="100" fill="${colours.ground}"/>`,
    `<polygon points="${points}" fill="${colours.star}"/>`,
    '</svg>',
    '',
  ].join('\n')
}

/** Exported so the test can assert the icon is drawn from design-tokens 4 and not a copy. */
export const STAR_POINT_COUNT = STAR_POINTS.length

export interface AppIconFile {
  /** The name it is served under, at the site root. */
  readonly file: string
  readonly size: number
  /**
   * `maskable` promises a launcher it may crop to any shape it likes, because
   * the ground reaches the edges and nothing important is near them.
   */
  readonly purpose: 'any' | 'maskable'
}

/**
 * Every icon the built site carries.
 *
 * One list, read by the thing that draws them and by the thing that declares
 * them, so a manifest cannot name a file the build does not write.
 *
 * The two 512s are the same drawing. That is not an oversight: the star already
 * sits inside the circle a maskable icon must respect, so shrinking it further
 * for the maskable entry would produce a smaller star for no gain, and two
 * drawings that could drift apart. The 180 exists because iOS reads
 * `apple-touch-icon` from a link tag and never from the manifest.
 */
export const APP_ICON_FILES: readonly AppIconFile[] = Object.freeze([
  Object.freeze({ file: 'icon-192.png', size: 192, purpose: 'any' as const }),
  Object.freeze({ file: 'icon-512.png', size: 512, purpose: 'any' as const }),
  Object.freeze({ file: 'icon-512-maskable.png', size: 512, purpose: 'maskable' as const }),
  Object.freeze({ file: 'apple-touch-icon.png', size: 180, purpose: 'any' as const }),
])

/** The name iOS looks for in a `<link rel="apple-touch-icon">`. */
export const APPLE_TOUCH_ICON = 'apple-touch-icon.png'

/** The vector icon, for the browser tab. */
export const FAVICON_SVG = 'favicon.svg'
