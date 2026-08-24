import { ScreenTitle } from '../../components/ScreenTitle'
import { strings } from '../../strings'

/**
 * Memorise: today's queue, the learning flow, focus mode. Scope 3.1.
 *
 * Empty this session by design. Session 5 brings segmentation at add time,
 * session 6 the daily queue with caps and silent overflow, upkeep states and
 * focus mode, and sessions 7 and 8 the quiz ladder.
 */
export function MemoriseScreen() {
  return (
    <section className="p-6">
      <ScreenTitle>{strings.screenTitles.memorise}</ScreenTitle>
    </section>
  )
}
