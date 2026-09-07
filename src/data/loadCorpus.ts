import manifest from './corpus-data/manifest.json'
import {
  countAllPassages,
  putPassages,
  putPassageTags,
  putTags,
  removePassagesNotIn,
} from './corpus'
import type { PassageRow } from './types'

/**
 * The first-run load of the committed corpus into IndexedDB (scope 4.2).
 *
 * The four feed files, `tags.json` and `passage-tags.json` were written by
 * `scripts/fetch-corpus.ts` and committed to the repository (decision D0.7),
 * so this never makes a network call (CLAUDE.md rule 11): it dynamically
 * imports the JSON, which Vite bundles as a separate chunk rather than
 * folding it into the app's main chunk, so fetching it does not hold up the
 * first paint.
 *
 * Guarded on the manifest's own hashes, so opening the app a second time is a
 * single cheap comparison rather than a re-import and a re-write: that is what
 * keeps loading idempotent (`loadCorpus.test.ts`).
 *
 * ## Why the guard is the manifest and not simply "is the table empty"
 *
 * It was the emptier test until session 5, and it made a corpus correction
 * unreachable: a device that had already loaded the library kept whatever it
 * loaded, for ever. Dropping a record from the dataset (decision D5.7) then did
 * nothing to the two devices that mattered. The manifest's per-file hashes
 * change exactly when the committed dataset changes, so a corrected corpus is
 * re-loaded once and never again, and a re-fetch that produced identical files
 * is not a change at all.
 *
 * The fingerprint lives in localStorage beside the anonymous user id, for the
 * reason given in `userId.ts`: it is about this device rather than about the
 * data, and scope section 10 has no table for it.
 */
const CORPUS_FINGERPRINT_KEY = 'by-heart.corpus-fingerprint'

/**
 * The committed dataset's identity: every file's hash, in a stable order.
 *
 * The manifest is imported statically, unlike the six data files: it is four
 * kilobytes, and the decision about whether to load anything has to be made
 * before any of them is fetched.
 */
const CORPUS_FINGERPRINT: string = Object.keys(manifest.files)
  .sort()
  .map(
    (name) =>
      `${name}:${(manifest.files as Record<string, { sha256: string }>)[name]?.sha256 ?? ''}`,
  )
  .join('|')

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export async function loadCorpusIfNeeded(): Promise<void> {
  const store = storage()

  // A device with storage turned off falls back to the old guard: it reloads
  // nothing it already has, which is what it did before this existed.
  if (
    store?.getItem(CORPUS_FINGERPRINT_KEY) === CORPUS_FINGERPRINT &&
    (await countAllPassages()) > 0
  ) {
    return
  }
  if (store === null && (await countAllPassages()) > 0) return

  const [prayers, hiddenWords, gleanings, prayersAndMeditations, tags, passageTags] =
    await Promise.all([
      import('./corpus-data/prayers.json'),
      import('./corpus-data/hidden-words.json'),
      import('./corpus-data/gleanings.json'),
      import('./corpus-data/prayers-and-meditations.json'),
      import('./corpus-data/tags.json'),
      import('./corpus-data/passage-tags.json'),
    ])

  const committed: PassageRow[] = [
    ...(prayers.default as PassageRow[]),
    ...(hiddenWords.default as PassageRow[]),
    ...(gleanings.default as PassageRow[]),
    ...(prayersAndMeditations.default as PassageRow[]),
  ]

  await putTags(tags.default)
  await putPassages(committed)
  await putPassageTags(passageTags.default)

  // Whatever a previous version of the dataset had and this one does not.
  const withdrawn = await removePassagesNotIn(committed)
  if (withdrawn.length > 0) {
    console.info(`The corpus withdrew ${String(withdrawn.length)} passage(s); removed locally.`)
  }

  rememberCorpusLoaded()
}

/**
 * Records that this device holds the committed dataset.
 *
 * Also the way a test says "this device already has the library", so that a
 * test which seeds four passages of its own is not overrun by the real 975. It
 * used to get that for free, because the load skipped whenever the table had
 * anything in it at all; now that a corrected corpus has to be able to arrive,
 * a test that wants the old behaviour has to say so.
 */
export function rememberCorpusLoaded(): void {
  try {
    storage()?.setItem(CORPUS_FINGERPRINT_KEY, CORPUS_FINGERPRINT)
  } catch {
    // Quota or a blocked write. The load simply runs again next time.
  }
}

/**
 * The same load, shared. Every caller waits on one promise.
 *
 * `main.tsx` starts the load beside the first render, and Discover needs to
 * read the library the moment it draws. Without sharing, both would call
 * `loadCorpusIfNeeded` on a first run, both would find an empty table, and both
 * would import and write the corpus - and worse, the first screen would settle
 * on an empty list because it read before the write finished. Waiting on one
 * promise means the library appears as soon as it exists, and on every run after
 * the first it costs a single count.
 */
let sharedLoad: Promise<void> | null = null

export function corpusReady(): Promise<void> {
  sharedLoad ??= loadCorpusIfNeeded()
  return sharedLoad
}

/**
 * Forgets the shared promise, so a test that has just reset the database loads
 * into the new one rather than resolving against the old. Tests only, in the
 * same spirit as `forgetAnonymousUserId`.
 */
export function forgetCorpusLoad(): void {
  sharedLoad = null
}
