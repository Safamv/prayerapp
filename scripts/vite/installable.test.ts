import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { APPLE_TOUCH_ICON, FAVICON_SVG } from '../lib/appIcon.ts'

/**
 * `index.html` is the one file in the build that no test would otherwise read,
 * and it is where an installed app's whole first impression is decided. These
 * are the tags iOS looks for, and the two it must not find.
 */
const html = readFileSync(join(import.meta.dirname, '..', '..', 'index.html'), 'utf8')

describe('index.html', () => {
  it('links the manifest and the icons the build actually writes', () => {
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest" />')
    expect(html).toContain(`href="/${APPLE_TOUCH_ICON}"`)
    expect(html).toContain(`href="/${FAVICON_SVG}"`)
  })

  it('carries the three tags iOS reads and the manifest does not supply', () => {
    expect(html).toContain('name="apple-mobile-web-app-capable" content="yes"')
    expect(html).toContain('name="mobile-web-app-capable" content="yes"')
    expect(html).toContain('name="apple-mobile-web-app-status-bar-style"')
  })

  /**
   * CLAUDE.md rule 1, in the one file the lint rule cannot see: it polices
   * `src/**` and this is not a TypeScript file. `theme-color` carries the navy
   * and is injected during the build from the theme registry instead.
   */
  it('names no colour, so the navy has one home', () => {
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(html).not.toMatch(/rgba?\(/)
    expect(html).not.toContain('name="theme-color"')
  })

  /**
   * Without `viewport-fit=cover`, iOS keeps the web view clear of the notch and
   * the home indicator on its own. With it, those strips become the page's
   * problem, and the fixed tab bar of design-tokens 5.6 would sit under the home
   * indicator. Nothing in the app reads a safe-area inset, so this stays out
   * until something does.
   */
  it('does not opt into the safe areas it has no handling for', () => {
    const viewport = /<meta name="viewport" content="([^"]*)"/.exec(html)?.[1]
    expect(viewport).toBeDefined()
    expect(viewport).not.toContain('viewport-fit')
  })

  it('is Australian English, like everything else', () => {
    expect(html).toContain('lang="en-AU"')
  })
})
