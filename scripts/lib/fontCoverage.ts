/**
 * **Which characters a font file can actually draw.**
 *
 * Subsetting removes glyphs. It cannot add one, and it says nothing when the
 * character it was asked to keep was never in the source. So the subset can be
 * exactly right and the app still render a character in the system serif,
 * which is decision D4.7's bug in its third form: D3.6 found the corpus used
 * letters the token document's list did not name, D4.7 found the interface
 * wrote marks the corpus never contained, and session 13 found that six of the
 * ten families simply have no ḥ, no ṣ and no fleuron to keep.
 *
 * A font's `cmap` table is the map from a character to a glyph, so reading it
 * off the source file answers the question exactly. This parses the two formats
 * that matter and ignores the rest: **format 4**, the Basic Multilingual Plane
 * map every font since TrueType has carried, and **format 12**, which fonts with
 * characters above U+FFFF add beside it. Nothing this app renders is above
 * U+FFFF, so format 4 alone would do; format 12 is read because some modern
 * fonts ship it as the only Windows table.
 *
 * It reads an uncompressed `.ttf` or `.otf`, which is what the fetch script
 * holds in memory before it subsets. It deliberately does not read `.woff2`:
 * that would mean a Brotli decompressor and the reversal of woff2's table
 * transforms, to answer a question the source file already answers.
 */

/** A parsed table directory entry: where one table starts. */
function tableOffset(font: Buffer, tag: string): number | null {
  if (font.length < 12) return null
  const numTables = font.readUInt16BE(4)
  for (let index = 0; index < numTables; index += 1) {
    const record = 12 + index * 16
    if (record + 16 > font.length) return null
    if (font.toString('ascii', record, record + 4) === tag) return font.readUInt32BE(record + 8)
  }
  return null
}

function readFormat4(font: Buffer, subtable: number, into: Set<number>): void {
  const segCountX2 = font.readUInt16BE(subtable + 6)
  const segCount = segCountX2 / 2
  const endCodes = subtable + 14
  const startCodes = endCodes + segCountX2 + 2
  const idDeltas = startCodes + segCountX2
  const idRangeOffsets = idDeltas + segCountX2

  for (let segment = 0; segment < segCount; segment += 1) {
    const end = font.readUInt16BE(endCodes + segment * 2)
    const start = font.readUInt16BE(startCodes + segment * 2)
    const delta = font.readInt16BE(idDeltas + segment * 2)
    const rangeOffset = font.readUInt16BE(idRangeOffsets + segment * 2)
    if (start > end) continue

    for (let code = start; code <= end; code += 1) {
      // 0xFFFF is the required terminator segment, never a real character.
      if (code === 0xffff) continue
      let glyph: number
      if (rangeOffset === 0) {
        glyph = (code + delta) & 0xffff
      } else {
        const at = idRangeOffsets + segment * 2 + rangeOffset + (code - start) * 2
        if (at + 2 > font.length) continue
        glyph = font.readUInt16BE(at)
        if (glyph !== 0) glyph = (glyph + delta) & 0xffff
      }
      if (glyph !== 0) into.add(code)
    }
  }
}

function readFormat12(font: Buffer, subtable: number, into: Set<number>): void {
  const groups = font.readUInt32BE(subtable + 12)
  for (let group = 0; group < groups; group += 1) {
    const at = subtable + 16 + group * 12
    if (at + 12 > font.length) return
    const start = font.readUInt32BE(at)
    const end = font.readUInt32BE(at + 4)
    // A pathological group would otherwise allocate for a very long time.
    if (end - start > 0x20000) continue
    for (let code = start; code <= end; code += 1) into.add(code)
  }
}

/** Every code point the font has a glyph for. */
export function fontCodePoints(font: Buffer): Set<number> {
  const covered = new Set<number>()
  const cmap = tableOffset(font, 'cmap')
  if (cmap === null) return covered

  const subtables = font.readUInt16BE(cmap + 2)
  for (let index = 0; index < subtables; index += 1) {
    const record = cmap + 4 + index * 8
    if (record + 8 > font.length) break
    const subtable = cmap + font.readUInt32BE(record + 4)
    if (subtable + 4 > font.length) continue
    const format = font.readUInt16BE(subtable)
    if (format === 4) readFormat4(font, subtable, covered)
    else if (format === 12) readFormat12(font, subtable, covered)
  }
  return covered
}

/**
 * The characters of `charset` this font cannot draw, in the order they appear.
 *
 * Returning them rather than a boolean is the point: the fetch script prints
 * them per family, so a gap is something a person reads in the run rather than
 * something a phone shows a reader six months later.
 */
export function missingFrom(font: Buffer, charset: string): string[] {
  const covered = fontCodePoints(font)
  const missing: string[] = []
  const seen = new Set<string>()
  for (const character of charset) {
    if (seen.has(character)) continue
    seen.add(character)
    const code = character.codePointAt(0)
    if (code !== undefined && !covered.has(code)) missing.push(character)
  }
  return missing
}

/** `ḥ` becomes `ḥ (U+1E25)`, so a gap can be looked up rather than squinted at. */
export function describeCharacter(character: string): string {
  const code = character.codePointAt(0) ?? 0
  return `${character} (U+${code.toString(16).toUpperCase().padStart(4, '0')})`
}
