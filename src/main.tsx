import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { App } from './app/App'
import { registerServiceWorker } from './app/serviceWorker'
import { corpusReady } from './data/loadCorpus'
import { readThemeHint } from './data/themeHint'
import {
  applyThemeVariables,
  DEFAULT_PALETTE_ID,
  DEFAULT_TEXT_SCALE,
  DEFAULT_TYPEFACE_ID,
  getPalette,
  getTypeface,
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
 * Stores the app itself on the device, so it cold launches with no network
 * (scope 12.2). It caches the app and never touches IndexedDB, which is the
 * source of truth and is already local. See `app/serviceWorker.ts`.
 */
registerServiceWorker()

/**
 * **The theme is written onto the document before React renders**, so the first
 * paint is already the palette, the typeface and the text size the user chose.
 *
 * Without this the app would flash white on every launch, which for something
 * opened at six in the morning is worth ten lines.
 *
 * It reads localStorage rather than the database because the first paint happens
 * before an IndexedDB read can finish, and until session 13 that meant painting
 * the *default* theme and correcting it a few milliseconds later. With one
 * typeface nobody could see that. With seven it is a flash of Italiana on every
 * launch for six of them. See `data/themeHint.ts`, which is a cache of the
 * selection and never its source: the ThemeProvider is still handed what
 * `user_settings` says, and where the two disagree the database wins.
 */
const hint = readThemeHint()
applyThemeVariables(
  document.documentElement,
  themeVariables(
    getPalette(hint?.paletteId ?? DEFAULT_PALETTE_ID),
    getTypeface(hint?.typefaceId ?? DEFAULT_TYPEFACE_ID),
    hint?.textScale ?? DEFAULT_TEXT_SCALE,
  ),
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
