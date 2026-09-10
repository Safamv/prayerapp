import { useEffect, useState } from 'react'
import { getOrCreateAnonymousUserId } from '../data/userId'
import { writeThemeHint } from '../data/themeHint'
import { getOrCreateUserSettings, updateUserSettings } from '../data/userSettings'
import type { ThemeSelection } from '../theme'

export interface Bootstrap {
  readonly userId: string
  readonly theme: ThemeSelection
}

/**
 * Everything the app needs before it can draw a screen: who this device is, and
 * what they last chose to look at.
 *
 * ## The one call site for the user id
 *
 * Scope 13.1's anonymous id is resolved here and nowhere else, then passed down.
 * No data function reaches for it. When v1.0 adds accounts, signing in claims
 * the anonymous id and this hook returns the account's id instead - a change to
 * these few lines, and to nothing else in the app.
 *
 * Returns `null` while it is still reading. The database is local, so this is
 * a few milliseconds on a first run and less afterwards.
 */
export function useBootstrap(): Bootstrap | null {
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const userId = getOrCreateAnonymousUserId()
      const settings = await getOrCreateUserSettings(userId)
      if (cancelled) return
      const theme: ThemeSelection = {
        paletteId: settings.palette,
        typefaceId: settings.typeface,
        textScale: settings.text_size,
      }
      // The database is the source of truth, so what it says is what the
      // pre-paint hint should have said. Writing it here rather than only on
      // change is what gives an existing install its first hint, and what
      // repairs one that was cleared or written by an older build.
      writeThemeHint(theme)
      setBootstrap({ userId, theme })
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return bootstrap
}

/**
 * Persists a theme change back to `user_settings`. Passed to the ThemeProvider
 * as its `onChange`, which is how the registry stays ignorant of the database.
 *
 * The localStorage hint is written first and synchronously. It is what the next
 * launch paints from before any database read can finish, so if the app were
 * closed between these two lines the worse outcome by far is a correct hint and
 * an unwritten row, which self-corrects, rather than the reverse.
 */
export function persistThemeSelection(userId: string, selection: ThemeSelection): void {
  writeThemeHint(selection)
  void updateUserSettings(userId, {
    palette: selection.paletteId,
    typeface: selection.typefaceId,
    text_size: selection.textScale,
  })
}
