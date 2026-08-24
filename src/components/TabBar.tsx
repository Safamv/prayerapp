import { NavLink } from 'react-router'
import { strings } from '../strings'
import { typeStyle } from '../theme'
import { DiscoverIcon, LogIcon, MemoriseIcon } from './TabIcons'

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
 * ## The icons
 *
 * A 15px icon above a caps label with a 6px gap, per design-tokens 5.6. Active:
 * icon and label both `accent`. Inactive: icon `paper` at .42 opacity, label
 * `on-field-45`. The three marks live in `TabIcons.tsx` and are a first pass
 * Safa asked for and can edit (decision D2.10); nothing here depends on which
 * shapes they are.
 */

/** Design-tokens 5.6: three 80px items. */
const ITEM_WIDTH = 80

/** Design-tokens 5.6: 6px between the icon and the label. */
const ICON_LABEL_GAP = 6

const TABS = [
  { to: '/discover', label: strings.tabs.discover, Icon: DiscoverIcon },
  { to: '/memorise', label: strings.tabs.memorise, Icon: MemoriseIcon },
  { to: '/log', label: strings.tabs.log, Icon: LogIcon },
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
          className="flex flex-col items-center text-center"
          style={{ width: ITEM_WIDTH, gap: ICON_LABEL_GAP }}
        >
          {({ isActive }) => (
            <>
              <span
                className="flex"
                style={{
                  color: isActive ? 'var(--accent)' : 'var(--paper)',
                  opacity: isActive ? 1 : 0.42,
                }}
              >
                <tab.Icon />
              </span>
              <span
                style={{
                  ...typeStyle('tabLabel'),
                  color: isActive ? 'var(--accent)' : 'var(--on-field-45)',
                }}
              >
                {tab.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
