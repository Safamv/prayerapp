// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ANONYMOUS_USER_ID_KEY, forgetAnonymousUserId, getOrCreateAnonymousUserId } from './userId'

/**
 * The anonymous user id of scope 13.1.
 *
 * V0 has no account and no network. The id is generated once on this device and
 * reused forever after, which is what makes v1.0's "signing in claims your
 * anonymous id and turns on sync" a claim rather than a migration.
 *
 * jsdom because this is the one part of the data layer that touches the browser
 * rather than the database.
 */

beforeEach(() => {
  forgetAnonymousUserId()
})

describe('the anonymous user id', () => {
  it('is generated on first run', () => {
    expect(localStorage.getItem(ANONYMOUS_USER_ID_KEY)).toBeNull()

    const id = getOrCreateAnonymousUserId()
    expect(id).not.toBe('')
    expect(localStorage.getItem(ANONYMOUS_USER_ID_KEY)).toBe(id)
  })

  it('is the same on every run afterwards', () => {
    const first = getOrCreateAnonymousUserId()
    const second = getOrCreateAnonymousUserId()
    const third = getOrCreateAnonymousUserId()

    expect(second).toBe(first)
    expect(third).toBe(first)
  })

  it('survives a reload, because it lives in storage rather than in memory', () => {
    const id = getOrCreateAnonymousUserId()
    // A reload is a new module instance reading the same storage.
    expect(localStorage.getItem(ANONYMOUS_USER_ID_KEY)).toBe(id)
  })

  it('replaces an empty stored value rather than carrying it', () => {
    localStorage.setItem(ANONYMOUS_USER_ID_KEY, '')

    const id = getOrCreateAnonymousUserId()
    expect(id).not.toBe('')
    expect(localStorage.getItem(ANONYMOUS_USER_ID_KEY)).toBe(id)
  })

  it('still returns a usable id when storage refuses to write', () => {
    // A private window with storage disabled, or a device out of quota. The app
    // works for the session and forgets afterwards, which beats a white screen.
    const refuse = vi.spyOn(globalThis.localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })

    try {
      expect(getOrCreateAnonymousUserId()).not.toBe('')
      expect(refuse).toHaveBeenCalled()
    } finally {
      refuse.mockRestore()
    }
  })

  it('still returns a usable id when there is no storage at all', () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true })

    try {
      expect(getOrCreateAnonymousUserId()).not.toBe('')
    } finally {
      if (descriptor !== undefined) Object.defineProperty(globalThis, 'localStorage', descriptor)
    }
  })
})
