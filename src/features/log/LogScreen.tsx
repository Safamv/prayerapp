import { Link } from 'react-router'
import { Screen } from '../../components/Screen'
import { ScreenTitle } from '../../components/ScreenTitle'
import { strings } from '../../strings'
import { typeStyle } from '../../theme'

/**
 * Log: what you know, freshness, streak, passage detail. Scope 3.1.
 *
 * Empty this session apart from the one row that opens Settings. Session 9
 * brings the freshness states, the streak and the passage detail view.
 *
 * ## Why the settings row is here and not on Discover
 *
 * Scope 3.1 names three tabs and does not say which one owns Settings. Log is
 * the personal side of the app, and Discover is the devotional surface that
 * principle 7.6 exists to keep uncluttered, so a settings control belongs here.
 * This is a default rather than a decision of Safa's and it is on the open
 * questions list for him to overturn.
 */
export function LogScreen() {
  return (
    <Screen>
      <section className="p-6">
        <ScreenTitle>{strings.screenTitles.log}</ScreenTitle>
        <Link
          to="/settings"
          className="mt-8 flex border-t border-rule pt-4 text-on-paper-72"
          style={typeStyle('settingsRowLabel')}
        >
          {strings.settings.open}
        </Link>
      </section>
    </Screen>
  )
}
