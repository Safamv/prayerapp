import { describe, expect, it, vi } from 'vitest'
import { newId } from './ids'

/**
 * Record ids. A UUID rather than an auto-incrementing number, because two
 * devices offline would both produce a row 41 and v1.0 sync would have to
 * reconcile them.
 */

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('newId', () => {
  it('is a version 4 UUID', () => {
    expect(newId()).toMatch(UUID_V4)
  })

  it('does not repeat', () => {
    const ids = new Set(Array.from({ length: 5000 }, newId))
    expect(ids.size).toBe(5000)
  })

  it('still works where crypto.randomUUID is missing, which is any insecure context', () => {
    // `crypto.randomUUID` exists only in a secure context. A phone opening the
    // dev server over the local network by IP address has none, and that is
    // exactly how a tester will look at this.
    //
    // The property is shadowed with `undefined` rather than deleted, because it
    // is an own property in Node and a prototype method in a browser, and only
    // shadowing hides it in both.
    const descriptor = Object.getOwnPropertyDescriptor(crypto, 'randomUUID')
    const randomBytes = vi.spyOn(crypto, 'getRandomValues')
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true })

    try {
      expect(newId()).toMatch(UUID_V4)
      // The fallback draws from `getRandomValues`, which is available in an
      // insecure context too, so this is real randomness and not a weaker source.
      expect(randomBytes).toHaveBeenCalled()
      expect(new Set(Array.from({ length: 1000 }, newId)).size).toBe(1000)
    } finally {
      if (descriptor === undefined) Reflect.deleteProperty(crypto, 'randomUUID')
      else Object.defineProperty(crypto, 'randomUUID', descriptor)
      randomBytes.mockRestore()
    }
  })
})
