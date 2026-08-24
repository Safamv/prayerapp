import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  normaliseGleaning,
  normaliseHiddenWord,
  normalisePrayer,
  normalisePrayerAndMeditation,
  normaliseTag,
  passageTagLinksForPrayer,
  SPECIAL_TABLETS_TAG,
} from './lib/normalise.ts'
import type {
  RawGleaning,
  RawHiddenWord,
  RawLanguage,
  RawPrayerAndMeditation,
  RawPrayerFeed,
  RawTag,
} from './lib/rawFeedTypes.ts'
import type { PassageRow, PassageTagRow, TagRow } from '../src/data/types.ts'

/**
 * The corpus fetch script (scope 4.1, 4.2; decision D0.7). Run by hand, not
 * scheduled — a scheduled ingestion job is `[v1.0]`. Calls the live
 * bahaiprayers.net API, which CLAUDE.md rule 11 permits only from `scripts/`,
 * normalises every record through `scripts/lib/normalise.ts`, and commits the
 * result as one JSON file per feed plus a manifest. Nothing here talks to
 * IndexedDB: that happens at first run, in `src/data/loadCorpus.ts`.
 *
 * Run it with:
 *
 *     node scripts/fetch-corpus.ts
 */

const API_ROOT = 'https://bahaiprayers.net/api/prayer'
const OUTPUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'corpus-data')

async function fetchJson<T>(path: string): Promise<T> {
  const url = `${API_ROOT}/${path}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`${url} responded ${String(response.status)} ${response.statusText}`)
  }
  return (await response.json()) as T
}

/** Scope 4.1: the language list is fetched first, and everything else needs its id for English. */
async function englishLanguageId(): Promise<number> {
  const languages = await fetchJson<RawLanguage[]>('Languages')
  const english = languages.find(
    (language) => language.Culture === 'en' && language.Name === 'English',
  )
  if (english === undefined) {
    throw new Error('The Languages endpoint no longer lists an English entry with Culture "en".')
  }
  return english.Id
}

function byId<T extends { Id: number }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => a.Id - b.Id)
}

/** Stable, readable JSON: sorted rows, two-space indent, trailing newline. */
function toJsonFile(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

async function writeCorpusFile(fileName: string, content: string): Promise<string> {
  await writeFile(join(OUTPUT_DIR, fileName), content, 'utf8')
  return createHash('sha256').update(content).digest('hex')
}

async function main(): Promise<void> {
  await mkdir(OUTPUT_DIR, { recursive: true })

  const languageId = await englishLanguageId()

  const [rawTags, prayerFeed, rawHiddenWords, rawGleanings, rawPms] = await Promise.all([
    fetchJson<RawTag[]>(`tags?languageid=${String(languageId)}`),
    fetchJson<RawPrayerFeed>(`prayersystembylanguage?languageid=${String(languageId)}&html=false`),
    fetchJson<RawHiddenWord[]>(`HiddensByLanguage?languageid=${String(languageId)}`),
    fetchJson<RawGleaning[]>(`GleaningsByLanguage?languageid=${String(languageId)}`),
    fetchJson<RawPrayerAndMeditation[]>(`PMsByLanguage?languageid=${String(languageId)}`),
  ])

  if (prayerFeed.IsInError) {
    throw new Error(`The prayers feed reported an error: ${prayerFeed.ErrorMessage}`)
  }

  const sortedPrayers = byId(prayerFeed.Prayers)
  const prayers: PassageRow[] = sortedPrayers.map(normalisePrayer)
  const hiddenWords: PassageRow[] = byId(rawHiddenWords).map(normaliseHiddenWord)
  const gleanings: PassageRow[] = byId(rawGleanings).map(normaliseGleaning)
  const prayersAndMeditations: PassageRow[] = byId(rawPms).map(normalisePrayerAndMeditation)
  const tags: TagRow[] = [...byId(rawTags).map(normaliseTag), SPECIAL_TABLETS_TAG]
  const passageTags: PassageTagRow[] = sortedPrayers.flatMap(passageTagLinksForPrayer)

  const files: readonly { name: string; records: readonly unknown[] }[] = [
    { name: 'prayers.json', records: prayers },
    { name: 'hidden-words.json', records: hiddenWords },
    { name: 'gleanings.json', records: gleanings },
    { name: 'prayers-and-meditations.json', records: prayersAndMeditations },
    { name: 'tags.json', records: tags },
    { name: 'passage-tags.json', records: passageTags },
  ]

  const manifestFeeds: Record<string, { records: number; sha256: string }> = {}
  for (const file of files) {
    const content = toJsonFile(file.records)
    const sha256 = await writeCorpusFile(file.name, content)
    manifestFeeds[file.name] = { records: file.records.length, sha256 }
  }

  const manifest = {
    fetchedAt: new Date().toISOString(),
    source: 'https://bahaiprayers.net',
    languageId,
    files: manifestFeeds,
  }
  await writeFile(join(OUTPUT_DIR, 'manifest.json'), toJsonFile(manifest), 'utf8')

  const totalPassages =
    prayers.length + hiddenWords.length + gleanings.length + prayersAndMeditations.length
  console.log(
    `Wrote ${String(totalPassages)} passages (${String(prayers.length)} prayers, ` +
      `${String(hiddenWords.length)} Hidden Words, ${String(gleanings.length)} Gleanings, ` +
      `${String(prayersAndMeditations.length)} Prayers and Meditations), ${String(tags.length)} tags ` +
      `and ${String(passageTags.length)} tag links to ${OUTPUT_DIR}`,
  )
}

await main()
