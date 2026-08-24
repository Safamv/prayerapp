import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

/*
 * Session 1 ships no UI. This entry point exists so that `npm run build`
 * is a real gate rather than a no-op. The three-tab shell arrives in
 * session 2, along with the strings module and the theme registry, at which
 * point anything rendered here gets its text from `src/strings/`.
 */

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(<StrictMode />)
}
