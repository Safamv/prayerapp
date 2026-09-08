import { describe, expect, it } from 'vitest'
import { defaultPalette, getPalette } from '../../src/theme/palettes.ts'
import { strings } from '../../src/strings/index.ts'
import { APP_ICON_FILES } from './appIcon.ts'
import { webManifest, webManifestJson } from './webManifest.ts'

const TEXT = { name: strings.appName, shortName: strings.appName }

describe('the web app manifest', () => {
  const manifest = webManifest(defaultPalette(), TEXT)

  it('installs as a standalone app rooted at the site root', () => {
    expect(manifest.display).toBe('standalone')
    expect(manifest.start_url).toBe('/')
    expect(manifest.scope).toBe('/')
  })

  it('takes its name from src/strings/, not from a literal', () => {
    expect(manifest.name).toBe(strings.appName)
    expect(manifest.short_name).toBe(strings.appName)
  })

  it('takes both colours from the theme registry', () => {
    expect(manifest.theme_color).toBe(defaultPalette().tokens.field)
    expect(manifest.background_color).toBe(defaultPalette().tokens.paper)
  })

  /**
   * The assertion that a pasted hex cannot survive. If someone ever replaces the
   * generated colour with a literal, the manifest stops following the palette it
   * is handed and this fails naming both values.
   */
  it('follows whichever palette it is given', () => {
    const oxblood = getPalette('oxblood-cloth')
    expect(oxblood.tokens.field).not.toBe(defaultPalette().tokens.field)
    expect(webManifest(oxblood, TEXT).theme_color).toBe(oxblood.tokens.field)
  })

  it('declares every icon the build writes, including a maskable one', () => {
    expect(manifest.icons.map((icon) => icon.src)).toEqual(
      APP_ICON_FILES.map((icon) => `/${icon.file}`),
    )
    expect(manifest.icons.map((icon) => icon.sizes)).toEqual([
      '192x192',
      '512x512',
      '512x512',
      '180x180',
    ])
    expect(manifest.icons.filter((icon) => icon.purpose === 'maskable')).toHaveLength(1)
    expect(manifest.icons.every((icon) => icon.type === 'image/png')).toBe(true)
  })

  it('invents no copy of its own', () => {
    expect(manifest).not.toHaveProperty('description')
  })

  it('is Australian English', () => {
    expect(manifest.lang).toBe('en-AU')
  })

  it('serialises to JSON a browser can parse', () => {
    const parsed: unknown = JSON.parse(webManifestJson(defaultPalette(), TEXT))
    expect(parsed).toEqual(manifest)
  })
})
