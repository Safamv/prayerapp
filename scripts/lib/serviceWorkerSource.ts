/**
 * The service worker, generated during the build.
 *
 * ## What it is for, and what it is emphatically not for
 *
 * Scope 12.2 says the app "works fully offline". Until this session that was
 * half true: IndexedDB held every prayer and every review, so the *data* was
 * local, but the app itself was a set of files on a server, and a phone in
 * aeroplane mode could not fetch them to run. This closes that half.
 *
 * **It caches the app. It does not touch IndexedDB.** IndexedDB is the source of
 * truth (CLAUDE.md section 10) and is already local; a service worker that took
 * an interest in it would be a second copy of the data with its own opinions.
 * The two are kept apart deliberately and nothing here reads or writes a record.
 *
 * ## Why it is written rather than installed
 *
 * The obvious alternative is Workbox, by way of `vite-plugin-pwa`. What this
 * needs from it is a list of filenames, `cache.addAll`, and a fetch handler that
 * prefers the cache: about forty lines. Workbox is a large dependency tree whose
 * defaults - `skipWaiting`, runtime caching strategies, navigation preload - are
 * mostly things this app wants turned off, and CLAUDE.md rule 6 asks for a
 * decision before any dependency. Decision D10.4, and it follows D7.5.
 *
 * ## Why the list is generated
 *
 * Vite hashes every chunk, and the corpus is four dynamic imports, so the four
 * files that matter most offline are called things like `prayers-C8QwaqbG.js`
 * and are renamed by any change to the dataset. A hand written list would be
 * wrong the first time the corpus was re-fetched, and wrong silently: the app
 * would still start offline and simply have no prayers in it.
 */

/** The document every navigation is answered with. The app is one page. */
export const SHELL_URL = '/index.html'

/** Vite writes hashed output here. Everything in it is immutable. */
const ASSET_PREFIX = 'assets/'

/**
 * The URLs the worker precaches: the shell, every hashed asset, and the handful
 * of root files an install needs.
 *
 * Nothing is filtered by size. That is the point: the corpus chunks are four
 * megabytes of the four and a half, and an app that precached only the shell
 * would launch in aeroplane mode and show an empty library, which is a worse
 * failure than not launching because it looks like data loss.
 */
export function precacheUrls(
  emitted: readonly string[],
  rootFiles: readonly string[],
): readonly string[] {
  const assets = emitted
    .filter((name) => name.startsWith(ASSET_PREFIX) && !name.endsWith('.map'))
    .sort()
  return [SHELL_URL, ...assets.map((name) => `/${name}`), ...rootFiles.map((name) => `/${name}`)]
}

/**
 * The base names of the committed corpus files, taken from the corpus manifest
 * rather than written down again. `prayers.json` becomes `prayers`, which is the
 * stem Vite gives the chunk it bundles that import into.
 */
export function corpusChunkStems(corpusManifestFiles: Readonly<Record<string, unknown>>): string[] {
  return Object.keys(corpusManifestFiles)
    .map((file) => file.replace(/\.json$/, ''))
    .sort()
}

/**
 * Fails the build if the corpus did not make it into the precache list.
 *
 * This is the guard that matters, and it is here rather than in a test because
 * the thing that could break it is a change to how Vite chunks the build -
 * `manualChunks`, an `external`, a move of the corpus out of `src/data/` - none
 * of which a unit test would see. The failure it prevents is the quiet one: an
 * app that installs, launches offline, and has no library in it.
 */
export function assertCorpusPrecached(precache: readonly string[], stems: readonly string[]): void {
  // Compare stems exactly rather than matching a prefix. `prayers` is a prefix
  // of `prayers-and-meditations`, so a prefix test finds the latter and reports
  // the former as present: a build could ship without the 472 prayers and this
  // guard would have said nothing. Vite's hash is the last dash-separated part.
  const shipped = new Set(
    precache
      .filter((url) => url.startsWith('/assets/') && url.endsWith('.js'))
      .map((url) => url.slice('/assets/'.length).replace(/-[^-]+\.js$/, '')),
  )
  const missing = stems.filter((stem) => !shipped.has(stem))
  if (missing.length > 0) {
    throw new Error(
      `The service worker would ship without ${missing.join(', ')}, so the app would launch ` +
        'offline with an empty library. Check how the build is chunking src/data/corpus-data/.',
    )
  }
}

/**
 * The worker's body. No interpolation in here: the two values that vary are
 * declared above it by `serviceWorkerSource`, so this stays a plain string and
 * nothing has to be escaped.
 *
 * ## The update path, which is the part worth reading
 *
 * There is no `skipWaiting` and there is no prompt. A new build is fetched in
 * the background, precaches itself, and then waits. It takes over the next time
 * the app is started from cold, because that is the moment the last page the old
 * worker controlled goes away. Nothing interrupts a session and nothing asks the
 * user to reload, which principle 7.1 would not forgive on a screen someone
 * opened to pray.
 *
 * `skipWaiting` is the tempting alternative and it is wrong here. It would hand
 * control to the new worker mid-session, which then deletes the old cache - and
 * the page still running was loaded from it and still lazily imports the corpus
 * out of it. The user would be reading a prayer and the library would empty.
 *
 * The cost is that a build is one cold start behind, and the way to tell which
 * build is in your hand is the version line at the foot of Settings.
 */
const BODY = `
const SHELL = ${JSON.stringify(SHELL_URL)}

// ignoreVary, and it is not optional. Hosts send 'Vary: Origin' on static files,
// and Vite loads its module scripts and stylesheet with a crossorigin attribute,
// so the browser puts an Origin header on those requests. The requests made
// while precaching carry no such header, because a service worker cannot set
// one. Without this, every one of those cached files fails to match its own
// request, the worker falls through to the network, and the app is blank in
// aeroplane mode while its cache sits there full and unread.
//
// Ignoring Vary is safe here because the precache holds exactly one response per
// URL and every URL under /assets/ has a content hash in its name.
const MATCH = { ignoreVary: true }

// Precache the whole app on install. 'reload' bypasses the browser's own HTTP
// cache, so an install never stores a stale copy of a file it is about to
// promise works offline.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' })))),
  )
})

// Deliberately no skipWaiting above. See the generator's docblock.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  let url
  try {
    url = new URL(request.url)
  } catch {
    return
  }
  // The app makes no network calls of its own (CLAUDE.md rule 11), so anything
  // off this origin is not ours to answer.
  if (url.origin !== self.location.origin) return

  // Every route is the same document. An installed app relaunches at whatever
  // screen it was last on, so this is what stops /memorise being a 404 offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      caches
        .open(CACHE)
        .then((cache) => cache.match(SHELL, MATCH))
        .then((cached) => cached || fetch(request)),
    )
    return
  }

  // Cache first, and no runtime caching of anything else: the precache is the
  // whole app, so a miss here means a request the app was not supposed to make.
  event.respondWith(
    caches
      .open(CACHE)
      .then((cache) => cache.match(request, MATCH))
      .then((cached) => cached || fetch(request)),
  )
})
`

/**
 * @param cacheName changes with every build, which is what makes an update a new
 *   cache rather than an edit to a live one.
 */
export function serviceWorkerSource(cacheName: string, precache: readonly string[]): string {
  const header = [
    '// Generated by scripts/vite/installable.ts during the build. Do not edit.',
    '// Why it looks like this: scripts/lib/serviceWorkerSource.ts.',
    `const CACHE = ${JSON.stringify(cacheName)}`,
    `const PRECACHE = ${JSON.stringify(precache, null, 2)}`,
  ].join('\n')
  return `${header}\n${BODY}`
}
