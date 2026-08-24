import { useContext } from 'react'
import { ThemeContext, type ThemeContextValue } from './themeContext'

/**
 * Reads the active theme. Throws outside a `ThemeProvider`, because a component
 * rendering without one would silently lose every colour on the screen, and a
 * named error at development time is a cheaper way to find that out.
 */
export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext)
  if (value === null) throw new Error('useTheme was called outside a ThemeProvider')
  return value
}
