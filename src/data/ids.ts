/**
 * Record ids.
 *
 * A UUID rather than an auto-incrementing number, because an auto-increment is
 * local to one device: two devices offline would both produce a row 41 and
 * v1.0 sync would have to reconcile them. A UUID generated on either device is
 * already unique, so sync stays a copy rather than a merge (decision D0.9).
 */

/**
 * `crypto.randomUUID` only exists in a secure context. Localhost and https are
 * secure; a phone opening the dev server over the local network by IP address
 * is not, and that is exactly how a tester will look at this. `getRandomValues`
 * is available in both, so the fallback is real randomness rather than a
 * weaker source.
 */
function randomUuidV4(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  // Set the version (4) and variant bits the UUID format requires.
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-')
}

export function newId(): string {
  return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : randomUuidV4()
}
