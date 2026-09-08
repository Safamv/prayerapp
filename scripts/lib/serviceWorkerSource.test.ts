import { Script } from 'node:vm'
import { describe, expect, it } from 'vitest'
import corpusManifest from '../../src/data/corpus-data/manifest.json' with { type: 'json' }
import {
  assertCorpusPrecached,
  corpusChunkStems,
  precacheUrls,
  serviceWorkerSource,
  SHELL_URL,
} from './serviceWorkerSource.ts'

/**
 * A build listing shaped like a real one: the shell's chunk, the stylesheet, the
 * two fonts, and the six corpus chunks with the hashes Vite gives them.
 */
const EMITTED = [
  'assets/index-eSeA1g8q.js',
  'assets/index-Czu6t7_i.css',
  'assets/Italiana-Regular-H0uc3fB7.woff2',
  'assets/Cormorant-VariableFont_wght-UJOqu2kU.woff2',
  'assets/prayers-C8QwaqbG.js',
  'assets/hidden-words-BGGrnEIj.js',
  'assets/gleanings-D3XpYZVI.js',
  'assets/prayers-and-meditations-58gjiaWm.js',
  'assets/tags-Cbn_Srhb.js',
  'assets/passage-tags-4B3XYhpF.js',
  'assets/index-eSeA1g8q.js.map',
]

const ROOT_FILES = ['manifest.webmanifest', 'favicon.svg', 'icon-192.png']

describe('the precache list', () => {
  const precache = precacheUrls(EMITTED, ROOT_FILES)

  it('leads with the shell, which every navigation is answered with', () => {
    expect(precache[0]).toBe(SHELL_URL)
  })

  /**
   * The assertion this whole file exists for. Four megabytes of the four and a
   * half are the corpus, and an app that precached only the shell would launch
   * in aeroplane mode with an empty library.
   */
  it('contains the corpus chunks, not only the shell', () => {
    expect(precache).toContain('/assets/prayers-C8QwaqbG.js')
    expect(precache).toContain('/assets/hidden-words-BGGrnEIj.js')
    expect(precache).toContain('/assets/gleanings-D3XpYZVI.js')
    expect(precache).toContain('/assets/prayers-and-meditations-58gjiaWm.js')
  })

  it('carries the manifest and the icons, which an install reads', () => {
    for (const file of ROOT_FILES) expect(precache).toContain(`/${file}`)
  })

  it('leaves source maps out', () => {
    expect(precache.some((url) => url.endsWith('.map'))).toBe(false)
  })
})

describe('the corpus guard', () => {
  const stems = corpusChunkStems(corpusManifest.files)

  it('takes the file names from the corpus manifest rather than repeating them', () => {
    expect(stems).toEqual([
      'gleanings',
      'hidden-words',
      'passage-tags',
      'prayers',
      'prayers-and-meditations',
      'tags',
    ])
  })

  it('passes a build that chunked the corpus the way it does today', () => {
    expect(() => {
      assertCorpusPrecached(precacheUrls(EMITTED, ROOT_FILES), stems)
    }).not.toThrow()
  })

  it('fails the build, naming the file, if a chunk stops being emitted', () => {
    const without = EMITTED.filter((name) => !name.startsWith('assets/prayers-C'))
    expect(() => {
      assertCorpusPrecached(precacheUrls(without, ROOT_FILES), stems)
    }).toThrow(/prayers.*empty library/s)
  })

  it('is not fooled by a chunk that merely contains the name', () => {
    const renamed = ['assets/vendor-prayers-AAAA1111.js']
    expect(() => {
      assertCorpusPrecached(precacheUrls(renamed, []), ['prayers'])
    }).toThrow(/prayers/)
  })
})

describe('the generated worker', () => {
  const precache = precacheUrls(EMITTED, ROOT_FILES)
  const source = serviceWorkerSource('by-heart-0.10.0-abc1234', precache)

  /**
   * The worker is assembled from a string, so nothing else would catch a typo in
   * it: it is not type checked, not linted, and not imported by anything. This
   * compiles it with the real engine, which throws on a syntax error without
   * running a line of it.
   */
  it('is syntactically valid JavaScript', () => {
    expect(() => new Script(source)).not.toThrow()
  })

  it('names the cache after this build, so an update is a new cache not an edit', () => {
    expect(source).toContain('by-heart-0.10.0-abc1234')
  })

  it('embeds the whole precache list', () => {
    for (const url of precache) expect(source).toContain(url)
  })

  /**
   * Principle 7.1, as a test. `skipWaiting` would hand control to a new build
   * mid-session and delete the cache the running page is still reading prayers
   * out of. The update lands on the next cold start instead.
   */
  it('never takes over a running session', () => {
    expect(source).not.toMatch(/skipWaiting\s*\(/)
  })

  it('answers every route with the shell, so a saved route is not a 404', () => {
    expect(source).toContain("request.mode === 'navigate'")
    expect(source).toContain('cache.match(SHELL, MATCH)')
  })

  /**
   * Found by pulling the server down and reloading, not by reading the code.
   *
   * Hosts send `Vary: Origin` on static files, and Vite loads its module script
   * and stylesheet with `crossorigin`, so the browser attaches an Origin header
   * that the precaching request could not have. Vary matching then fails, the
   * worker falls through to a network that is not there, and the app is blank
   * with a full cache sitting behind it. Every lookup ignores Vary, and this is
   * the test that says so out loud.
   */
  it('ignores Vary on every lookup, or the cache is full and unreadable', () => {
    expect(source).toContain('ignoreVary: true')
    const lookups = source.match(/cache\.match\([^)]*\)/g) ?? []
    expect(lookups.length).toBeGreaterThan(0)
    expect(lookups.every((call) => call.includes('MATCH'))).toBe(true)
  })

  it('leaves IndexedDB entirely alone', () => {
    expect(source).not.toMatch(/indexedDB|Dexie|by-heart-db/i)
  })
})
