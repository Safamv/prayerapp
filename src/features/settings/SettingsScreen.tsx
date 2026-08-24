import { Link } from 'react-router'
import { BackChevron } from '../../components/BackChevron'
import { Screen } from '../../components/Screen'
import { buildStamp } from '../../config/build'
import { strings } from '../../strings'
import { typeStyle } from '../../theme'

/**
 * Settings.
 *
 * This session it holds one thing: the build stamp of CLAUDE.md section 8,
 *
 *     v0.2.0 · a3fa300 · 24 Aug 2026
 *
 * which is what a tester reads off their screen when reporting something. It has
 * to be here from this session onward, which is why the screen exists at all
 * before there is anything to configure.
 *
 * The palette, text size and `[v0.1]` typeface controls all read and write
 * through the theme registry and `user_settings`, which are both built and
 * tested this session. The controls themselves are not: scope 12.3 ships the
 * text size control in V0 and tags the seven-option typeface picker `[v0.1]`,
 * and neither is on this session's list.
 */
export function SettingsScreen() {
  return (
    <Screen>
      <section className="p-6">
        <div className="flex items-center gap-3">
          <Link to="/log" aria-label={strings.accessibility.back} className="-ml-1">
            <BackChevron />
          </Link>
          <h1 className="text-deep" style={typeStyle('settingsTitle')}>
            {strings.screenTitles.settings}
          </h1>
        </div>

        <div className="mt-10 border-t border-rule pt-4">
          <p className="text-label" style={typeStyle('sectionHeader')}>
            {strings.settings.versionEyebrow}
          </p>
          <p className="mt-2 text-on-paper-60" style={typeStyle('settingsRowCaption')}>
            {buildStamp()}
          </p>
        </div>
      </section>
    </Screen>
  )
}
