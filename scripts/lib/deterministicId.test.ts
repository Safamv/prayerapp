import { describe, expect, it } from 'vitest'
import { CORPUS_NAMESPACE, deterministicUuid } from './deterministicId'

const UUID_V5_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('deterministicUuid', () => {
  it('produces the same id for the same namespace and name every time', () => {
    const first = deterministicUuid(CORPUS_NAMESPACE, 'prayers:15692')
    const second = deterministicUuid(CORPUS_NAMESPACE, 'prayers:15692')
    expect(first).toBe(second)
  })

  it('produces a different id for a different name in the same namespace', () => {
    const a = deterministicUuid(CORPUS_NAMESPACE, 'prayers:15692')
    const b = deterministicUuid(CORPUS_NAMESPACE, 'prayers:15693')
    expect(a).not.toBe(b)
  })

  it('produces a different id for the same name in a different namespace', () => {
    const a = deterministicUuid(CORPUS_NAMESPACE, 'tag:1')
    const b = deterministicUuid('11111111-1111-1111-1111-111111111111', 'tag:1')
    expect(a).not.toBe(b)
  })

  it('is a well-formed version 5 UUID', () => {
    const id = deterministicUuid(CORPUS_NAMESPACE, 'gleanings:1')
    expect(id).toMatch(UUID_V5_SHAPE)
  })

  it('does not confuse a source id repeated across two different feeds', () => {
    const prayer = deterministicUuid(CORPUS_NAMESPACE, 'prayers:7')
    const gleaning = deterministicUuid(CORPUS_NAMESPACE, 'gleanings:7')
    expect(prayer).not.toBe(gleaning)
  })
})
