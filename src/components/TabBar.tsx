import { NavLink } from 'react-router'
import { strings } from '../strings'
import { typeStyle } from '../theme'

/**
 * The three-tab bar. Scope 3.1 and design-tokens 5.6.
 *
 * Background `deep`, padding `15px 26px 26px`, three 80px items. Active: label
 * `accent`. Inactive: label `on-field-45`.
 *
 * ## Principle 7.6 is built into this component
 *
 * **No numeric badge on any tab, ever.** Design-tokens 5.6 permits a small dot
 * at most and says nothing is the safer default, and scope 7.6 explains why: a
 * "3 due today" badge met while opening the app at a gathering turns worship
 * into a chore reminder. There is deliberately no prop here through which a
 * count could be passed.
 *
 * ## The missing icons
 *
 * Design-tokens 5.6 calls for a 15px icon above each label. Design-tokens 8.3
 * defines exactly three inline SVGs for the whole app - the nine-pointed star,
 * the magnifier and the back chevron - and none of them is a tab icon. Rather
 * than invent three marks for the app's most permanent piece of chrome, the bar
 * ships as three tracked caps labels and the icon is an open question for Safa.
 * The 6px gap and the icon row are not stubbed out; they are simply absent until
 * there is something to put there.
 */

/** Design-tokens 5.6: three 80px items. */
const ITEM_WIDTH = 80

const TABS = [
  { to: '/discover', label: strings.tabs.discover },
  { to: '/memorise', label: strings.tabs.memorise },
  { to: '/log', label: strings.tabs.log },
] as const

export function TabBar() {
  return (
    <nav
      aria-label={strings.accessibility.primaryNavigation}
      className="flex shrink-0 justify-between bg-deep"
      style={{ padding: '15px 26px 26px' }}
    >
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className="flex items-center justify-center text-center"
          style={{ width: ITEM_WIDTH }}
        >
          {({ isActive }) => (
            <span
              style={{
                ...typeStyle('tabLabel'),
                color: isActive ? 'var(--accent)' : 'var(--on-field-45)',
              }}
            >
              {tab.label}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
