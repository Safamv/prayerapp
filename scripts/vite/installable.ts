import type { Plugin } from 'vite'
import corpusManifest from '../../src/data/corpus-data/manifest.json' with { type: 'json' }
import { strings } from '../../src/strings/index.ts'
import { defaultPalette } from '../../src/theme/palettes.ts'
import { APP_ICON_FILES, appIconSvg, FAVICON_SVG, renderAppIcon } from '../lib/appIcon.ts'
import { encodePng } from '../lib/png.ts'
import {
  assertCorpusPrecached,
  corpusChunkStems,
  precacheUrls,
  serviceWorkerSource,
} from '../lib/serviceWorkerSource.ts'
import { webManifestJson } from '../lib/webManifest.ts'

/**
 * Everything that makes the built site installable: the manifest, the icons, the
 * one head tag that carries a colour, and the service worker.
 *
 * It is a build plugin rather than a set of files in `public/` because three of
 * those four cannot be written by hand. The manifest names two colours, which
 * CLAUDE.md rule 1 says come from the theme registry and nowhere else. The icons
 * are drawn from design-tokens 4's star. And the worker has to name every hashed
 * chunk in the build, which nobody knows until the build has run.
 *
 * The consequence worth stating plainly: `src/` and `public/` still contain no
 * image file, no second copy of a colour and no list of filenames to keep in
 * step. All of that exists only in `dist/`, and only for as long as a build.
 */

const MANIFEST_FILE = 'manifest.webmanifest'

export interface InstallableOptions {
  /** From `package.json`, so the cache changes when the version does. */
  readonly version: string
  /** The short commit SHA, so two builds of one version are still two caches. */
  readonly commit: string
}

/** The generated files that live at the site root rather than under `assets/`. */
function rootFiles(): string[] {
  return [MANIFEST_FILE, FAVICON_SVG, ...APP_ICON_FILES.map((icon) => icon.file)]
}

function iconColours(): { ground: string; star: string } {
  const tokens = defaultPalette().tokens
  // Design-tokens 1.1: `field` is the navy the app's chrome is printed on and
  // the ground the milestone screen inverts to (decision D9.2), so it is the
  // cloth this book is bound in. `accent` is the old gold, which is the same in
  // both palettes.
  return { ground: tokens.field, star: tokens.accent }
}

/** Drawn once per distinct size: the two 512s are the same image (see APP_ICON_FILES). */
function renderIcons(): Map<string, Uint8Array> {
  const colours = iconColours()
  const bySize = new Map<number, Uint8Array>()
  const files = new Map<string, Uint8Array>()
  for (const icon of APP_ICON_FILES) {
    let png = bySize.get(icon.size)
    if (png === undefined) {
      png = encodePng(icon.size, icon.size, renderAppIcon(icon.size, colours))
      bySize.set(icon.size, png)
    }
    files.set(icon.file, png)
  }
  return files
}

function manifestJson(): string {
  return webManifestJson(defaultPalette(), {
    name: strings.appName,
    shortName: strings.appName,
  })
}

export function installable(options: InstallableOptions): Plugin {
  return {
    name: 'by-heart:installable',

    /**
     * The two head tags that cannot be written into `index.html` by hand.
     *
     * `theme-color` is the navy behind the status bar, and a colour written out
     * anywhere but the theme registry is a second copy of the palette
     * (CLAUDE.md rule 1). `apple-mobile-web-app-title` is the name that appears
     * under the icon on the home screen, which makes it a user-facing string,
     * and every one of those lives in `src/strings/` (principle 7.11).
     *
     * Everything else iOS needs is in `index.html`, where it can be read.
     */
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: { name: 'theme-color', content: defaultPalette().tokens.field },
          injectTo: 'head' as const,
        },
        {
          tag: 'meta',
          attrs: { name: 'apple-mobile-web-app-title', content: strings.appName },
          injectTo: 'head' as const,
        },
      ]
    },

    /**
     * `npm run dev` asks for the manifest and the icons because `index.html`
     * links them, and a 404 in the console during every session is noise that
     * hides real errors. Generated on demand and held in memory: the first
     * request draws four icons, which takes a moment once.
     */
    configureServer(server) {
      const icons = new Map<string, Uint8Array>()
      server.middlewares.use((request, response, next) => {
        const path = (request.url ?? '').split('?')[0]?.replace(/^\//, '') ?? ''
        if (path === MANIFEST_FILE) {
          response.setHeader('Content-Type', 'application/manifest+json')
          response.end(manifestJson())
          return
        }
        if (path === FAVICON_SVG) {
          response.setHeader('Content-Type', 'image/svg+xml')
          response.end(appIconSvg(iconColours()))
          return
        }
        if (APP_ICON_FILES.some((icon) => icon.file === path)) {
          if (icons.size === 0) for (const [file, png] of renderIcons()) icons.set(file, png)
          response.setHeader('Content-Type', 'image/png')
          response.end(Buffer.from(icons.get(path) ?? new Uint8Array(0)))
          return
        }
        next()
      })
    },

    /**
     * The bundle is complete by now, so `Object.keys(bundle)` is every hashed
     * chunk, stylesheet and font the app will ask for. The precache list is that
     * plus the files emitted here, whose names are fixed and therefore known.
     */
    generateBundle(_options, bundle) {
      for (const [file, png] of renderIcons()) {
        this.emitFile({ type: 'asset', fileName: file, source: png })
      }
      this.emitFile({ type: 'asset', fileName: FAVICON_SVG, source: appIconSvg(iconColours()) })
      this.emitFile({ type: 'asset', fileName: MANIFEST_FILE, source: manifestJson() })

      const precache = precacheUrls(Object.keys(bundle), rootFiles())
      // Fails the build rather than shipping an app that launches in aeroplane
      // mode with an empty library. See the function's docblock.
      assertCorpusPrecached(precache, corpusChunkStems(corpusManifest.files))

      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: serviceWorkerSource(`by-heart-${options.version}-${options.commit}`, precache),
      })
    },
  }
}
