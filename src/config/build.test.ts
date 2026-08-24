import { describe, expect, it } from 'vitest'
import { BUILD_INFO, buildStamp } from './build'

/**
 * The build stamp of CLAUDE.md section 8. This is what a tester reads off their
 * screen when reporting something, so it has to be present and true from this
 * session onward.
 *
 *     v0.2.0 · a3fa300 · 24 Aug 2026
 */

describe('the build stamp', () => {
  it('carries the version from package.json, injected at build time', () => {
    expect(BUILD_INFO.version).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('carries a short commit sha', () => {
    expect(BUILD_INFO.commit).toMatch(/^[0-9a-f]{7,12}$/)
  })

  it('carries a build date in Australian short form', () => {
    expect(BUILD_INFO.buildDate).toMatch(/^\d{1,2} [A-Z][a-z]{2} \d{4}$/)
  })

  it('reads as one line, separated by middle dots', () => {
    expect(buildStamp()).toBe(
      `v${BUILD_INFO.version} · ${BUILD_INFO.commit} · ${BUILD_INFO.buildDate}`,
    )
  })
})
