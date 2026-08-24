import { ScreenTitle } from '../../components/ScreenTitle'
import { strings } from '../../strings'

/**
 * Discover: the library. Scope 3.1.
 *
 * Empty this session by design. Session 4 brings the alphabetical category
 * browse, the passage list with word count and author, the reading view with
 * attribution, bookmarking and add to list.
 *
 * ## Two rules bind everything built in this folder
 *
 * **Principle 7.6.** No due counts, no focus banner, no streak, no freshness
 * state and no progress indicator anywhere under here. It is enforced by
 * `src/principles/discover-isolation.test.ts`, which fails the build if anything
 * in this folder imports the scheduler or a progress module.
 *
 * **Decision D1.10.** Discover never surfaces a Ruhi quotation, in browse or in
 * search. It reads through `src/data/passages.ts`, which excludes the Ruhi
 * collection at the query, so this is structural rather than a filter to
 * remember.
 */
export function DiscoverScreen() {
  return (
    <section className="p-6">
      <ScreenTitle>{strings.screenTitles.discover}</ScreenTitle>
    </section>
  )
}
