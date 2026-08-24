import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { App } from './app/App'
import { corpusReady } from './data/loadCorpus'
import {
  applyThemeVariables,
  defaultPalette,
  defaultTypeface,
  DEFAULT_TEXT_SCALE,
  themeVariables,
} from './theme'
import './index.css'

/**
 * Fired here rather than from a component, and never awaited: the committed
 * corpus (scope 4.2) loads into IndexedDB in the background, in parallel with
 * the first render, so a first run is never held up waiting for it.
 *
 * `corpusReady` rather than `loadCorpusIfNeeded` because Discover waits on the
 * same promise: one load, shared, rather than two racing each other.
 */
void corpusReady().catch((error: unknown) => {
  console.error('Failed to load the corpus', error)
})

/**
 * The default palette is written onto the document before React renders, so the
 * first paint is already Paris Navy on bone paper. The ThemeProvider then
 * replaces it with the user's stored selection once `user_settings` has been
 * read, which on a local database is a few milliseconds and is invisible.
 *
 * Without this the app would flash white on every launch, which for something
 * opened at six in the morning is worth ten lines.
 */
applyThemeVariables(
  document.documentElement,
  themeVariables(defaultPalette(), defaultTypeface(), DEFAULT_TEXT_SCALE),
)

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  )
}
