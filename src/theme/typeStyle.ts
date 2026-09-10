import type { CSSProperties } from 'react'
import { roleVariablePrefix } from './cssVariables'
import { fontStack, type Typeface } from './typefaces'
import { specimenFontSize, type TypeRoleName } from './typeScale'

/**
 * How a component asks for a piece of type.
 *
 * ```tsx
 * <span style={typeStyle('tabLabel')}>{strings.tabs.log}</span>
 * ```
 *
 * Every value it returns is a `var()` reference, so a component never carries a
 * size, a tracking value or a font family (CLAUDE.md rules 1 and 2,
 * design-tokens 8.4). The role name is a union, so `typeStyle('tabLable')` is a
 * compile error rather than unstyled text.
 *
 * This is a function rather than eighteen utility classes because the values
 * change at runtime when the user moves the text size control, and a class would
 * have to be regenerated. A `var()` reference simply re-resolves.
 */
export function typeStyle(role: TypeRoleName): CSSProperties {
  const prefix = roleVariablePrefix(role)
  return {
    fontFamily: `var(${prefix}-family)`,
    fontSize: `var(${prefix}-size)`,
    fontWeight: `var(${prefix}-weight)` as CSSProperties['fontWeight'],
    fontStyle: `var(${prefix}-style)`,
    letterSpacing: `var(${prefix}-tracking)`,
    lineHeight: `var(${prefix}-line-height)`,
  }
}

/**
 * How the picker asks for one typeface's sample, in that typeface.
 *
 * Every other piece of type in the app is set in the *active* face through a
 * `var()` reference, which is why `typeStyle` above never touches the registry.
 * A specimen row is the one exception in the product: seven rows, each set in a
 * face the reader has not chosen, so that the choice is made by looking rather
 * than by reading a name (design-tokens 5.7, 5.8).
 *
 * It lives here, inside `src/theme/`, for the reason CLAUDE.md rule 2 exists: a
 * component may not name a font family, and this returns the family as a value
 * out of the registry so that none ever has to.
 */
export function specimenStyle(typeface: Typeface, userTextScale: number): CSSProperties {
  return {
    fontFamily: fontStack(typeface, 'display'),
    fontSize: `${String(specimenFontSize(typeface, userTextScale))}px`,
    fontWeight: typeface.display.weight,
    fontStyle: typeface.display.style,
    lineHeight: typeface.specimenLineHeight ?? 'normal',
  }
}
