/**
 * The theme registry's public surface. Decision D0.8, design-tokens 1 and 2.
 *
 * Adding a palette is appending an object to `PALETTES` in `palettes.ts`.
 * Adding a typeface is appending an object to `TYPEFACES` in `typefaces.ts`.
 * Neither touches a component, which is the point.
 */
export { applyThemeVariables, roleVariablePrefix, themeVariables } from './cssVariables'
export { DEFAULT_PALETTE_ID, PALETTES, defaultPalette, getPalette } from './palettes'
export type { Palette, PaletteTokens } from './palettes'
export { FLEURON, FLEURON_SIZE } from './ornaments'
export { ThemeProvider } from './ThemeProvider'
export type { ThemeProviderProps, ThemeSelection } from './ThemeProvider'
export type { ThemeContextValue } from './themeContext'
export { typeStyle } from './typeStyle'
export {
  DEFAULT_TYPEFACE_ID,
  TYPEFACES,
  TYPE_SLOTS,
  defaultTypeface,
  fontStack,
  getTypeface,
  opticalScalar,
} from './typefaces'
export type { Typeface, TypefaceSlot, TypeSlot } from './typefaces'
export {
  DEFAULT_TEXT_SCALE,
  TEXT_SCALE_MAX,
  TEXT_SCALE_MIN,
  TEXT_SCALE_STEPS,
  TYPE_ROLES,
  TYPE_ROLE_NAMES,
  clampTextScale,
  roleFontSize,
} from './typeScale'
export type { TypeRole, TypeRoleName } from './typeScale'
export { useTheme } from './useTheme'
