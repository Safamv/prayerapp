import { createHash } from 'node:crypto'

/**
 * A deterministic (name-based) id, RFC 4122 UUID version 5.
 *
 * Corpus records need an id that is stable across re-fetches (scope 4.2): the
 * same source feed and source id must always produce the same passage id, so
 * that re-running the fetch script upserts a corrected translation in place,
 * both in the committed JSON (a stable id is a small, readable diff) and in a
 * returning user's IndexedDB, where `putPassages` upserts on `id`
 * (`src/data/corpus.ts`). Decision D3.3.
 *
 * `src/data/ids.ts` generates a random id instead, for user-owned records,
 * because there uniqueness across two offline devices matters more than
 * repeatability. The corpus is the opposite: it has one source of truth (the
 * feed), so repeatability is what matters.
 */

/** Fixed once, chosen arbitrarily, and never regenerated: changing it would reissue every id. */
export const CORPUS_NAMESPACE = '2b184c9e-df9c-4e83-9b3f-2f6c0a6a6b13'

function namespaceBytes(namespace: string): Uint8Array {
  const hex = namespace.replace(/-/g, '')
  const bytes = new Uint8Array(16)
  for (let i = 0; i < 16; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

function formatUuid(bytes: Uint8Array): string {
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-')
}

/** `name` scoped by `namespace`, always producing the same id for the same pair. */
export function deterministicUuid(namespace: string, name: string): string {
  const hash = createHash('sha1')
  hash.update(namespaceBytes(namespace))
  hash.update(name, 'utf8')
  const bytes = new Uint8Array(hash.digest().subarray(0, 16))
  // RFC 4122 §4.3: set the version (5) and variant bits the UUID format requires.
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  return formatUuid(bytes)
}
