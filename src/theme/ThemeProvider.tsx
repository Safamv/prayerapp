import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { applyThemeVariables, themeVariables } from './cssVariables'
import { getPalette } from './palettes'
import { ThemeContext, type ThemeContextValue } from './themeContext'
import { getTypeface } from './typefaces'
import { clampTextScale } from './typeScale'

export interface ThemeSelection {
  readonly paletteId: string
  readonly typefaceId: string
  readonly textScale: number
}

export interface ThemeProviderProps {
  readonly initial: ThemeSelection
  /**
   * Called whenever the user changes something, so the caller can persist it.
   * The provider deliberately does not write to the database itself: the theme
   * registry knows nothing about `src/data/`, which keeps it usable in a test
   * with no IndexedDB and keeps the persistence decision in one place.
   */
  readonly onChange?: (selection: ThemeSelection) => void
  /** Defaults to `document.documentElement`. Tests pass their own element. */
  readonly target?: HTMLElement
  readonly children: ReactNode
}

/**
 * Holds the active selection and writes it onto one element as CSS custom
 * properties. Decision D0.8, design-tokens 1.
 *
 * An unknown id falls back to the default rather than throwing. A stored setting
 * can outlive the option it names, either because a `[v0.1]` typeface was
 * removed or because a device synced a setting from a newer version of the app,
 * and a blank screen is the wrong answer to a stale preference.
 */
export function ThemeProvider({ initial, onChange, target, children }: ThemeProviderProps) {
  const [paletteId, setPaletteIdState] = useState(initial.paletteId)
  const [typefaceId, setTypefaceIdState] = useState(initial.typefaceId)
  const [textScale, setTextScaleState] = useState(() => clampTextScale(initial.textScale))

  const palette = getPalette(paletteId)
  const typeface = getTypeface(typefaceId)

  useEffect(() => {
    const element = target ?? document.documentElement
    applyThemeVariables(element, themeVariables(palette, typeface, textScale))
  }, [palette, typeface, textScale, target])

  const announce = useCallback(
    (selection: ThemeSelection) => {
      onChange?.(selection)
    },
    [onChange],
  )

  const value = useMemo<ThemeContextValue>(
    () => ({
      palette,
      typeface,
      textScale,
      setPaletteId: (id: string) => {
        setPaletteIdState(id)
        announce({ paletteId: id, typefaceId, textScale })
      },
      setTypefaceId: (id: string) => {
        setTypefaceIdState(id)
        announce({ paletteId, typefaceId: id, textScale })
      },
      setTextScale: (scale: number) => {
        const clamped = clampTextScale(scale)
        setTextScaleState(clamped)
        announce({ paletteId, typefaceId, textScale: clamped })
      },
    }),
    [palette, typeface, textScale, paletteId, typefaceId, announce],
  )

  return <ThemeContext value={value}>{children}</ThemeContext>
}
