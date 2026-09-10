import { describe, expect, it } from 'vitest'
import { designationFrom, LESSON_ORDER_BASE, parseRuhiSource } from './ruhiSource.ts'

/**
 * The parser, against literal strings shaped like the three curation files.
 *
 * CLAUDE.md section 11 makes normalisation mandatory-unit-tested because a
 * silent bug in it does not announce itself. This is the same kind of module:
 * everything it gets wrong reaches a screen looking like correct data, and the
 * one thing a reader could not check is whether the quotation on the screen is
 * the whole of what the book printed.
 *
 * `ruhi-data.test.ts` is the other half, and reads the real dataset on disk.
 */

const HEADER = `# Ruhi Book 1 — Reflections on the Life of the Spirit
## Extracted Quotations by Unit and Section
### Source: RUHI0010.PDF (Edition 4.1.2.PE, May 2020)

Some prose about the extraction, which is not a quotation.

---
`

describe('parsing a curation file', () => {
  it('reads the book, its title and the Ruhi edition it was built against', () => {
    const book = parseRuhiSource(`${HEADER}\n## Unit 1: Understanding\n\n### Section 1\n`)
    expect(book.number).toBe(1)
    expect(book.title).toBe('Reflections on the Life of the Spirit')
    // Scope 5.2: the dataset carries the edition, or there is nothing to
    // notice a revised book against.
    expect(book.edition).toBe('4.1.2.PE, May 2020')
  })

  it("reads Book 1 and 3's inline category, and takes the words between the quotes", () => {
    const book = parseRuhiSource(
      `${HEADER}
## Unit 1: Understanding

### Section 3

6. **[To Memorize]** "Truthfulness is the foundation of all human virtues."
   — 'Abdu'l-Bahá, *The Advent of Divine Justice*, par. 40, p. 39.
`,
    )
    expect(book.entries).toHaveLength(1)
    expect(book.entries[0]).toMatchObject({
      unitNumber: 1,
      unitTitle: 'Understanding',
      sectionNumber: 3,
      sectionTitle: 'Section 3',
      entryNumber: 6,
      text: 'Truthfulness is the foundation of all human virtues.',
      citation: "'Abdu'l-Bahá, *The Advent of Divine Justice*, par. 40, p. 39.",
      designation: 'memorise',
    })
  })

  it("reads Book 2's category, which is a line of its own and different words", () => {
    const book = parseRuhiSource(
      `${HEADER}
## Unit 1: The Joy of Teaching

### Section 1

1. "All men have been created to carry forward an ever-advancing civilization."
   — Gleanings from the Writings of Bahá'u'lláh, CIX, par. 2, p. 243.
   — Designation: Quotation to Memorize

2. "The world passeth away."
   — Ibid.
   — Designation: Reflection quote
`,
    )
    expect(book.entries.map((entry) => entry.designation)).toEqual(['memorise', 'reflection'])
    // The designation line is not part of the citation.
    expect(book.entries[0]?.citation).not.toContain('Designation')
  })

  it('keeps a quotation that runs to a second paragraph whole', () => {
    const book = parseRuhiSource(
      `${HEADER}
## Unit 2: Prayer

### Section 9

20. **[To Memorize]** "I bear witness, O my God, that Thou hast created me to know Thee.

    There is none other God but Thee, the Help in Peril, the Self-Subsisting."
    — Bahá'u'lláh, in *Bahá'í Prayers*, p. 4. *(The Short Obligatory Prayer)*
`,
    )
    expect(book.entries[0]?.text).toBe(
      'I bear witness, O my God, that Thou hast created me to know Thee.\n\n' +
        'There is none other God but Thee, the Help in Peril, the Self-Subsisting.',
    )
  })

  it("leaves out the Institute's own words about a quotation", () => {
    // Scope 5.1's boundary. Book 3 introduces its six lesson prayers in the
    // line itself and closes two entries with a note explaining what they are.
    const book = parseRuhiSource(
      `${HEADER}
## Unit 2: Lessons

### Lesson 1

98. **[To Memorize]** Prayer for Lessons 1 to 4. "Bestow upon me a pure heart."
    — 'Abdu'l-Bahá, in *Bahá'í Prayers*, p. 29.

99. **[To Memorize]** "Possess a pure, kindly and radiant heart . . ." *(the lesson's own quotation)*
    — *The Hidden Words*, Arabic no. 1, p. 3.
`,
    )
    expect(book.entries.map((entry) => entry.text)).toEqual([
      'Bestow upon me a pure heart.',
      'Possess a pure, kindly and radiant heart . . .',
    ])
  })

  it('orders a lesson after every numbered section of its unit', () => {
    const book = parseRuhiSource(
      `${HEADER}
## Unit 2: Lessons

### Section 20

1. **[To Memorize]** "A section."
   — *The Hidden Words*, Arabic no. 1, p. 3.

## Unit 2 (continued): Lessons — the twenty-four lessons

### Lesson 1

2. **[To Memorize]** "A lesson."
   — *The Hidden Words*, Arabic no. 2, p. 3.
`,
    )
    const [section, lesson] = book.entries
    expect(section?.sectionNumber).toBe(20)
    expect(lesson?.sectionNumber).toBe(LESSON_ORDER_BASE + 1)
    expect(lesson?.sectionTitle).toBe('Lesson 1')
    // A continued unit is the same unit, not a fourth one.
    expect(lesson?.unitNumber).toBe(2)
  })

  it("strips the curator's parenthetical from a unit title", () => {
    const book = parseRuhiSource(
      `${HEADER}
## Unit 2: Lessons for Children's Classes, Grade 1 (preliminary sections only)

### Section 2

1. **[To Memorize]** "A quotation."
   — *The Hidden Words*, Arabic no. 1, p. 3.
`,
    )
    expect(book.entries[0]?.unitTitle).toBe("Lessons for Children's Classes, Grade 1")
  })

  it('ignores the numbered notes at the foot of a file', () => {
    // Book 3 closes with a numbered list of alternate phrasings for "memorize".
    // Without the rule that a `##` heading closes the unit above it, those four
    // list items arrive as four more quotations.
    const book = parseRuhiSource(
      `${HEADER}
## Unit 1: Understanding

### Section 1

1. **[To Memorize]** "A real quotation."
   — *The Hidden Words*, Arabic no. 1, p. 3.

## Notes on extraction

1. **"commit ... to memory"** — the most frequent alternate, e.g. "commit them to memory".
`,
    )
    expect(book.entries).toHaveLength(1)
  })
})

describe('the two categories, in four spellings', () => {
  it("folds both books' words onto the scope's two values", () => {
    expect(designationFrom('To Memorize')).toBe('memorise')
    expect(designationFrom('Quotation to Memorize')).toBe('memorise')
    expect(designationFrom('Reflection')).toBe('reflection')
    expect(designationFrom('Reflection quote')).toBe('reflection')
  })

  it('stops rather than guessing at a fifth', () => {
    expect(() => designationFrom('Worth pondering')).toThrow(/does not know/)
  })
})

describe('what the parser refuses to guess at', () => {
  it('stops on an entry with no quotation marks in it', () => {
    expect(() =>
      parseRuhiSource(
        `${HEADER}\n## Unit 1: U\n\n### Section 1\n\n1. **[To Memorize]** No quotation here.\n`,
      ),
    ).toThrow(/no quotation/)
  })

  it('stops on an entry with no category, rather than choosing one', () => {
    expect(() =>
      parseRuhiSource(`${HEADER}\n## Unit 1: U\n\n### Section 1\n\n1. "A quotation."\n`),
    ).toThrow(/no category/)
  })

  it('stops on a file that names no edition', () => {
    expect(() => parseRuhiSource('# Ruhi Book 1 — A Title\n\n## Unit 1: U\n')).toThrow(
      /names no edition/,
    )
  })
})
