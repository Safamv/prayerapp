import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildRuhiDataset, type CorpusPassage } from './lib/ruhiDataset.ts'
import { parseRuhiSource } from './lib/ruhiSource.ts'
import type { PassageRow } from '../src/data/types.ts'

/**
 * **The Ruhi mapping, built into the committed dataset.** Scope 5.1, 5.2, 4.2.
 *
 * Run it with:
 *
 *     node scripts/build-ruhi.ts
 *
 * **Never hand-edit `src/data/corpus-data/ruhi.json`** (CLAUDE.md rule 12).
 * Change the curation file or this script, and run it again.
 *
 * ## Why the three markdown files are in the repository
 *
 * They were curated outside it, in `/Ruhi Books/Extracted Quotes`. Scope 4.2's
 * whole argument for committing the corpus is that "anyone with the repository
 * can rebuild the database from scratch", and a build whose input sits in
 * somebody's iCloud folder cannot be rebuilt by anyone at all. So the three
 * files are copied into `scripts/ruhi-source/` and are the input. They are the
 * proprietary asset scope 5.1 describes, which is a further reason to keep them
 * somewhere that is backed up, versioned and diffable.
 *
 * ## Why there is a second manifest
 *
 * Scope 5.2 requires the mapping to be "versioned independently of the app" and
 * to carry the Ruhi edition it was built against. `ruhi-manifest.json` holds
 * both, plus a hash of the dataset, and `src/data/loadRuhi.ts` guards its load on
 * that hash the way `loadCorpus.ts` guards on the corpus manifest.
 *
 * It is a separate file rather than more keys in `manifest.json` because
 * `fetch-corpus.ts` rewrites that one from scratch on every run, and a Ruhi
 * entry inside it would disappear the next time the prayers were re-fetched.
 */

/**
 * **The dataset's own version.** Scope 5.2.
 *
 * Bumped when the mapping changes, independently of the app's version in
 * `package.json`. A Ruhi book gaining a revised edition, a corrected citation or
 * a new book is a change to this number and to nothing else.
 */
const DATASET_VERSION = '1.0.0'

const HERE = dirname(fileURLToPath(import.meta.url))
const SOURCE_DIR = join(HERE, 'ruhi-source')
const OUTPUT_DIR = join(HERE, '..', 'src', 'data', 'corpus-data')

/** The four devotional feeds, which a quotation may turn out to be the whole of. */
const CORPUS_FILES = [
  'prayers.json',
  'hidden-words.json',
  'gleanings.json',
  'prayers-and-meditations.json',
]

function readCorpus(): CorpusPassage[] {
  return CORPUS_FILES.flatMap(
    (name) => JSON.parse(readFileSync(join(OUTPUT_DIR, name), 'utf8')) as PassageRow[],
  )
}

/** Stable, readable JSON: two-space indent and a trailing newline, as the corpus writes it. */
function toJsonFile(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

async function main(): Promise<void> {
  const files = readdirSync(SOURCE_DIR)
    .filter((name) => name.endsWith('.md'))
    .sort()
  if (files.length === 0) {
    throw new Error(`No curation files in ${SOURCE_DIR}. The mapping cannot be built without them.`)
  }

  const books = files.map((name) => parseRuhiSource(readFileSync(join(SOURCE_DIR, name), 'utf8')))
  const dataset = buildRuhiDataset(books, readCorpus())

  const content = toJsonFile({
    books: dataset.books,
    units: dataset.units,
    sections: dataset.sections,
    quotations: dataset.quotations,
    passages: dataset.passages,
  })
  await writeFile(join(OUTPUT_DIR, 'ruhi.json'), content, 'utf8')

  const manifest = {
    builtAt: new Date().toISOString(),
    datasetVersion: DATASET_VERSION,
    // Scope 5.2: the edition each book was mapped against, so that a revised
    // Ruhi book is a visible mismatch rather than a silent one.
    editions: Object.fromEntries(
      dataset.books.map((book) => [`Book ${String(book.number)}`, book.edition]),
    ),
    sourceFiles: files,
    counts: dataset.counts,
    // The same `files` shape the corpus manifest uses, so that `loadRuhi.ts`
    // can fingerprint it the way `loadCorpus.ts` fingerprints the corpus and
    // `corpusChunkStems` can name its chunk for the service worker's precache.
    files: {
      'ruhi.json': {
        records: dataset.quotations.length,
        sha256: createHash('sha256').update(content).digest('hex'),
      },
    },
  }
  await writeFile(join(OUTPUT_DIR, 'ruhi-manifest.json'), toJsonFile(manifest), 'utf8')

  const { counts } = dataset
  console.log(
    `Wrote ${String(counts.entries)} Ruhi quotations from ${String(books.length)} books: ` +
      `${String(counts.distinctTexts)} distinct texts, of which ${String(counts.linkedTexts)} ` +
      `are the whole of a passage already in the corpus and link to it ` +
      `(${String(counts.linkedQuotations)} quotations) and ${String(counts.ownPassages)} become ` +
      `Ruhi passages. ${String(counts.memorise)} to memorise, ${String(counts.reflection)} for ` +
      `reflection.`,
  )
}

await main()
