import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { App } from './app/App'
import {
  applyThemeVariables,
  defaultPalette,
  defaultTypeface,
  DEFAULT_TEXT_SCALE,
  themeVariables,
} from './theme'
import './index.css'

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
