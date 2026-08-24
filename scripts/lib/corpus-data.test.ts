import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { isPassageRow, isPassageTagRow, isTagRow } from './validateRow'

/**
 * The committed dataset itself, not the code that produced it: this reads the
 * real files under `src/data/corpus-data/` that `npm run fetch:corpus` wrote
 * and committed (scope 4.2, decision D0.7), and checks that every promise the
 * schema makes about a `PassageRow` actually holds for every row on disk. If
 * this test is failing, the fix is to change `scripts/fetch-corpus.ts` and
 * re-run it (CLAUDE.md rule 12) — never hand-edit the JSON.
 */

const DATA_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'src',
  'data',
  'corpus-data',
)

function readJson(fileName: string): unknown {
  return JSON.parse(readFileSync(join(DATA_DIR, fileName), 'utf8')) as unknown
}

const FEED_FILES: readonly { file: string; feed: string }[] = [
  { file: 'prayers.json', feed: 'prayers' },
  { file: 'hidden-words.json', feed: 'hidden-words' },
  { file: 'gleanings.json', feed: 'gleanings' },
  { file: 'prayers-and-meditations.json', feed: 'prayers-and-meditations' },
]

describe('the committed corpus dataset', () => {
  it('records a manifest entry per file whose hash and count match the file on disk', () => {
    const manifest = readJson('manifest.json') as {
      files: Record<string, { records: number; sha256: string }>
    }
    for (const { file } of [...FEED_FILES, { file: 'tags.json' }, { file: 'passage-tags.json' }]) {
      const raw = readFileSync(join(DATA_DIR, file), 'utf8')
      const entry = manifest.files[file]
      expect(entry, `manifest is missing an entry for ${file}`).toBeDefined()
      expect(entry?.sha256).toBe(createHash('sha256').update(raw).digest('hex'))
      expect(entry?.records).toBe((JSON.parse(raw) as unknown[]).length)
    }
  })

  for (const { file, feed } of FEED_FILES) {
    it(`every row in ${file} satisfies PassageRow and carries source_feed "${feed}"`, () => {
      const rows = readJson(file) as unknown[]
      expect(rows.length).toBeGreaterThan(0)
      for (const row of rows) {
        expect(isPassageRow(row), JSON.stringify(row)).toBe(true)
        expect((row as { source_feed: string }).source_feed).toBe(feed)
      }
    })
  }

  it('every row in tags.json satisfies TagRow', () => {
    const tags = readJson('tags.json') as unknown[]
    expect(tags.length).toBeGreaterThan(0)
    for (const tag of tags) expect(isTagRow(tag), JSON.stringify(tag)).toBe(true)
  })

  it('every link in passage-tags.json satisfies PassageTagRow and points at a real passage and tag', () => {
    const passages = FEED_FILES.flatMap(({ file }) => readJson(file) as { id: string }[])
    const passageIds = new Set(passages.map((passage) => passage.id))
    const tagIds = new Set((readJson('tags.json') as { id: string }[]).map((tag) => tag.id))
    const links = readJson('passage-tags.json') as { passage_id: string; tag_id: string }[]

    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      expect(isPassageTagRow(link)).toBe(true)
      expect(passageIds.has(link.passage_id), `no passage for ${link.passage_id}`).toBe(true)
      expect(tagIds.has(link.tag_id), `no tag for ${link.tag_id}`).toBe(true)
    }
  })

  it('never repeats a passage id, across feeds or within one', () => {
    const ids = FEED_FILES.flatMap(({ file }) =>
      (readJson(file) as { id: string }[]).map((row) => row.id),
    )
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('never repeats a (source_feed, source_id) pair, the key that makes re-ingestion idempotent', () => {
    const pairs = FEED_FILES.flatMap(({ file }) =>
      (readJson(file) as { source_feed: string; source_id: string }[]).map(
        (row) => `${row.source_feed}:${row.source_id}`,
      ),
    )
    expect(new Set(pairs).size).toBe(pairs.length)
  })

  it('excludes every work named as permanently out of scope (scope 4.1)', () => {
    const excluded = [
      'Kitáb-i-Aqdas',
      'Kitáb-i-Íqán',
      'Tablets Revealed after the Aqdas',
      'Some Answered Questions',
      'Days of Remembrance',
      'Ridván messages',
    ]
    const sourceWorks = new Set(
      FEED_FILES.flatMap(({ file }) =>
        (readJson(file) as { source_work: string | null }[])
          .map((row) => row.source_work)
          .filter((work): work is string => work !== null),
      ),
    )
    for (const work of excluded) expect(sourceWorks.has(work)).toBe(false)
  })
})
