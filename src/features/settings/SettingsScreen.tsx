import { useCallback, useState } from 'react'
import { Link } from 'react-router'
import { useAsyncValue } from '../../app/useAsyncValue'
import { useUserId } from '../../app/userContext'
import { BackChevron } from '../../components/BackChevron'
import { ScrollTail } from '../../components/ListSurface'
import { Screen } from '../../components/Screen'
import { SettingsRow, SettingsSection, SettingsSpecimenRow } from '../../components/SettingsRow'
import { Stepper } from '../../components/Stepper'
import { TextSizeControl } from '../../components/TextSizeControl'
import { buildStamp } from '../../config/build'
import { DAILY_NEW_LIMIT_RANGE, DAILY_REVIEW_LIMIT_RANGE } from '../../config/defaults'
import type { UserSettingsRow } from '../../data/types'
import { getOrCreateUserSettings, updateUserSettings } from '../../data/userSettings'
import { strings } from '../../strings'
import { shippedTypefaces, typeStyle, useTheme } from '../../theme'

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
 * ## And, from session 13, what the app looks like
 *
 * Scope 7.9's text size control and scope 12.3's seven-option typeface picker.
 * Both go through the theme registry rather than through this screen: the
 * provider holds the selection, writes it onto the document as CSS custom
 * properties, and reports the change back so it is persisted to `user_settings`.
 * So neither control here knows what a colour or a font family is, and the whole
 * app re-renders in CSS with no React state below the provider.
 *
 * The palette picker is still not built. Scope 12.3 ships two palettes and
 * session 13 added none, so there is one palette to choose from and a picker
 * offering one option is furniture. It is on the open questions list.
 */

/** Design-tokens 5.3: the list surface is `0 26px` over paper. */
const SURFACE = { padding: '0 26px' }

export function SettingsScreen() {
  const userId = useUserId()
  const theme = useTheme()
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

        {/* Scope 7.9: "adjustable text size with a genuinely large maximum
            ships in V0". Design-tokens 2.4 is the arithmetic and D2.6 is why
            the clamp is on the user's scale rather than on the final size. */}
        <SettingsSection label={strings.settings.textSizeSection} />
        <SettingsRow label={strings.settings.textSize} caption={strings.settings.textSizeCaption}>
          <TextSizeControl scale={theme.textScale} onChange={theme.setTextScale} />
        </SettingsRow>

        {/* Scope 12.3's seven options, drawn as design-tokens 5.7's specimen
            row: each written in the face it offers, because a row that names a
            font in words tells a reader nothing. `role="radiogroup"` makes the
            seven one choice rather than seven switches. */}
        <SettingsSection label={strings.settings.typefaceSection} />
        <div role="radiogroup" aria-label={strings.settings.typefaceSection}>
          {shippedTypefaces().map((typeface) => (
            <SettingsSpecimenRow
              key={typeface.id}
              typeface={typeface}
              textScale={theme.textScale}
              specimen={strings.settings.typefaceSpecimen}
              caption={strings.settings.typefaceCaption(
                typeface.name,
                strings.settings.typefaceDescriptors[typeface.id] ?? '',
              )}
              label={strings.settings.typefaceOption(typeface.name)}
              selected={typeface.id === theme.typeface.id}
              onSelect={() => {
                theme.setTypefaceId(typeface.id)
              }}
            />
          ))}
        </div>

        <SettingsSection label={strings.settings.versionEyebrow} />
        <p className="text-on-paper-60" style={typeStyle('settingsRowCaption')}>
          {buildStamp()}
        </p>

        <ScrollTail />
      </div>
    </Screen>
  )
}
