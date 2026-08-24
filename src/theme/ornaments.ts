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
