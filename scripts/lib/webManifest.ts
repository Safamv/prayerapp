import type { Palette } from '../../src/theme/palettes.ts'
import { APP_ICON_FILES } from './appIcon.ts'

/**
 * The web app manifest, built from the theme registry.
 *
 * ## Why this is generated and not a file
 *
 * A manifest is static JSON that the browser reads before any of the app has
 * run, so it cannot ask the theme provider anything. It also has to name two
 * colours. CLAUDE.md rule 1 says a colour is never hard coded, and there are two
 * palettes with two different navies, so pasting one of them here would put a
 * third copy of a colour in the repository and quietly break the rule the whole
 * theme registry exists to keep.
 *
 * So the manifest is generated during the build from `defaultPalette()`. The
 * navy in the shipped `manifest.webmanifest` is the registry's navy by
 * construction, and changing the palette's `field` changes the manifest at the
 * next build with nothing else to remember.
 *
 * ## The exception this does not remove, and decision D10.1
 *
 * It is still the *default* palette. A tester who switches to Oxblood Cloth gets
 * a manifest describing a navy app, because a manifest is read once at install
 * and describes the installed thing, not the running one. There is no way round
 * that short of a manifest per palette, which would mean re-installing the app
 * to change a colour. Recorded rather than hidden.
 */

export interface WebManifestIcon {
  readonly src: string
  readonly sizes: string
  readonly type: string
  readonly purpose: string
}

export interface WebManifest {
  readonly id: string
  readonly name: string
  readonly short_name: string
  readonly lang: string
  readonly dir: string
  readonly start_url: string
  readonly scope: string
  readonly display: string
  readonly theme_color: string
  readonly background_color: string
  readonly icons: readonly WebManifestIcon[]
}

export interface ManifestText {
  /** Under the icon on the home screen. From `src/strings/`, per principle 7.11. */
  readonly name: string
  readonly shortName: string
}

/**
 * There is deliberately no `description`. The field is optional, iOS ignores it,
 * and the scope has no tagline for the app - so writing one here would be
 * inventing user-facing copy outside `src/strings/`, which principle 7.11 and
 * the strings module's own first rule both forbid. If a line is ever written for
 * the app, it belongs in `src/strings/` and can be added here in one edit.
 */

export function webManifest(palette: Palette, text: ManifestText): WebManifest {
  return {
    // A stable identity, so a later change to `start_url` is understood as the
    // same app rather than as a second one appearing beside it.
    id: '/',
    name: text.name,
    short_name: text.shortName,
    // CLAUDE.md rule 15: Australian English everywhere.
    lang: 'en-AU',
    dir: 'ltr',
    // The app mounts BrowserRouter, and an installed app relaunches at whatever
    // route it was last on. The host rewrites every path to index.html so that
    // works; see vercel.json.
    start_url: '/',
    scope: '/',
    // No browser chrome. This is the whole point of the exercise: scope 12.3
    // describes a printed object, and a URL bar over it is the one piece of
    // furniture the design cannot absorb.
    display: 'standalone',
    // The navy at the top of every screen (design-tokens 1.1: "Navy chrome:
    // headers"), so the status bar continues the header rather than cutting it.
    theme_color: palette.tokens.field,
    // The ground the app opens on, which is what a launch screen should hold
    // while the first paint is still coming.
    background_color: palette.tokens.paper,
    icons: APP_ICON_FILES.map((icon) => ({
      src: `/${icon.file}`,
      sizes: `${String(icon.size)}x${String(icon.size)}`,
      type: 'image/png',
      purpose: icon.purpose,
    })),
  }
}

/** Pretty printed, because it is committed to nothing and read by people debugging. */
export function webManifestJson(palette: Palette, text: ManifestText): string {
  return `${JSON.stringify(webManifest(palette, text), null, 2)}\n`
}
