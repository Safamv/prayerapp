import { useCallback, useState } from 'react'
import { Link } from 'react-router'
import { useAsyncValue } from '../../app/useAsyncValue'
import { useUserId } from '../../app/userContext'
import { BackChevron } from '../../components/BackChevron'
import { ScrollTail } from '../../components/ListSurface'
import { Screen } from '../../components/Screen'
import { SettingsRow, SettingsSection } from '../../components/SettingsRow'
import { Stepper } from '../../components/Stepper'
import { buildStamp } from '../../config/build'
import { DAILY_NEW_LIMIT_RANGE, DAILY_REVIEW_LIMIT_RANGE } from '../../config/defaults'
import type { UserSettingsRow } from '../../data/types'
import { getOrCreateUserSettings, updateUserSettings } from '../../data/userSettings'
import { strings } from '../../strings'
import { typeStyle } from '../../theme'

/**
 * Settings.
 *
 * It holds two things: the build stamp of CLAUDE.md section 8,
 *
 *     v0.6.0 · a3fa300 · 7 Sept 2026
 *
 * which is what a tester reads off their screen when reporting something, and
 * scope 8.3's two queue caps, which that section calls user-adjustable.
 *
 * ## Why the caps are here rather than on Memorise
 *
 * They are configuration, and this is the screen the app configures things on.
 * Putting them beside the queue would mean a dial next to the day's work, which
 * invites turning the number up when the day looks long. That is precisely the
 * pressure principle 7.3's cap exists to remove.
 *
 * The palette, text size and `[v0.1]` typeface controls all read and write
 * through the theme registry and `user_settings`. Those controls are still not
 * built: scope 12.3 ships the text size control in V0 and tags the seven-option
 * typeface picker `[v0.1]`, and neither has been on a session's list yet.
 */

/** Design-tokens 5.3: the list surface is `0 26px` over paper. */
const SURFACE = { padding: '0 26px' }

export function SettingsScreen() {
  const userId = useUserId()
  const [revision, setRevision] = useState(0)
  const settings = useAsyncValue<UserSettingsRow>(
    () => getOrCreateUserSettings(userId),
    `${userId}:${String(revision)}`,
  )

  const write = useCallback(
    (patch: Partial<Omit<UserSettingsRow, 'user_id'>>) => {
      void updateUserSettings(userId, patch).then(
        () => {
          setRevision((previous) => previous + 1)
        },
        (error: unknown) => {
          console.error('Failed to write a setting', error)
        },
      )
    },
    [userId],
  )

  return (
    <Screen>
      <div style={SURFACE}>
        <header className="flex items-center" style={{ gap: 12, paddingTop: 26 }}>
          <Link to="/log" aria-label={strings.accessibility.back} className="-ml-1">
            <BackChevron />
          </Link>
          <h1 className="text-deep" style={typeStyle('settingsTitle')}>
            {strings.screenTitles.settings}
          </h1>
        </header>

        {/* Scope 8.3: "Default 15 reviews and 2 new segments per day,
            user-adjustable." The ranges are decision D6.4. */}
        <SettingsSection label={strings.settings.queueSection} />
        {settings !== undefined && (
          <>
            <SettingsRow
              label={strings.settings.dailyReviewLimit}
              caption={strings.settings.dailyReviewLimitCaption}
            >
              <Stepper
                label={strings.settings.dailyReviewLimit}
                value={settings.daily_review_limit}
                range={DAILY_REVIEW_LIMIT_RANGE}
                onChange={(value) => {
                  write({ daily_review_limit: value })
                }}
              />
            </SettingsRow>
            <SettingsRow
              label={strings.settings.dailyNewLimit}
              caption={strings.settings.dailyNewLimitCaption}
            >
              <Stepper
                label={strings.settings.dailyNewLimit}
                value={settings.daily_new_limit}
                range={DAILY_NEW_LIMIT_RANGE}
                onChange={(value) => {
                  write({ daily_new_limit: value })
                }}
              />
            </SettingsRow>
          </>
        )}
        {/* Design-tokens 5.7's footer note: body italic 14px in `on-paper-50`.
            The one place the app explains the cap, and it says what principle
            7.3 does rather than what it forbids. */}
        <p
          className="text-on-paper-50"
          style={{ ...typeStyle('bylineItalic'), padding: '10px 0 0' }}
        >
          {strings.settings.queueNote}
        </p>

        <SettingsSection label={strings.settings.versionEyebrow} />
        <p className="text-on-paper-60" style={typeStyle('settingsRowCaption')}>
          {buildStamp()}
        </p>

        <ScrollTail />
      </div>
    </Screen>
  )
}
