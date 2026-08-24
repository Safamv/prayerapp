import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_USER_SETTINGS } from '../config/defaults'
import { resetDatabase } from './db'
import { getOrCreateUserSettings, updateUserSettings } from './userSettings'

/**
 * `user_settings`. The defaults come from scope 8.3 for the queue caps and from
 * the theme registry for the palette, typeface and text size, so there is one
 * definition of "Paris Navy is the default" rather than two that can drift.
 */

const USER = 'user-1'

beforeEach(async () => {
  await resetDatabase()
})

describe('user settings', () => {
  it('gives a new user the scope defaults', async () => {
    const settings = await getOrCreateUserSettings(USER)

    expect(settings.daily_review_limit).toBe(15)
    expect(settings.daily_new_limit).toBe(2)
    expect(settings.palette).toBe('paris-navy')
    expect(settings.typeface).toBe('italiana')
    expect(settings.text_size).toBe(1)
    expect(settings.high_contrast).toBe(false)
  })

  it('creates the row once', async () => {
    const first = await getOrCreateUserSettings(USER)
    const second = await getOrCreateUserSettings(USER)

    expect(second).toEqual(first)
  })

  it('remembers a palette change', async () => {
    await updateUserSettings(USER, { palette: 'oxblood-cloth' })

    expect((await getOrCreateUserSettings(USER)).palette).toBe('oxblood-cloth')
  })

  it('remembers a text size change without disturbing the queue caps', async () => {
    const settings = await updateUserSettings(USER, { text_size: 1.5 })

    expect(settings.text_size).toBe(1.5)
    expect(settings.daily_review_limit).toBe(DEFAULT_USER_SETTINGS.daily_review_limit)
  })

  it('keys on the user id, so two users each have their own settings', async () => {
    await updateUserSettings(USER, { palette: 'oxblood-cloth' })
    await getOrCreateUserSettings('user-2')

    expect((await getOrCreateUserSettings('user-2')).palette).toBe('paris-navy')
  })
})
