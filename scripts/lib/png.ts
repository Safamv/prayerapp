import { deflateSync } from 'node:zlib'

/**
 * A minimal PNG encoder, for the home screen icon and nothing else.
 *
 * ## Why this is written rather than installed
 *
 * The app needs four raster icons (design-tokens 8.3 and decision D10.2 explain
 * why raster at all). Every library that would produce one - `sharp`, `canvas`,
 * `resvg` - is a native binary of tens of megabytes, downloaded per platform, to
 * draw one nine-pointed star on a flat ground. That is a dependency for the sake
 * of a shape the app already knows how to describe, and CLAUDE.md rule 6 asks
 * for a decision before any dependency at all. This follows decision D7.5, where
 * dragging was written rather than installed for the same reason.
 *
 * ## What it supports, and what it deliberately does not
 *
 * Eight-bit truecolour, no alpha, no interlacing, filter type 0 on every
 * scanline. That is the whole of it. The icon is opaque by construction - the
 * navy runs to all four edges so that iOS's rounded crop cuts cloth rather than
 * a transparent corner - so there is no alpha channel to encode and no reason to
 * carry the code for one.
 *
 * Filter 0 (None) rather than the adaptive filtering a general encoder would do:
 * the image is a flat ground with one shape on it, so deflate finds its runs
 * without help. The 512px icon lands at a few kilobytes.
 *
 * The format is PNG (RFC 2083) and the compressed stream is zlib (RFC 1950),
 * which is exactly what `deflateSync` produces, so no framing is added by hand.
 */

/** The eight bytes every PNG file begins with. PNG specification 5.2. */
const SIGNATURE = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])

/** PNG colour type 2: truecolour, three channels, no alpha. */
const COLOUR_TYPE_RGB = 2

const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) === 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

/** CRC-32 as PNG specifies it: every chunk's type and data, never its length. */
function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (const byte of bytes) {
    c = (CRC_TABLE[(c ^ byte) & 0xff] ?? 0) ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

function uint32(value: number): Uint8Array {
  const out = new Uint8Array(4)
  new DataView(out.buffer).setUint32(0, value >>> 0, false)
  return out
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

/** Length, type, data, CRC. The four fields of every PNG chunk. */
function chunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = Uint8Array.from(type, (character) => character.charCodeAt(0))
  const body = concat([typeBytes, data])
  return concat([uint32(data.length), body, uint32(crc32(body))])
}

/**
 * Encodes an opaque image.
 *
 * @param width pixels
 * @param height pixels
 * @param rgb `width * height * 3` bytes, row major, red green blue
 */
export function encodePng(width: number, height: number, rgb: Uint8Array): Uint8Array {
  const expected = width * height * 3
  if (rgb.length !== expected) {
    throw new Error(`Expected ${String(expected)} bytes of RGB, received ${String(rgb.length)}`)
  }

  const header = concat([
    uint32(width),
    uint32(height),
    Uint8Array.from([8, COLOUR_TYPE_RGB, 0, 0, 0]),
  ])

  // Every scanline is preceded by its filter type. Zero means "no filter": the
  // bytes are the pixels. See the docblock for why nothing cleverer is done.
  const stride = width * 3
  const raw = new Uint8Array((stride + 1) * height)
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0
    raw.set(rgb.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1)
  }

  return concat([
    SIGNATURE,
    chunk('IHDR', header),
    chunk('IDAT', new Uint8Array(deflateSync(raw, { level: 9 }))),
    chunk('IEND', new Uint8Array(0)),
  ])
}

/** Exported for the test, which reads a written file back to check the header. */
export const PNG_SIGNATURE: Uint8Array = SIGNATURE
