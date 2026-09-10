/**
 * **What the app looked like last time, readable before the first paint.**
 *
 * `user_settings` is the source of truth for the palette, the typeface and the
 * text size, and nothing here changes that. But IndexedDB can only be read
 * asynchronously, and the first paint happens before any read of it can finish.
 * So until session 13 the app painted the **default** theme and then swapped in
 * the stored one a few milliseconds later.
 *
 * With one palette and one typeface that was invisible. With seven typefaces it
 * would be a flash of Italiana on every launch for six of the seven, and a face
 * that flashes in and out on every launch is worse than one face.
 *
 * So the selection is mirrored into localStorage, which **is** readable
 * synchronously, and `main.tsx` paints from that. The same reasoning and the
 * same storage as the anonymous user id (`userId.ts`), for the same reason: it
 * is cleared by exactly the user action that clears IndexedDB, so it survives
 * precisely as long as the data it describes.
 *
 * ## It is a cache and never a source
 *
 * Nothing reads this to decide anything. The ThemeProvider is still handed what
 * `user_settings` says, a few milliseconds later, and where the two disagree the
 * database wins and the hint is rewritten. A hint that is missing, stale or
 * unparseable costs one launch painted in the default theme, which is exactly
 * what happened before it existed.
 */

export const THEME_HINT_KEY = 'by-heart.theme'

export interface ThemeHint {
  readonly paletteId: string
  readonly typefaceId: string
  readonly textScale: number
}

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    // Some embedded browsers throw on the property itself rather than returning
    // nothing, so reading it has to be guarded as well as using it.
    return null
  }
}

/**
 * The last known selection, or `null` if there is not one worth trusting.
 *
 * Every field is checked rather than cast. This value is written by a previous
 * version of the app and read by this one, so it is the one piece of state in
 * the product that can arrive in a shape no code here ever produced.
 */
export function readThemeHint(): ThemeHint | null {
  const store = storage()
  if (store === null) return null

  let raw: string | null
  try {
    raw = store.getItem(THEME_HINT_KEY)
  } catch {
    return null
  }
  if (raw === null || raw === '') return null

  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object') return null
    const { paletteId, typefaceId, textScale } = parsed as Record<string, unknown>
    if (typeof paletteId !== 'string' || typeof typefaceId !== 'string') return null
    if (typeof textScale !== 'number' || !Number.isFinite(textScale)) return null
    return { paletteId, typefaceId, textScale }
  } catch {
    return null
  }
}

export function writeThemeHint(hint: ThemeHint): void {
  const store = storage()
  if (store === null) return
  try {
    store.setItem(THEME_HINT_KEY, JSON.stringify(hint))
  } catch {
    // Quota, or a blocked write. The next launch paints the default theme and
    // corrects itself once the database has been read, which is what happened
    // on every launch before this file existed.
  }
}

/** Test-only. Forgets the hint so the next read paints the default theme. */
export function forgetThemeHint(): void {
  try {
    globalThis.localStorage?.removeItem(THEME_HINT_KEY)
  } catch {
    // Nothing stored, nothing to forget.
  }
}
