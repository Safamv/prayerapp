import { countAllPassages, putPassages, putPassageTags, putTags } from './corpus'
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
 * Guarded on `countAllPassages`, so opening the app a second time is a single
 * cheap count rather than a re-import and a re-write: that is what keeps
 * loading idempotent (`loadCorpus.test.ts`).
 */
export async function loadCorpusIfNeeded(): Promise<void> {
  if ((await countAllPassages()) > 0) return

  const [prayers, hiddenWords, gleanings, prayersAndMeditations, tags, passageTags] =
    await Promise.all([
      import('./corpus-data/prayers.json'),
      import('./corpus-data/hidden-words.json'),
      import('./corpus-data/gleanings.json'),
      import('./corpus-data/prayers-and-meditations.json'),
      import('./corpus-data/tags.json'),
      import('./corpus-data/passage-tags.json'),
    ])

  await putTags(tags.default)
  await putPassages([
    ...(prayers.default as PassageRow[]),
    ...(hiddenWords.default as PassageRow[]),
    ...(gleanings.default as PassageRow[]),
    ...(prayersAndMeditations.default as PassageRow[]),
  ])
  await putPassageTags(passageTags.default)
}
