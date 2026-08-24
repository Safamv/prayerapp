import { useCallback } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { TabBar } from '../components/TabBar'
import { DiscoverScreen } from '../features/discover/DiscoverScreen'
import { LogScreen } from '../features/log/LogScreen'
import { MemoriseScreen } from '../features/memorise/MemoriseScreen'
import { SettingsScreen } from '../features/settings/SettingsScreen'
import { ThemeProvider, type ThemeSelection } from '../theme'
import { persistThemeSelection, useBootstrap } from './useBootstrap'

/**
 * The three-tab shell. Scope 3.1, design-tokens 5.6.
 *
 * The tab bar is fixed and persists through every route, including Settings and,
 * from session 4, the reading view (design-tokens 5.6).
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
      <div className="flex h-full flex-col bg-paper">
        <main className="paper-grain min-h-0 flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/discover" replace />} />
            <Route path="/discover" element={<DiscoverScreen />} />
            <Route path="/memorise" element={<MemoriseScreen />} />
            <Route path="/log" element={<LogScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="*" element={<Navigate to="/discover" replace />} />
          </Routes>
        </main>
        <TabBar />
      </div>
    </ThemeProvider>
  )
}
