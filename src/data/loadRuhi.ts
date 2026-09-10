import manifest from './corpus-data/ruhi-manifest.json'
import { putPassages, removePassagesNotIn } from './corpus'
import { corpusReady } from './loadCorpus'
import { putRuhiBooks, putRuhiQuotations, putRuhiSections, putRuhiUnits } from './ruhi'
import type {
  PassageRow,
  RuhiBookRow,
  RuhiQuotationRow,
  RuhiSectionRow,
  RuhiUnitRow,
} from './types'

/**
 * **Loading the Ruhi mapping into IndexedDB.** Scope 4.2, 5.2; decision D1.10.
 *
 * The same shape as `loadCorpus.ts`, and for the same reasons: the dataset is
 * committed to the repository, imported dynamically so it is its own chunk, and
 * guarded on a fingerprint so opening the app a second time costs one string
 * comparison. `scripts/build-ruhi.ts` writes both files and nothing here ever
 * touches the network (CLAUDE.md rule 11).
 *
 * ## Why it is a separate load, and lazy
 *
 * The library is loaded beside the first render, because Devotions is what the
 * app opens on. The Ruhi mapping is not: it is 290 passages and 344 quotations
 * that a reader who never opens a study circle screen never needs, and holding
 * up the first paint for it would make every morning slower for everybody.
 *
 * So this runs the first time somebody opens the Ruhi route, and never again.
 * The service worker precaches the chunk all the same, so the first time can be
 * offline.
 *
 * ## It waits for the library, and it has to
 *
 * 32 of the 344 quotations are word for word a passage the devotional corpus
 * already carries, so they point at a `prayers` or `hidden-words` row rather
 * than at one of their own (decision D12.1). Those rows are written by
 * `loadCorpus.ts`, not by this file.
 *
 * A reader who reached the Ruhi route before the library had finished loading
 * would therefore have found 32 quotations missing from their sections, silently
 * - `listRuhiQuotations` drops a quotation whose passage is not there rather than
 * drawing a blank row. In practice the library starts loading beside the first
 * render and would nearly always have won that race, which is what makes it the
 * kind of bug that appears once, on a cold morning, and cannot be reproduced.
 *
 * So the mapping waits on the same shared promise Devotions waits on. On every
 * run after the first that costs one count.
 *
 * ## Its own manifest
 *
 * Scope 5.2: the mapping "is versioned independently of the app". It has its own
 * manifest carrying the dataset version and the Ruhi edition of each book, and
 * its own fingerprint key, so a corrected mapping reaches a device that already
 * has one, and re-fetching the prayers does not make the app reload the Ruhi
 * material or the other way round.
 */
const RUHI_FINGERPRINT_KEY = 'by-heart.ruhi-fingerprint'

const RUHI_FINGERPRINT: string = Object.keys(manifest.files)
  .sort()
  .map(
    (name) =>
      `${manifest.datasetVersion}:${name}:` +
      `${(manifest.files as Record<string, { sha256: string }>)[name]?.sha256 ?? ''}`,
  )
  .join('|')

/** Scope 5.2, and the credits screen of scope 4.3 at v1.0: what this was built against. */
export const RUHI_EDITIONS: Readonly<Record<string, string>> = manifest.editions

interface RuhiFile {
  readonly books: RuhiBookRow[]
  readonly units: RuhiUnitRow[]
  readonly sections: RuhiSectionRow[]
  readonly quotations: RuhiQuotationRow[]
  readonly passages: PassageRow[]
}

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export async function loadRuhiIfNeeded(): Promise<void> {
  // The quotations that link into the library need the library to be there.
  await corpusReady()

  const store = storage()
  if (store?.getItem(RUHI_FINGERPRINT_KEY) === RUHI_FINGERPRINT) return

  const loaded = (await import('./corpus-data/ruhi.json')) as unknown as { default: RuhiFile }
  const data = loaded.default

  // The passages first: a quotation row pointing at a passage that is not there
  // yet would be a section that draws short for as long as the write took.
  await putPassages(data.passages)
  await putRuhiBooks(data.books)
  await putRuhiUnits(data.units)
  await putRuhiSections(data.sections)
  await putRuhiQuotations(data.quotations)

  // Whatever a previous version of the mapping had and this one does not. The
  // guards inside it mean this can only ever reach the `ruhi` feed, because that
  // is the only feed the set it is handed contains (decision D5.9).
  const withdrawn = await removePassagesNotIn(data.passages)
  if (withdrawn.length > 0) {
    console.info(`The Ruhi mapping withdrew ${String(withdrawn.length)} passage(s); removed.`)
  }

  rememberRuhiLoaded()
}

/**
 * Records that this device holds the mapping.
 *
 * Also the way a test says "this device already has it", so that a test which
 * seeds five quotations of its own is not overrun by the real 344. The same
 * bargain `rememberCorpusLoaded` makes for the library.
 */
export function rememberRuhiLoaded(): void {
  try {
    storage()?.setItem(RUHI_FINGERPRINT_KEY, RUHI_FINGERPRINT)
  } catch {
    // Quota or a blocked write. The load simply runs again next time.
  }
}

/**
 * The same load, shared, so four Ruhi screens opened in quick succession do not
 * each import the dataset and write it. The same bargain `corpusReady` makes.
 */
let sharedLoad: Promise<void> | null = null

export function ruhiReady(): Promise<void> {
  sharedLoad ??= loadRuhiIfNeeded()
  return sharedLoad
}

/** Forgets the shared promise, so a test that has reset the database loads again. */
export function forgetRuhiLoad(): void {
  sharedLoad = null
}
