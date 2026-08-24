import { createContext } from 'react'
import type { Palette } from './palettes'
import type { Typeface } from './typefaces'

/**
 * What a screen can ask of the theme. Deliberately small: the active palette and
 * typeface for a settings screen to show, the three setters, and nothing else.
 * Colours and sizes are read through CSS variables, never through this context,
 * so changing a palette does not re-render a single component.
 */
export interface ThemeContextValue {
  readonly palette: Palette
  readonly typeface: Typeface
  readonly textScale: number
  readonly setPaletteId: (id: string) => void
  readonly setTypefaceId: (id: string) => void
  readonly setTextScale: (scale: number) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)
