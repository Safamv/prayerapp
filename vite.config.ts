import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

/**
 * The three values Settings shows a tester (CLAUDE.md section 8):
 *
 *     v0.2.0 · a3fa300 · 24 Aug 2026
 *
 * They are injected at build time rather than read at runtime, because reading
 * them at runtime would mean a file to fetch, and this app makes no network
 * calls at all (scope 12.2).
 *
 * `package.json` is the single source of truth for the version, so bumping it is
 * the only edit a release needs.
 */

function packageVersion(): string {
  const raw = readFileSync(new URL('./package.json', import.meta.url), 'utf8')
  const parsed: Record<string, unknown> = JSON.parse(raw) as Record<string, unknown>
  const version = parsed['version']
  return typeof version === 'string' ? version : '0.0.0'
}

/**
 * The commit the working tree is on. This is the commit *before* the one that
 * contains the build, which is normal and is what makes it useful: it names the
 * code, not the release note.
 *
 * Falls back to `unknown` when git is unavailable, which happens if the
 * repository is ever built from a downloaded archive rather than a clone.
 */
function shortCommitSha(): string {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return 'unknown'
  }
}

/** Australian English, and the format of CLAUDE.md section 8: `24 Aug 2026`. */
function buildDate(): string {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date())
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(packageVersion()),
    __APP_COMMIT__: JSON.stringify(shortCommitSha()),
    __APP_BUILD_DATE__: JSON.stringify(buildDate()),
  },
  test: {
    // The scheduler and the data layer are both headless. The theme registry and
    // the shell are not, so those files opt into jsdom with a
    // `@vitest-environment` docblock rather than making every test pay for a DOM.
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // Real IndexedDB for every test that touches `src/data/`. See the setup file.
    setupFiles: ['./src/test/setup.ts'],
    // The scheduler simulation prints interval tables. They are the point of
    // the test, so they must survive `npm run test` rather than needing a flag.
    disableConsoleIntercept: true,
  },
})
