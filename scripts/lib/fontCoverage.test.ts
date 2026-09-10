import { describe, expect, it } from 'vitest'
import { describeCharacter, fontCodePoints, missingFrom } from './fontCoverage'

/**
 * The `cmap` reader that tells the fetch script which characters a family can
 * actually draw (decision D13.1).
 *
 * It is tested against fonts built here rather than against the committed ones,
 * for two reasons. The committed files are `woff2`, which this parser
 * deliberately does not read; and a test that fetched a real font would need a
 * network, which would make the suite fail on the aeroplane the whole product
 * is designed for.
 *
 * So these build the smallest legal thing the parser has to understand and hand
 * it that. A font with the segments written by hand is also the only way to
 * exercise the parts that are easy to get subtly wrong: a segment addressed
 * through `idRangeOffset` rather than `idDelta`, a character mapped to glyph
 * zero, and the terminator segment every format 4 table must end with.
 */

interface Segment {
  readonly start: number
  readonly end: number
  /** When given, glyph ids are looked up in this array rather than computed. */
  readonly glyphs?: readonly number[]
}

/** A font carrying nothing but a `cmap`, which is all this parser reads. */
function buildFormat4Font(segments: readonly Segment[]): Buffer {
  // Every format 4 table must end with a segment mapping 0xFFFF, so the reader
  // is handed the terminator whether or not the caller thought about it.
  const all = [...segments, { start: 0xffff, end: 0xffff }]
  const segCount = all.length

  const endCodes = Buffer.alloc(segCount * 2)
  const startCodes = Buffer.alloc(segCount * 2)
  const idDeltas = Buffer.alloc(segCount * 2)
  const idRangeOffsets = Buffer.alloc(segCount * 2)
  const glyphArray: number[] = []

  all.forEach((segment, index) => {
    endCodes.writeUInt16BE(segment.end, index * 2)
    startCodes.writeUInt16BE(segment.start, index * 2)
    if (segment.glyphs === undefined) {
      // glyph = code + delta. Any non-zero result will do.
      idDeltas.writeInt16BE(segment.start === 0xffff ? 1 : 100 - segment.start, index * 2)
      idRangeOffsets.writeUInt16BE(0, index * 2)
    } else {
      idDeltas.writeInt16BE(0, index * 2)
      // Distance in bytes from this entry to where its glyphs begin.
      const remaining = (segCount - index) * 2
      idRangeOffsets.writeUInt16BE(remaining + glyphArray.length * 2, index * 2)
      glyphArray.push(...segment.glyphs)
    }
  })

  const glyphIds = Buffer.alloc(glyphArray.length * 2)
  glyphArray.forEach((glyph, index) => glyphIds.writeUInt16BE(glyph, index * 2))

  const header = Buffer.alloc(14)
  const subtableLength = 14 + 2 + segCount * 8 + glyphIds.length
  header.writeUInt16BE(4, 0) // format
  header.writeUInt16BE(subtableLength, 2)
  header.writeUInt16BE(0, 4) // language
  header.writeUInt16BE(segCount * 2, 6)
  header.writeUInt16BE(0, 8) // searchRange, unread by this parser
  header.writeUInt16BE(0, 10)
  header.writeUInt16BE(0, 12)

  const subtable = Buffer.concat([
    header,
    endCodes,
    Buffer.alloc(2), // reservedPad
    startCodes,
    idDeltas,
    idRangeOffsets,
    glyphIds,
  ])

  const cmapHeader = Buffer.alloc(12)
  cmapHeader.writeUInt16BE(0, 0) // version
  cmapHeader.writeUInt16BE(1, 2) // one encoding record
  cmapHeader.writeUInt16BE(3, 4) // platform: Windows
  cmapHeader.writeUInt16BE(1, 6) // encoding: BMP
  cmapHeader.writeUInt32BE(12, 8) // the subtable begins straight after
  const cmap = Buffer.concat([cmapHeader, subtable])

  const sfnt = Buffer.alloc(12 + 16)
  sfnt.writeUInt32BE(0x00010000, 0)
  sfnt.writeUInt16BE(1, 4) // one table
  sfnt.write('cmap', 12, 'ascii')
  sfnt.writeUInt32BE(0, 16) // checksum, unread
  sfnt.writeUInt32BE(12 + 16, 20) // offset
  sfnt.writeUInt32BE(cmap.length, 24)

  return Buffer.concat([sfnt, cmap])
}

const code = (character: string) => character.codePointAt(0) ?? 0

describe('fontCodePoints', () => {
  it('reads a plain segment addressed by idDelta', () => {
    const font = buildFormat4Font([{ start: code('A'), end: code('C') }])
    const covered = fontCodePoints(font)
    expect(covered.has(code('A'))).toBe(true)
    expect(covered.has(code('B'))).toBe(true)
    expect(covered.has(code('C'))).toBe(true)
    expect(covered.has(code('D'))).toBe(false)
  })

  it('reads a segment addressed through the glyph id array', () => {
    const font = buildFormat4Font([{ start: code('a'), end: code('c'), glyphs: [7, 8, 9] }])
    const covered = fontCodePoints(font)
    expect([...'abc'].every((character) => covered.has(code(character)))).toBe(true)
  })

  it('treats a character mapped to glyph zero as absent, because it is', () => {
    // Glyph 0 is `.notdef`, the empty box. A cmap that maps a character to it
    // has an entry and no letter, which is exactly the failure this reader
    // exists to catch.
    const font = buildFormat4Font([{ start: code('x'), end: code('z'), glyphs: [7, 0, 9] }])
    const covered = fontCodePoints(font)
    expect(covered.has(code('x'))).toBe(true)
    expect(covered.has(code('y'))).toBe(false)
    expect(covered.has(code('z'))).toBe(true)
  })

  it('never reports the terminator segment as a real character', () => {
    expect(fontCodePoints(buildFormat4Font([{ start: 65, end: 66 }])).has(0xffff)).toBe(false)
  })

  it('returns nothing for a buffer that is not a font, rather than throwing', () => {
    expect(fontCodePoints(Buffer.from('not a font at all')).size).toBe(0)
    expect(fontCodePoints(Buffer.alloc(0)).size).toBe(0)
  })
})

describe('missingFrom', () => {
  it('names the characters a font cannot draw, in the order they were asked for', () => {
    const font = buildFormat4Font([{ start: code('A'), end: code('Z') }])
    expect(missingFrom(font, 'ABCḥ❦Z')).toEqual(['ḥ', '❦'])
  })

  it('reports a character once however often it appears', () => {
    const font = buildFormat4Font([{ start: code('A'), end: code('B') }])
    expect(missingFrom(font, 'ḥḥḥḥ')).toEqual(['ḥ'])
  })

  it('finds nothing missing when the font covers the charset', () => {
    const font = buildFormat4Font([
      { start: code('A'), end: code('Z') },
      { start: code('ḥ'), end: code('ḥ') },
    ])
    expect(missingFrom(font, 'AZḥ')).toEqual([])
  })
})

describe('describeCharacter', () => {
  it('gives the mark and its code point, so a gap can be looked up', () => {
    expect(describeCharacter('ḥ')).toBe('ḥ (U+1E25)')
    expect(describeCharacter('❦')).toBe('❦ (U+2766)')
    expect(describeCharacter('·')).toBe('· (U+00B7)')
  })
})
