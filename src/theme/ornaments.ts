/**
 * Printed ornaments. Design-tokens 3, "Other tokens".
 *
 * The fleuron is a text glyph rather than an SVG (design-tokens 8.3: "No image
 * or icon files. Every mark in the app is an inline SVG. The fleuron is a text
 * glyph."), so it lives here with the other tokens rather than with the icons.
 *
 * It is here rather than in `src/strings/` because it is not a word: it says
 * nothing, it is never read aloud, and a tone pass would not touch it. Screens
 * render it through this constant, which also keeps a bare `❦` out of JSX where
 * `src/principles/strings-in-jsx.test.ts` would rightly not know what to make
 * of it.
 *
 * `scripts/lib/fontCharset.ts` subsets it in, so it is drawn by Cormorant rather
 * than by whatever the device falls back to.
 */

/** U+2766, FLORAL HEART. */
export const FLEURON = '❦'

/** Design-tokens 3: 15px. Not a type role - it is an ornament, not text. */
export const FLEURON_SIZE = 15

/**
 * The nine-pointed star. Design-tokens 4, and the only ornament this product
 * has beyond the fleuron.
 *
 * The eighteen points are the document's own, verbatim, on its `0 0 24 24`
 * viewBox: nine outer vertices at radius 10 and nine inner ones at radius 4.2,
 * about a centre of (12, 12), with the first point at the top. They live here
 * as numbers rather than as a path string so that a consumer which is not an
 * SVG - the home screen icon, which iOS insists be raster (decision D10.2) -
 * draws the same star rather than a second one that drifts.
 *
 * Freshness is fill and opacity over this shape and nothing else (design-tokens
 * 4). The shape itself carries no colour and no state.
 */
export const STAR_VIEWBOX = 24

/** The centre of `STAR_VIEWBOX`, which is also the centre of the star. */
export const STAR_CENTRE = STAR_VIEWBOX / 2

/** Design-tokens 4's outer radius, in viewBox units. */
export const STAR_OUTER_RADIUS = 10

export const STAR_POINTS: readonly (readonly [number, number])[] = Object.freeze([
  [12, 2],
  [13.44, 8.05],
  [18.43, 4.34],
  [15.64, 9.9],
  [21.85, 10.26],
  [16.14, 12.73],
  [20.66, 17],
  [14.7, 15.22],
  [15.42, 21.4],
  [12, 16.2],
  [8.58, 21.4],
  [9.3, 15.22],
  [3.34, 17],
  [7.86, 12.73],
  [2.15, 10.26],
  [8.36, 9.9],
  [5.57, 4.34],
  [10.56, 8.05],
] as const)

/**
 * The star's outline in another coordinate space: centred on a square of
 * `size`, with the star's widest span covering `fraction` of that square.
 *
 * `fraction` exists because of the one thing about a home screen icon that no
 * amount of design-tokens 3 changes: iOS crops every icon to a rounded square
 * whatever the icon wants. Drawing the star well inside the square, on a ground
 * that runs to all four edges, means the crop takes cloth and never a point.
 */
export function starPolygon(
  size: number,
  fraction: number,
): readonly (readonly [number, number])[] {
  const centre = size / 2
  const scale = (size * fraction) / (2 * STAR_OUTER_RADIUS)
  return STAR_POINTS.map(
    ([x, y]) => [centre + (x - STAR_CENTRE) * scale, centre + (y - STAR_CENTRE) * scale] as const,
  )
}
