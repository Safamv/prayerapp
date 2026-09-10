import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import subsetFont from 'subset-font'
import { strings } from '../src/strings/index.ts'
import { TYPE_SLOTS, TYPEFACES, type Typeface } from '../src/theme/typefaces.ts'
import { collectCharset } from './lib/fontCharset.ts'
import { describeCharacter, missingFrom } from './lib/fontCoverage.ts'

/**
 * The font fetch and subset script (decision D1.8, design-tokens 8.1).
 *
 * Every family the app can render is fetched from the canonical `google/fonts`
 * source repository, cut down to the characters the app can actually put on
 * screen, and committed as a file, so the app never loads a font from a CDN
 * (CLAUDE.md rule 11, scope 12.2). A CDN font load fails offline and produces
 * unstyled text, which for something opened at six in the morning on a plane is
 * the whole product broken.
 *
 * Run it after `scripts/fetch-corpus.ts` and `scripts/build-ruhi.ts`, since the
 * subset depends on the committed text:
 *
 *     node scripts/fetch-fonts.ts
 *
 * **Never hand-edit `src/theme/fonts.css` or anything in `src/theme/fonts/`.**
 * CLAUDE.md rule 12 applies to them exactly as it does to the corpus JSON:
 * change this script and re-run it.
 *
 * ## What is fetched is derived from the registry, not listed here
 *
 * Session 2 built the typeface registry so that "adding a theme is appending an
 * object" (CLAUDE.md section 9). That claim is only true if the font pipeline
 * follows the registry rather than keeping its own list beside it, so the set of
 * faces this script needs is **computed** from `src/theme/typefaces.ts` by
 * `requiredFaces` below. `CATALOGUE` only says where each one is fetched from.
 *
 * The consequence is the point: append a typeface to the registry with no entry
 * in `CATALOGUE` and this script stops with that face named. It cannot silently
 * ship an option that renders in Georgia.
 */

/**
 * **The face every stack falls back to**, and the one that must be complete.
 *
 * `src/theme/typefaces.ts` puts Cormorant between the chosen family and the
 * system serif in every slot, because six of the ten families have no underdot
 * transliteration marks and no fleuron and subsetting cannot invent one
 * (decision D13.1). That arrangement only holds while Cormorant itself carries
 * every character the app can render, so this script refuses to write anything
 * if it stops doing so.
 */
const COVERAGE_FACE = 'Cormorant'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CORPUS_DIR = join(ROOT, 'src', 'data', 'corpus-data')
const FONTS_DIR = join(ROOT, 'src', 'theme', 'fonts')
const FONTS_CSS = join(ROOT, 'src', 'theme', 'fonts.css')

/**
 * One face: a family at one weight in one style, which is what an `@font-face`
 * rule declares and what a browser picks between.
 */
interface Face {
  readonly family: string
  readonly weight: number
  readonly style: 'normal' | 'italic'
}

/** A face plus where to get it. */
interface CatalogueEntry extends Face {
  readonly sourceUrl: string
  /**
   * Axes to pin when subsetting a variable font, so the committed file **is**
   * the instance the registry asked for. See the note on `subsetOne`.
   */
  readonly variationAxes?: Readonly<Record<string, number>>
}

const faceKey = (face: Face): string => `${face.family}|${String(face.weight)}|${face.style}`

const faceLabel = (face: Face): string =>
  `${face.family} ${String(face.weight)}${face.style === 'italic' ? ' italic' : ''}`

/**
 * **Every face the app can ask a browser for, derived from the registry.**
 *
 * Two sources, and they are the only two:
 *
 * 1. **The three slots of every typeface option** (design-tokens 2.1). Each
 *    names a family, a weight and a style, and every one of them is rendered the
 *    moment that option is selected.
 * 2. **The body family in italic**, because design-tokens 2.2 gives the byline
 *    role the body slot in italic, and that byline sits under a title on
 *    fourteen screens. Without a real italic the browser slants the roman
 *    itself, which on an old-style serif reads as a mistake rather than a
 *    style.
 *
 * Nothing else in the app sets a family or a weight: `typeStyle` resolves every
 * role through `var(--family-<slot>)` and the three slot variables come from
 * here (CLAUDE.md rule 2, design-tokens 8.4).
 */
export function requiredFaces(typefaces: readonly Typeface[]): Face[] {
  const wanted = new Map<string, Face>()
  const want = (face: Face) => {
    wanted.set(faceKey(face), face)
  }

  for (const typeface of typefaces) {
    for (const name of TYPE_SLOTS) {
      const slot = typeface[name]
      want({ family: slot.family, weight: slot.weight, style: slot.style })
    }
    // Design-tokens 2.2's `Byline italic` role: the body slot, set in italic.
    want({ family: typeface.body.family, weight: typeface.body.weight, style: 'italic' })
  }

  return [...wanted.values()]
}

const ofl = (directory: string, file: string) =>
  `https://raw.githubusercontent.com/google/fonts/main/ofl/${directory}/${encodeURIComponent(file)}`

/**
 * Where each face comes from. The ten families of design-tokens 8.1, at the
 * weights and styles the registry asks for and no others.
 *
 * Fetched from `google/fonts` rather than from the Google Fonts service, which
 * is the same upstream the service itself packages, and which serves the whole
 * unhinted source file rather than a pre-subset slice of one.
 *
 * **Variable fonts are pinned to one instance** (`variationAxes`). Cormorant's
 * variable default is 300, not 400, so a file left un-pinned depends on the
 * browser resolving a single-valued `font-weight` descriptor onto the `wght`
 * axis. Chrome does; the specification says it should; relying on it is a bet
 * with nothing to win. Pinning makes the file the instance, which is smaller,
 * identical in every engine, and one less thing that can be true on a desktop
 * and wrong on a phone.
 */
const CATALOGUE: readonly CatalogueEntry[] = [
  {
    family: 'Italiana',
    weight: 400,
    style: 'normal',
    sourceUrl: ofl('italiana', 'Italiana-Regular.ttf'),
  },
  {
    family: 'Cormorant',
    weight: 400,
    style: 'normal',
    sourceUrl: ofl('cormorant', 'Cormorant[wght].ttf'),
    variationAxes: { wght: 400 },
  },
  {
    family: 'Cormorant',
    weight: 400,
    style: 'italic',
    sourceUrl: ofl('cormorant', 'Cormorant-Italic[wght].ttf'),
    variationAxes: { wght: 400 },
  },
  {
    family: 'Cormorant Unicase',
    weight: 400,
    style: 'normal',
    sourceUrl: ofl('cormorantunicase', 'CormorantUnicase-Regular.ttf'),
  },
  {
    family: 'Cormorant Unicase',
    weight: 600,
    style: 'normal',
    sourceUrl: ofl('cormorantunicase', 'CormorantUnicase-SemiBold.ttf'),
  },
  {
    family: 'Tangerine',
    weight: 700,
    style: 'normal',
    sourceUrl: ofl('tangerine', 'Tangerine-Bold.ttf'),
  },
  {
    family: 'EB Garamond',
    weight: 400,
    style: 'normal',
    sourceUrl: ofl('ebgaramond', 'EBGaramond[wght].ttf'),
    variationAxes: { wght: 400 },
  },
  {
    family: 'EB Garamond',
    weight: 400,
    style: 'italic',
    sourceUrl: ofl('ebgaramond', 'EBGaramond-Italic[wght].ttf'),
    variationAxes: { wght: 400 },
  },
  {
    family: 'IM Fell English',
    weight: 400,
    style: 'normal',
    sourceUrl: ofl('imfellenglish', 'IMFeENrm28P.ttf'),
  },
  {
    family: 'IM Fell English',
    weight: 400,
    style: 'italic',
    sourceUrl: ofl('imfellenglish', 'IMFeENit28P.ttf'),
  },
  {
    family: 'IM Fell English SC',
    weight: 400,
    style: 'normal',
    sourceUrl: ofl('imfellenglishsc', 'IMFeENsc28P.ttf'),
  },
  {
    family: 'Goudy Bookletter 1911',
    weight: 400,
    style: 'normal',
    sourceUrl: ofl('goudybookletter1911', 'GoudyBookletter1911.ttf'),
  },
  {
    family: 'Cinzel Decorative',
    weight: 400,
    style: 'normal',
    sourceUrl: ofl('cinzeldecorative', 'CinzelDecorative-Regular.ttf'),
  },
  {
    family: 'Bodoni Moda',
    weight: 400,
    style: 'normal',
    sourceUrl: ofl('bodonimoda', 'BodoniModa[opsz,wght].ttf'),
    // opsz 11 is the font's own default optical size, which is the text cut
    // rather than the display one. Passage body is what this family is for.
    variationAxes: { wght: 400, opsz: 11 },
  },
  {
    family: 'Bodoni Moda',
    weight: 400,
    style: 'italic',
    sourceUrl: ofl('bodonimoda', 'BodoniModa-Italic[opsz,wght].ttf'),
    variationAxes: { wght: 400, opsz: 11 },
  },
]

/**
 * **The one face the app can ask for that upstream does not publish.**
 *
 * Goudy Bookletter 1911 was cut as a single roman and has no italic anywhere.
 * It is a body family, so the byline under a title in the Goudy 1911 option is
 * slanted by the browser rather than drawn. Every other body family in the
 * registry has a real italic and gets one.
 *
 * This list exists so that is a recorded decision with a reason rather than a
 * gap somebody notices on a phone. `requiredFaces` still names the face, and
 * the check in `main` passes only because it is written down here.
 */
const NO_UPSTREAM_ITALIC: readonly string[] = [
  faceKey({ family: 'Goudy Bookletter 1911', weight: 400, style: 'italic' }),
]

/** `Cormorant Unicase` 600 italic becomes `CormorantUnicase-600-italic.woff2`. */
function outputFile(face: Face): string {
  const family = face.family.replace(/ /g, '')
  const style = face.style === 'italic' ? '-italic' : ''
  return `${family}-${String(face.weight)}${style}.woff2`
}

/**
 * **Every character the app can put on screen.**
 *
 * Decision D4.7's rule, and the reason it is a rule: the subset is cut from what
 * the app renders, not from what the corpus happens to contain, because the
 * interface writes on top of the corpus and a character it writes that the
 * corpus never uses falls back to the system serif on the most repeated mark in
 * the app.
 *
 * Three sources, and between them they are everything:
 *
 * - **The committed corpus**, which is the passages themselves.
 * - **The committed Ruhi mapping** (scope 5.3), which session 12 added and which
 *   is rendered in the same faces on the same screens. It contains no character
 *   the corpus does not, today; the point of reading it is that a later edition
 *   of a Ruhi book cannot quietly introduce one.
 * - **Every string in `src/strings/`**, which is principle 7.11's module and so
 *   is, by construction, all of the app's own words.
 *
 * `src/strings/attribution.test.ts` holds the matching guarantee from the app's
 * side, over the strings the app generates rather than stores.
 */
async function appCharset(): Promise<string> {
  const corpusFiles = [
    'prayers.json',
    'hidden-words.json',
    'gleanings.json',
    'prayers-and-meditations.json',
    'tags.json',
    'ruhi.json',
  ]

  const texts: string[] = []
  const collect = (value: unknown): void => {
    if (typeof value === 'string') texts.push(value)
    else if (Array.isArray(value)) value.forEach(collect)
    else if (value !== null && typeof value === 'object') Object.values(value).forEach(collect)
  }

  for (const file of corpusFiles) {
    collect(JSON.parse(await readFile(join(CORPUS_DIR, file), 'utf8')))
  }
  collect(strings)

  return collectCharset(texts)
}

async function fetchFontSource(url: string): Promise<Buffer> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`${url} responded ${String(response.status)} ${response.statusText}`)
  }
  return Buffer.from(await response.arrayBuffer())
}

function fontFaceRule(entry: CatalogueEntry): string {
  return [
    '@font-face {',
    `  font-family: '${entry.family}';`,
    `  src: url('./fonts/${outputFile(entry)}') format('woff2');`,
    `  font-weight: ${String(entry.weight)};`,
    `  font-style: ${entry.style};`,
    '  font-display: swap;',
    '}',
  ].join('\n')
}

/**
 * Stops the build if the registry asks for a face this script cannot supply.
 *
 * This is the check that makes "adding a theme is appending an object" honest.
 * Without it, a new option in `typefaces.ts` would render in Georgia on a
 * tester's phone and nothing anywhere would have failed.
 */
function assertCatalogueCoversRegistry(): void {
  const available = new Set(CATALOGUE.map(faceKey))
  const excused = new Set(NO_UPSTREAM_ITALIC)

  const missing = requiredFaces(TYPEFACES).filter(
    (face) => !available.has(faceKey(face)) && !excused.has(faceKey(face)),
  )

  if (missing.length > 0) {
    const named = missing.map(faceLabel).join(', ')
    throw new Error(
      `src/theme/typefaces.ts asks for ${String(missing.length)} face(s) this script cannot ` +
        `fetch: ${named}. Add each to CATALOGUE with its google/fonts source, or to ` +
        `NO_UPSTREAM_ITALIC with the reason there is no such cut.`,
    )
  }
}

/** Removes a generated file this run did not write, so a rename leaves nothing behind. */
async function removeStaleFonts(written: ReadonlySet<string>): Promise<void> {
  let existing: string[]
  try {
    existing = await readdir(FONTS_DIR)
  } catch {
    return
  }
  for (const file of existing) {
    if (file.endsWith('.woff2') && !written.has(file)) {
      await unlink(join(FONTS_DIR, file))
      console.log(`Removed ${file}, which no face in the registry asks for any more.`)
    }
  }
}

const CSS_HEADER = `/**
 * Self-hosted @font-face rules (decision D1.8, design-tokens 8.1).
 *
 * Generated by \`scripts/fetch-fonts.ts\`. Never hand-edit: change the script
 * and re-run it (CLAUDE.md rule 12 applies here exactly as it does to the
 * corpus JSON). Subset to the characters the app can actually render
 * (\`scripts/lib/fontCharset.ts\`), so a diacritic missing from this file
 * means re-running the script, not editing it by hand.
 *
 * One rule per face the typeface registry asks for: the ten families of
 * design-tokens 8.1, at the weights and styles the three slots of the seven
 * options name, plus the body italic design-tokens 2.2 gives the byline role.
 * The list is derived from \`src/theme/typefaces.ts\`, not kept beside it.
 *
 * Variable fonts are pinned to one instance when subset, so the weight in each
 * rule below is the weight in the file rather than a request the browser has to
 * resolve onto an axis.
 */

`

async function main(): Promise<void> {
  assertCatalogueCoversRegistry()
  await mkdir(FONTS_DIR, { recursive: true })

  const charset = await appCharset()
  console.log(
    `Subsetting ${String(CATALOGUE.length)} faces to ${String(charset.length)} distinct ` +
      `characters found in the corpus, the Ruhi mapping and the strings module.`,
  )

  const written = new Set<string>()
  const gaps = new Map<string, string[]>()
  let total = 0
  for (const entry of CATALOGUE) {
    const source = await fetchFontSource(entry.sourceUrl)

    // What this face cannot draw, read off the source before it is cut down.
    // Subsetting silently keeps nothing for a character the font never had, so
    // this is the only moment the gap is visible. Decision D4.7, D13.1.
    const missing = missingFrom(source, charset)
    if (missing.length > 0) gaps.set(faceLabel(entry), missing)
    if (entry.family === COVERAGE_FACE && missing.length > 0) {
      throw new Error(
        `${COVERAGE_FACE} is the face every other stack falls back to and it cannot draw ` +
          `${String(missing.length)} character(s) the app renders: ` +
          `${missing.map(describeCharacter).join(', ')}. Either the corpus gained a character ` +
          `no face in the registry carries, or the coverage face in src/theme/typefaces.ts ` +
          `needs to become one that does.`,
      )
    }

    const subset = await subsetFont(source, charset, {
      targetFormat: 'woff2',
      ...(entry.variationAxes ? { variationAxes: entry.variationAxes } : {}),
    })
    const file = outputFile(entry)
    await writeFile(join(FONTS_DIR, file), subset)
    written.add(file)
    total += subset.length
    console.log(
      `${faceLabel(entry).padEnd(30)} ${String(source.length).padStart(9)} bytes -> ` +
        `${String(subset.length).padStart(7)} bytes  (${file})`,
    )
  }

  await removeStaleFonts(written)
  await writeFile(FONTS_CSS, CSS_HEADER + CATALOGUE.map(fontFaceRule).join('\n\n') + '\n', 'utf8')

  console.log(`\n${String(written.size)} files, ${String(total)} bytes in all.`)
  for (const excused of NO_UPSTREAM_ITALIC) {
    console.log(`No upstream italic for ${excused.replace(/\|/g, ' ')}; the browser slants it.`)
  }

  // Not a failure. A face that cannot draw a fleuron still draws a prayer, and
  // the coverage face behind it in every stack draws the rest (decision D13.1).
  // Printed because a silent gap is how this class of bug reaches a phone.
  if (gaps.size > 0) {
    console.log(`\nCharacters no cut of these faces carries, drawn in ${COVERAGE_FACE} instead:`)
    for (const [face, missing] of gaps) {
      console.log(`  ${face.padEnd(30)} ${missing.map(describeCharacter).join(' ')}`)
    }
  }

  console.log(`\nWrote ${FONTS_CSS}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main()
}
