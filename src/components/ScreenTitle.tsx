import { typeStyle } from '../theme'

/**
 * The 42px display-slot title at the top of a screen. Design-tokens 2.2.
 *
 * It takes its text as a prop rather than holding one, so the words stay in
 * `src/strings/` (principle 7.11) and this component stays a piece of typography.
 */
export function ScreenTitle({ children }: { children: string }) {
  return (
    <h1 className="text-deep" style={typeStyle('screenTitle')}>
      {children}
    </h1>
  )
}
