import type { Palette } from './palettes'
import { fontStack, opticalScalar, TYPE_SLOTS, type Typeface } from './typefaces'
import { clampTextScale, roleFontSize, TYPE_ROLES, type TypeRoleName } from './typeScale'

/**
 * The bridge between the registry and the stylesheet. Decision D0.8.
 *
 * `themeVariables` is a pure function: a palette, a typeface and a text scale in,
 * a flat map of CSS custom properties out. That is what makes the whole theme
 * system testable without a browser, and it is why the provider below it is only
 * a dozen lines.
 *
 * Three families of variable are produced.
 *
 * - **Colour**, one per palette token, named exactly as design-tokens 1.1 names
 *   it: `--field`, `--accent-dk`, `--on-paper-72`.
 * - **Slot**, three families, three weights, three styles and three optical
 *   scalars: `--family-display`, `--weight-body`, `--scalar-caps`. These are the
 *   only font vocabulary a component is allowed to know (CLAUDE.md rule 2).
 * - **Role**, the computed values from design-tokens 2.2 for each of the
 *   eighteen roles: `--type-passage-body-size`, `--type-tab-label-tracking`.
 *   Components reach these through `typeStyle`, which is typed, rather than by
 *   writing the variable name out.
 *
 * Changing palette, typeface or text size rewrites this map onto one element and
 * the entire app re-renders in CSS, with no React state anywhere below the
 * provider.
 */

/** `passageBody` becomes `passage-body`, so the variable reads as CSS rather than JS. */
export function roleVariablePrefix(role: TypeRoleName): string {
  return `--type-${role.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`
}

export function themeVariables(
  palette: Palette,
  typeface: Typeface,
  userTextScale: number,
): Record<string, string> {
  const variables: Record<string, string> = {}

  // Typed rather than `Object.entries`, which widens an interface's values to
  // `any` and would let a non-string token through unnoticed.
  const tokens: Record<string, string> = palette.tokens
  for (const token of Object.keys(tokens)) {
    variables[`--${token}`] = tokens[token] ?? ''
  }

  for (const name of TYPE_SLOTS) {
    variables[`--family-${name}`] = fontStack(typeface, name)
    variables[`--weight-${name}`] = String(typeface[name].weight)
    variables[`--style-${name}`] = typeface[name].style
    variables[`--scalar-${name}`] = String(opticalScalar(typeface, name))
  }

  variables['--text-scale'] = String(clampTextScale(userTextScale))

  for (const [name, role] of Object.entries(TYPE_ROLES)) {
    const prefix = roleVariablePrefix(name as TypeRoleName)
    variables[`${prefix}-size`] = `${String(roleFontSize(role, typeface, userTextScale))}px`
    variables[`${prefix}-family`] = `var(--family-${role.slot})`
    variables[`${prefix}-weight`] = `var(--weight-${role.slot})`
    variables[`${prefix}-style`] =
      'italic' in role && role.italic ? 'italic' : `var(--style-${role.slot})`
    variables[`${prefix}-tracking`] = role.tracking ?? 'normal'
    variables[`${prefix}-line-height`] =
      role.lineHeight === null ? 'normal' : String(role.lineHeight)
  }

  return variables
}

/**
 * Writes the map onto one element, which is `document.documentElement` in the
 * app. Design-tokens 1 calls for "one active at a time, read by a single
 * provider", and a single element is the smallest thing that satisfies it.
 */
export function applyThemeVariables(element: HTMLElement, variables: Record<string, string>): void {
  for (const [name, value] of Object.entries(variables)) {
    element.style.setProperty(name, value)
  }
}
