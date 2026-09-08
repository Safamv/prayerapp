import { useCallback } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { TabBar } from '../components/TabBar'
import { CategoryScreen } from '../features/discover/CategoryScreen'
import { CollectionScreen } from '../features/discover/CollectionScreen'
import { DiscoverScreen } from '../features/discover/DiscoverScreen'
import { BookmarksScreen } from '../features/discover/BookmarksScreen'
import { ReadingScreen } from '../features/discover/ReadingScreen'
import { ConfirmLinesScreen } from '../features/memorise/ConfirmLinesScreen'
import { MemoriseScreen } from '../features/memorise/MemoriseScreen'
import { MyListScreen } from '../features/memorise/MyListScreen'
import { RecitalScreen } from '../features/memorise/RecitalScreen'
import { ReviewScreen } from '../features/memorise/ReviewScreen'
import { UpkeepScreen } from '../features/memorise/UpkeepScreen'
import { SettingsScreen } from '../features/settings/SettingsScreen'
import { ThemeProvider, type ThemeSelection } from '../theme'
import { UserContext } from './userContext'
import { persistThemeSelection, useBootstrap } from './useBootstrap'

/**
 * The tab shell. Design-tokens 5.6.
 *
 * Three tabs, split down the middle: **Devotions and Bookmarks are the prayer
 * book, Memorise is everything you do about learning** (decision D7.1). Log is
 * no longer a tab and no longer a screen; what it was going to hold - the
 * streak, the freshness states, the passage detail of scope 11 - belongs on the
 * Memorise tab, and session 10 builds it there. Recents (scope 6.4) joins the
 * left pair at v1.0 and makes it four. Scope 3.1 needs Safa's revision to match.
 *
 * The tab bar is fixed and persists through every route, including Settings and
 * the reading view (design-tokens 5.6).
 *
 * ## `<main>` holds the screens; it no longer scrolls them
 *
 * Until session 4 this was one scrolling box, which was right while every screen
 * was a title and a paragraph. Design-tokens 5.1 and 5.4 want a fixed header
 * with the body scrolling beneath it, and a header inside a scrolling box
 * scrolls with it. So each screen now owns its own scroll through `Screen` in
 * `src/components/Screen.tsx`, and this is the fixed frame the three of them sit
 * in, between the top of the phone and the tab bar.
 *
 * The router is deliberately outside this component, in `main.tsx`, so that a
 * test can render the whole app inside a `MemoryRouter` and drive it without a
 * browser history.
 */
export function App() {
  const bootstrap = useBootstrap()

  const onThemeChange = useCallback(
    (selection: ThemeSelection) => {
      if (bootstrap !== null) persistThemeSelection(bootstrap.userId, selection)
    },
    [bootstrap],
  )

  // The default theme is already on the document from `main.tsx`, so this holds
  // a correctly coloured empty screen rather than a white flash.
  if (bootstrap === null) return <div className="h-full bg-paper" />

  return (
    <ThemeProvider initial={bootstrap.theme} onChange={onThemeChange}>
      <UserContext value={bootstrap.userId}>
        <div className="flex h-full flex-col bg-paper">
          <main className="min-h-0 flex-1 overflow-hidden bg-paper">
            <Routes>
              <Route path="/" element={<Navigate to="/discover" replace />} />
              <Route path="/discover" element={<DiscoverScreen />} />
              <Route path="/discover/collection/:collection" element={<CollectionScreen />} />
              <Route
                path="/discover/collection/:collection/category/:tagId"
                element={<CategoryScreen />}
              />
              <Route path="/discover/passage/:passageId" element={<ReadingScreen />} />
              {/* Scope 6.7's kept places. A tab of its own, and a screen in the
                  Discover folder, because that folder is where principle 7.6 is
                  a failing build rather than a paragraph. Decision D7.1. */}
              <Route path="/bookmarks" element={<BookmarksScreen />} />
              <Route path="/memorise" element={<MemoriseScreen />} />
              {/* Scope 6.5's ordered list, which absorbed session 6's upkeep
                  roll call. Decision D7.3. */}
              <Route path="/memorise/list" element={<MyListScreen />} />
              {/* Scope 9.1's ladder, for one prayer's lines today. Reached from
                  a row of today's queue, which is the only door. Decision D8.1. */}
              <Route path="/memorise/review/:passageId" element={<ReviewScreen />} />
              {/* Scope 9.5's milestone: the whole passage, from memory. Reached
                  deliberately from the FROM MEMORY section (D9.1) and, once the
                  passage is promoted, from its row in today's work (8.7). */}
              <Route path="/memorise/recite/:passageId" element={<RecitalScreen />} />
              {/* Scope 8.4's add moment. On the memorisation side of the app,
                  reached from the reading view's list mark. Decision D5.1. */}
              <Route path="/memorise/add/:passageId" element={<ConfirmLinesScreen />} />
              {/* Scope 8.5's upkeep states and scope 8.6's focus, for one
                  passage. Reached from the UPKEEP section of the Memorise tab,
                  because a resting passage is never in the queue. Decision D6.3. */}
              <Route path="/memorise/upkeep/:passageId" element={<UpkeepScreen />} />
              <Route path="/settings" element={<SettingsScreen />} />
              <Route path="*" element={<Navigate to="/discover" replace />} />
            </Routes>
          </main>
          <TabBar />
        </div>
      </UserContext>
    </ThemeProvider>
  )
}
