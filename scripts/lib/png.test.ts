import { inflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { encodePng, PNG_SIGNATURE } from './png.ts'

/**
 * The encoder is hand written (see its docblock), so it is tested against the
 * format rather than against itself: the signature the specification fixes, the
 * IEND checksum every PNG in the world shares, and the pixels read back out.
 */

/** Walks the chunk list. Length, type, data, CRC, repeatedly, after the signature. */
function chunks(png: Uint8Array): { type: string; data: Uint8Array; crc: number }[] {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
  const found: { type: string; data: Uint8Array; crc: number }[] = []
  let offset = PNG_SIGNATURE.length
  while (offset < png.length) {
    const length = view.getUint32(offset, false)
    const type = String.fromCharCode(...png.subarray(offset + 4, offset + 8))
    found.push({
      type,
      data: png.subarray(offset + 8, offset + 8 + length),
      crc: view.getUint32(offset + 8 + length, false),
    })
    offset += 12 + length
  }
  return found
}

describe('encodePng', () => {
  const RED = [255, 0, 0] as const
  const GREEN = [0, 255, 0] as const
  const BLUE = [0, 0, 255] as const
  const WHITE = [255, 255, 255] as const

  /** A 2x2 chequer, so a row stride bug and a column bug look different. */
  const pixels = Uint8Array.from([...RED, ...GREEN, ...BLUE, ...WHITE])
  const png = encodePng(2, 2, pixels)

  it('begins with the eight bytes the specification fixes', () => {
    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
  })

  it('emits exactly IHDR, IDAT and IEND, in that order', () => {
    expect(chunks(png).map((entry) => entry.type)).toEqual(['IHDR', 'IDAT', 'IEND'])
  })

  it('declares the size, eight bits, truecolour, and no interlacing', () => {
    const header = chunks(png)[0]?.data
    expect(header).toBeDefined()
    const view = new DataView(header!.buffer, header!.byteOffset, header!.byteLength)
    expect(view.getUint32(0, false)).toBe(2) // width
    expect(view.getUint32(4, false)).toBe(2) // height
    expect([...header!.subarray(8)]).toEqual([8, 2, 0, 0, 0]) // depth, RGB, deflate, adaptive, none
  })

  /**
   * The checksum is computed over the chunk's type and data, and IEND has no
   * data, so this value is identical in every PNG ever written. It is the one
   * assertion here that does not depend on this file being correct.
   */
  it('computes the checksum the way every other PNG does', () => {
    expect(chunks(png).at(-1)?.crc).toBe(0xae426082)
  })

  it('round trips the pixels, each scanline behind a zero filter byte', () => {
    const data = chunks(png)[1]?.data
    expect(data).toBeDefined()
    const raw = new Uint8Array(inflateSync(data!))
    expect([...raw]).toEqual([0, ...RED, ...GREEN, 0, ...BLUE, ...WHITE])
  })

  it('refuses a buffer that is not three bytes per pixel', () => {
    expect(() => encodePng(2, 2, new Uint8Array(11))).toThrow(/Expected 12 bytes/)
  })
})
