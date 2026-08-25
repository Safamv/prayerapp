import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  breakBefore,
  joinLines,
  lineRanges,
  proposedBreaks,
  proposeLines,
  segmentPassage,
  segmentsFrom,
  splitLine,
  splitPoint,
} from './segmentation'

/**
 * Segmentation. Scope 8.4, and CLAUDE.md section 11, which names it as one of
 * the six things that must be unit tested because "a silent bug in any of them
 * invalidates the V0 data".
 *
 * The last block is the one that keeps this honest: every one of the 976
 * passages in the committed corpus is put through the splitter, and the text is
 * required to survive it exactly. A break in the wrong place is a matter of
 * taste and the user can fix it on the screen. A character lost between two
 * lines is sacred text altered by a regular expression, and no screen would ever
 * show that it had happened.
 */

const CORPUS_DIR = join(import.meta.dirname, '..', 'data', 'corpus-data')

interface CorpusRow {
  readonly id: string
  readonly title: string
  readonly text: string
}

function corpus(): CorpusRow[] {
  return [
    'prayers.json',
    'hidden-words.json',
    'gleanings.json',
    'prayers-and-meditations.json',
  ].flatMap((file) => JSON.parse(readFileSync(join(CORPUS_DIR, file), 'utf8')) as CorpusRow[])
}

/** The Short Obligatory Prayer: three sentences, no line breaks. */
const SHORT_OBLIGATORY =
  'I bear witness, O my God, that Thou hast created me to know Thee and to worship Thee. ' +
  'I testify, at this moment, to my powerlessness and to Thy might, to my poverty and to Thy ' +
  'wealth. There is none other God but Thee, the Help in Peril, the Self-Subsisting.'

/** The first Hidden Word: an invocation, a blank line, then one sentence with a colon in it. */
const FIRST_HIDDEN_WORD =
  'O SON OF SPIRIT!\n\nMy first counsel is this: Possess a pure, kindly and radiant heart, ' +
  'that thine may be a sovereignty ancient, imperishable and everlasting.'

describe('segmentPassage - where the breaks are', () => {
  it('proposes nothing in a single sentence', () => {
    expect(proposeLines('Blessed is the spot where mention of God hath been made.')).toEqual([
      'Blessed is the spot where mention of God hath been made.',
    ])
  })

  it('breaks a full stop followed by a capital', () => {
    expect(proposeLines(SHORT_OBLIGATORY)).toEqual([
      'I bear witness, O my God, that Thou hast created me to know Thee and to worship Thee.',
      'I testify, at this moment, to my powerlessness and to Thy might, to my poverty and to Thy wealth.',
      'There is none other God but Thee, the Help in Peril, the Self-Subsisting.',
    ])
  })

  it('breaks a question mark and an exclamation mark too', () => {
    expect(
      proposeLines(
        'Is there any Remover of difficulties save God? He is God! All are His servants.',
      ),
    ).toEqual([
      'Is there any Remover of difficulties save God?',
      'He is God!',
      'All are His servants.',
    ])
  })

  it('carries the closing quotation mark with the sentence it closes', () => {
    const boundaries = segmentPassage('He said: “Praise be to God.” Then he turned away.')
    expect(segmentsFrom(boundaries, proposedBreaks(boundaries))).toEqual([
      'He said: “Praise be to God.”',
      'Then he turned away.',
    ])
  })

  /**
   * The corpus is full of these. "Alas! for the poor" is one exclamation inside
   * one sentence, and a splitter that broke on every mark would cut it in half.
   * The capital after the mark is what tells the two apart.
   */
  it('does not break an exclamation followed by a lower-case word', () => {
    expect(proposeLines('Alas! for the poor, and lo! they have turned away.')).toEqual([
      'Alas! for the poor, and lo! they have turned away.',
    ])
  })

  it('does not break an ellipsis followed by a lower-case word', () => {
    expect(proposeLines('He spoke of the realm… to those who would hear.')).toEqual([
      'He spoke of the realm… to those who would hear.',
    ])
  })

  it('breaks a blank line, which is a new paragraph', () => {
    expect(proposeLines(FIRST_HIDDEN_WORD)).toEqual([
      'O SON OF SPIRIT!',
      'My first counsel is this: Possess a pure, kindly and radiant heart, that thine may be a ' +
        'sovereignty ancient, imperishable and everlasting.',
    ])
  })

  it('breaks a single line ending, which is how the corpus sets verse', () => {
    expect(
      proposeLines('Blessed is the spot, and the house,\nand the place, and the city,'),
    ).toEqual(['Blessed is the spot, and the house,', 'and the place, and the city,'])
  })

  it('reads a carriage return as a line ending', () => {
    expect(proposeLines('First line,\r\nsecond line.')).toEqual(['First line,', 'second line.'])
  })

  it('proposes nothing at all for a passage with no words in it', () => {
    expect(proposeLines('   \n  ')).toEqual([])
    expect(segmentPassage('').pieces).toEqual([])
  })
})

describe('segmentPassage - the breaks it finds but does not propose', () => {
  /**
   * Scope 8.4 proposes on sentence and line boundaries and nothing weaker. A
   * colon or a semicolon is found all the same, because the split control on
   * the confirm screen needs somewhere to cut a long sentence, and a devotional
   * sentence of two hundred words is held together by exactly these.
   */
  it('finds a colon as a boundary and leaves it closed', () => {
    const segmentation = segmentPassage(FIRST_HIDDEN_WORD)
    const kinds = segmentation.boundaries.map((boundary) => boundary.kind)
    expect(kinds).toEqual(['paragraph', 'clause', 'phrase', 'phrase', 'phrase'])
    expect(proposedBreaks(segmentation)).toEqual([true, false, false, false, false])
  })

  it('finds a semicolon as a boundary and leaves it closed', () => {
    const segmentation = segmentPassage('Magnify Thou O Lord; and lift up Thy servants.')
    expect(segmentation.boundaries.map((boundary) => boundary.kind)).toEqual(['clause'])
    expect(proposedBreaks(segmentation)).toEqual([false])
  })

  /**
   * The weakest cut there is, and the one that makes the split control possible
   * at all on the Gleanings: a single sentence there runs to fifty words with
   * nothing but commas inside it.
   */
  it('finds a comma as a boundary and leaves it closed', () => {
    const segmentation = segmentPassage('Blessed is the spot, and the house.')
    expect(segmentation.boundaries.map((boundary) => boundary.kind)).toEqual(['phrase'])
    expect(proposedBreaks(segmentation)).toEqual([false])
    expect(proposeLines('Blessed is the spot, and the house.')).toEqual([
      'Blessed is the spot, and the house.',
    ])
  })

  it('always leaves a way to cut a long line, however it is punctuated', () => {
    const long =
      'If ye meet the abased or the downtrodden, turn not away disdainfully from them, ' +
      'for the King of Glory ever watcheth over them.'
    const segmentation = segmentPassage(long)
    const ranges = lineRanges(segmentation, proposedBreaks(segmentation))
    expect(splitPoint(segmentation, ranges, 0)).not.toBeNull()
  })
})

describe('merging and splitting', () => {
  const segmentation = segmentPassage(SHORT_OBLIGATORY)

  it('joins a line with the one above it', () => {
    const breaks = proposedBreaks(segmentation)
    const joined = joinLines(segmentation, breaks, 1)
    expect(segmentsFrom(segmentation, joined)).toEqual([
      'I bear witness, O my God, that Thou hast created me to know Thee and to worship Thee. ' +
        'I testify, at this moment, to my powerlessness and to Thy might, to my poverty and to ' +
        'Thy wealth.',
      'There is none other God but Thee, the Help in Peril, the Self-Subsisting.',
    ])
  })

  it('rejoins with the whitespace the passage actually had there', () => {
    const verse = segmentPassage('Blessed is the spot,\nand the house.')
    const joined = joinLines(verse, proposedBreaks(verse), 1)
    expect(segmentsFrom(verse, joined)).toEqual(['Blessed is the spot,\nand the house.'])
  })

  it('has nothing to join above the first line', () => {
    expect(breakBefore(lineRanges(segmentation, proposedBreaks(segmentation)), 0)).toBeNull()
  })

  it('splits a joined line back apart at the same place', () => {
    const breaks = proposedBreaks(segmentation)
    const joined = joinLines(segmentation, breaks, 1)
    expect(splitLine(segmentation, joined, 0)).toEqual(breaks)
  })

  /**
   * A line with more than one closed boundary inside it splits at the strongest
   * one, and at the first of them when they are equally strong. Read top to
   * bottom, a second tap then splits what is left, which is the order a person
   * is reading the screen in anyway.
   */
  it('splits at the strongest boundary inside the line, then at the first of equals', () => {
    const mixed = segmentPassage('One thing; another thing. A third thing; a fourth.')
    const breaks = mixed.boundaries.map(() => false)
    expect(mixed.boundaries.map((boundary) => boundary.kind)).toEqual([
      'clause',
      'sentence',
      'clause',
    ])

    const once = splitLine(mixed, breaks, 0)
    expect(segmentsFrom(mixed, once)).toEqual([
      'One thing; another thing.',
      'A third thing; a fourth.',
    ])

    const twice = splitLine(mixed, once, 0)
    expect(segmentsFrom(mixed, twice)).toEqual([
      'One thing;',
      'another thing.',
      'A third thing; a fourth.',
    ])
  })

  it('offers no split point in a line that has no boundary left inside it', () => {
    const plain = segmentPassage('One line here. Another line here.')
    const ranges = lineRanges(plain, proposedBreaks(plain))
    expect(splitPoint(plain, ranges, 0)).toBeNull()
  })

  it('leaves the lines unchanged when there is nothing to split', () => {
    const plain = segmentPassage('One line here. Another line here.')
    const breaks = proposedBreaks(plain)
    expect(splitLine(plain, breaks, 0)).toEqual(breaks)
  })
})

describe('every passage in the committed corpus', () => {
  const rows = corpus()

  it('has passages to check, so this suite cannot pass vacuously', () => {
    expect(rows.length).toBeGreaterThan(900)
  })

  /**
   * The one that matters. Every piece, rejoined with the whitespace that was
   * between them, must be the passage again, character for character.
   */
  it('survives being taken apart and put back together, exactly', () => {
    const damaged: string[] = []

    for (const row of rows) {
      const segmentation = segmentPassage(row.text)
      const whole = segmentsFrom(
        segmentation,
        segmentation.boundaries.map(() => false),
      )
      if (whole[0] !== row.text.replace(/\r\n?/g, '\n').trim()) damaged.push(row.title)
    }

    expect(damaged).toEqual([])
  })

  it('proposes lines that carry no leading or trailing whitespace and are never empty', () => {
    const wrong: string[] = []

    for (const row of rows) {
      for (const line of proposeLines(row.text)) {
        if (line.trim() !== line || line === '') wrong.push(`${row.title}: ${JSON.stringify(line)}`)
      }
    }

    expect(wrong).toEqual([])
  })

  it('proposes at least one line for every passage, and the same lines every time', () => {
    for (const row of rows) {
      const lines = proposeLines(row.text)
      expect(lines.length).toBeGreaterThan(0)
      expect(proposeLines(row.text)).toEqual(lines)
    }
  })

  /**
   * The shape of the result, stated as a range rather than a number so that a
   * corrected feed does not fail the build, and stated at all because a
   * splitter that quietly proposed one line per passage would pass every test
   * above it.
   */
  it('proposes a sensible number of lines: a median of a handful, not one and not hundreds', () => {
    const counts = rows.map((row) => proposeLines(row.text).length).sort((a, b) => a - b)
    const median = counts[Math.floor(counts.length / 2)] ?? 0

    expect(median).toBeGreaterThan(2)
    expect(median).toBeLessThan(20)
    expect(counts.filter((count) => count === 1).length).toBeLessThan(rows.length / 10)
  })
})
