/**
 * Shapes returned by the bahaiprayers.net JSON API (scope 4.1), as observed by
 * calling every endpoint session 3 uses and reading the real response. The API
 * publishes no schema of its own, so this file is the only record of what it
 * actually returns.
 */

export interface RawLanguage {
  readonly Id: number
  readonly Name: string
  readonly English: string
  readonly Culture: string
  readonly IsLeftToRight: boolean
  readonly PrayerCount: number
}

/** `/api/prayer/tags?languageid=`. The response is a bare array. */
export interface RawTag {
  readonly Id: number
  readonly LanguageId: number
  readonly Name: string
  readonly Kind: string
  readonly PrayerCount: number
}

export interface RawPrayerTag {
  readonly Id: number
  readonly Name: string
  readonly Kind: string
}

/** One entry in the `Prayers` array inside `RawPrayerFeed`. */
export interface RawPrayer {
  readonly Id: number
  readonly AuthorId: number
  readonly LanguageId: number
  readonly Text: string
  readonly Tags: readonly RawPrayerTag[]
}

/**
 * `/api/prayer/prayersystembylanguage?languageid=&html=false`. Wrapped in an
 * envelope, unlike the other three content feeds, which return a bare array.
 */
export interface RawPrayerFeed {
  readonly ErrorMessage: string
  readonly IsInError: boolean
  readonly Prayers: readonly RawPrayer[]
}

/** `/api/prayer/HiddensByLanguage?languageid=`. The response is a bare array. */
export interface RawHiddenWord {
  readonly Id: number
  readonly Number: number
  readonly LanguageId: number
  /** `true` for the 71 Hidden Words from the Arabic, `false` for the 82 from the Persian. */
  readonly IsArabic: boolean
  readonly Text: string
}

/** `/api/prayer/GleaningsByLanguage?languageid=`. The response is a bare array. */
export interface RawGleaning {
  readonly Id: number
  readonly Number: number
  readonly Roman: string
  readonly LanguageId: number
  readonly Text: string
}

/** `/api/prayer/PMsByLanguage?languageid=`. The response is a bare array. */
export interface RawPrayerAndMeditation {
  readonly Id: number
  readonly Number: number
  readonly LanguageId: number
  readonly Text: string
}
