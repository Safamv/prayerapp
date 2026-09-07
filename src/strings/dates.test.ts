import { describe, expect, it } from 'vitest'
import { formatDay } from './dates'

describe('a day, written the way a person says it', () => {
  it('puts the day before the month and spells the month out', () => {
    expect(formatDay('2026-09-14')).toBe('14 September')
  })

  it('does not shift the date for a reader west of Greenwich', () => {
    // A calendar day is parsed and rendered in the same zone. Without that,
    // '2026-09-14' is midnight UTC and renders as the 13th in Los Angeles.
    expect(formatDay('2026-01-01')).toBe('1 January')
    expect(formatDay('2026-12-31')).toBe('31 December')
  })

  it('spells September out in full, which the build stamp abbreviates', () => {
    // The build stamp's own format renders it as 'Sept'. The two are separate on
    // purpose: one is a sentence and the other is a serial number.
    expect(formatDay('2026-09-01')).toBe('1 September')
  })

  it('renders nothing at all rather than the words Invalid Date', () => {
    expect(formatDay('')).toBe('')
    expect(formatDay('not a day')).toBe('')
  })
})
