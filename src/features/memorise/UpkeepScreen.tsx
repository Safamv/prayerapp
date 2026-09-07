import { useCallback, useState } from 'react'
import { useParams } from 'react-router'
import { MEMORISE_PATH } from '../../app/routes'
import { useAsyncValue } from '../../app/useAsyncValue'
import { useBack } from '../../app/useBack'
import { useUserId } from '../../app/userContext'
import { ScrollTail } from '../../components/ListSurface'
import { CompactActionHeader } from '../../components/NavyHeader'
import { Screen } from '../../components/Screen'
import {
  SelectionStar,
  SettingsChoiceRow,
  SettingsRow,
  SettingsSection,
} from '../../components/SettingsRow'
import { Stepper } from '../../components/Stepper'
import { DEFAULT_FOCUS_DAYS, FOCUS_DAYS_RANGE } from '../../config/defaults'
import { today as todayOf } from '../../data/clock'
import type { UpkeepState } from '../../data/types'
import {
  endFocus,
  getListedPassage,
  setUpkeepState,
  startFocus,
  type ListedPassage,
} from '../../data/upkeep'
import { focusUntilDay, isFocusActive } from '../../queue'
import { strings } from '../../strings'
import { collectionLabel, passageAttribution } from '../../strings/attribution'
import { formatDay } from '../../strings/dates'
import { typeStyle } from '../../theme'

/**
 * **How one passage comes round.** Scope 8.5's three upkeep states and scope
 * 8.6's focus, on the only screen that sets either.
 *
 * ## Why the two live together
 *
 * They are the same question asked at two speeds. Upkeep is "how often should
 * this come round, from now on"; focus is "for the next week, is this the only
 * thing that matters". Both are answered about one passage, both write to
 * `user_prayers`, and separating them would mean two screens each holding one
 * control.
 *
 * ## Where it is reached from
 *
 * The UPKEEP section of the Memorise tab, which lists everything on the user's
 * list. It cannot be reached from a queue row alone: a resting passage is never
 * in the queue and a passage that is not due today is not either, so a door that
 * only opened from today's work would shut behind the first passage put to rest.
 * Decision D6.3.
 *
 * ## Attribution
 *
 * The screen names a passage, so it names its author (principle 7.10,
 * design-tokens 7). The copyright line belongs to the reading view alone.
 */

/** Design-tokens 5.3: the list surface is `0 26px` over paper. */
const SURFACE = { padding: '0 26px' }

const UPKEEP_OPTIONS: readonly {
  readonly state: UpkeepState
  readonly label: string
  readonly caption: string
}[] = [
  { state: 'active', label: strings.upkeep.active, caption: strings.upkeep.activeCaption },
  {
    state: 'occasional',
    label: strings.upkeep.occasional,
    caption: strings.upkeep.occasionalCaption,
  },
  { state: 'resting', label: strings.upkeep.resting, caption: strings.upkeep.restingCaption },
]

export function UpkeepScreen() {
  const { passageId = '' } = useParams()
  const userId = useUserId()
  const back = useBack(MEMORISE_PATH)
  const today = todayOf()

  // Bumped after every write, so the screen re-reads the row it just changed
  // rather than holding a copy that has to be kept in step by hand.
  const [revision, setRevision] = useState(0)
  const reload = useCallback(() => {
    setRevision((previous) => previous + 1)
  }, [])
  const loaded = useAsyncValue<ListedPassage | null>(
    async () => (await getListedPassage(userId, passageId)) ?? null,
    `${passageId}:${String(revision)}`,
  )

  /** How long a focus started from here would run. Scope 8.6's user-settable count. */
  const [days, setDays] = useState(DEFAULT_FOCUS_DAYS)

  const passage = loaded?.passage
  const userPrayer = loaded?.userPrayer
  const focused =
    userPrayer !== undefined &&
    isFocusActive({ isFocus: userPrayer.is_focus, focusUntil: userPrayer.focus_until }, today)

  const onFocusChange = () => {
    if (passage === undefined) return
    const write = focused
      ? endFocus(userId, passage.id)
      : startFocus(userId, passage.id, today, days)
    void write.then(reload, (error: unknown) => {
      console.error('Failed to change focus', error)
    })
  }

  return (
    <Screen
      header={
        <CompactActionHeader
          label={passage === undefined ? '' : collectionLabel(passage.collection)}
          onBack={back}
        />
      }
    >
      {passage !== undefined && userPrayer !== undefined && (
        <div style={SURFACE}>
          <header style={{ paddingTop: 26 }}>
            <h1 className="text-deep" style={typeStyle('settingsTitle')}>
              {passage.title}
            </h1>
            {/* Principle 7.10: every surface that names a passage names its author. */}
            <p
              className="text-on-paper-44"
              style={{ ...typeStyle('rowAttribution'), marginTop: 6 }}
            >
              {passageAttribution(passage)}
            </p>
          </header>

          <SettingsSection label={strings.upkeep.section} />
          <div role="radiogroup" aria-label={strings.accessibility.upkeepOptions}>
            {UPKEEP_OPTIONS.map((option) => (
              <SettingsChoiceRow
                key={option.state}
                label={option.label}
                caption={option.caption}
                selected={userPrayer.upkeep_state === option.state}
                onSelect={() => {
                  void setUpkeepState(userId, passage.id, option.state).then(
                    reload,
                    (error: unknown) => {
                      console.error('Failed to set the upkeep state', error)
                    },
                  )
                }}
              />
            ))}
          </div>

          <SettingsSection label={strings.upkeep.focusSection} />
          <p
            className="text-on-paper-50"
            style={{ ...typeStyle('bylineItalic'), paddingBottom: 6 }}
          >
            {strings.upkeep.focusNote}
          </p>

          {/* The count is set before focus starts and is not editable after, because
              scope 8.6 measures it from the day focus begins. Ending focus and
              starting it again is how it is changed, and that is one tap each. */}
          {!focused && (
            <SettingsRow label={strings.upkeep.focusDays}>
              <Stepper
                label={strings.upkeep.focusDays}
                value={days}
                range={FOCUS_DAYS_RANGE}
                onChange={setDays}
              />
            </SettingsRow>
          )}

          <FocusSwitch
            label={focused ? strings.upkeep.focusEnd : strings.upkeep.focusStart}
            caption={strings.upkeep.focusUntil(
              formatDay(focused ? (userPrayer.focus_until ?? '') : focusUntilDay(today, days)),
            )}
            focused={focused}
            onChange={onFocusChange}
          />

          <ScrollTail />
        </div>
      )}
    </Screen>
  )
}

/**
 * Focus, as one switch on a settings row.
 *
 * `role="switch"` rather than a button, because it is on or off and a screen
 * reader should say which. The mark is the same nine-pointed star the choice
 * rows use, shown when focus is in force and hidden when it is not, so the row
 * does not reflow as it is turned on and off (design-tokens 5.7).
 */
function FocusSwitch({
  label,
  caption,
  focused,
  onChange,
}: {
  label: string
  caption: string
  focused: boolean
  onChange: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={focused}
      aria-label={label}
      onClick={onChange}
      className="flex w-full items-center border-b border-rule text-left last:border-b-0"
      style={{ padding: '13px 0', gap: 14, minHeight: 44 }}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-deep" style={typeStyle('settingsRowLabel')}>
          {label}
        </span>
        <span
          className="block text-on-paper-50"
          style={{ ...typeStyle('settingsRowCaption'), marginTop: 2 }}
        >
          {caption}
        </span>
      </span>
      <SelectionStar selected={focused} />
    </button>
  )
}
