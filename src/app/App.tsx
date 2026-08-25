import { useCallback } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { TabBar } from '../components/TabBar'
import { CategoryScreen } from '../features/discover/CategoryScreen'
import { CollectionScreen } from '../features/discover/CollectionScreen'
import { DiscoverScreen } from '../features/discover/DiscoverScreen'
import { ReadingScreen } from '../features/discover/ReadingScreen'
import { LogScreen } from '../features/log/LogScreen'
import { ConfirmLinesScreen } from '../features/memorise/ConfirmLinesScreen'
import { MemoriseScreen } from '../features/memorise/MemoriseScreen'
import { SettingsScreen } from '../features/settings/SettingsScreen'
import { ThemeProvider, type ThemeSelection } from '../theme'
import { UserContext } from './userContext'
import { persistThemeSelection, useBootstrap } from './useBootstrap'

/**
 * The three-tab shell. Scope 3.1, design-tokens 5.6.
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
              <Route path="/memorise" element={<MemoriseScreen />} />
              {/* Scope 8.4's add moment. On the memorisation side of the app,
                  reached from the reading view's list mark. Decision D5.1. */}
              <Route path="/memorise/add/:passageId" element={<ConfirmLinesScreen />} />
              <Route path="/log" element={<LogScreen />} />
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
