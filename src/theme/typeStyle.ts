import type { CSSProperties } from 'react'
import { roleVariablePrefix } from './cssVariables'
import type { TypeRoleName } from './typeScale'

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
