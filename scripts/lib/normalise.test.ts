import { describe, expect, it } from 'vitest'
import { CORPUS_NAMESPACE, deterministicUuid } from './deterministicId'
import {
  normaliseGleaning,
  normaliseHiddenWord,
  normalisePrayer,
  normalisePrayerAndMeditation,
  normaliseTag,
  passageTagLinksForPrayer,
  SPECIAL_TABLETS_TAG,
} from './normalise'
import type {
  RawGleaning,
  RawHiddenWord,
  RawPrayer,
  RawPrayerAndMeditation,
  RawTag,
} from './rawFeedTypes'

/**
 * Every raw record below was saved from a real call to the live
 * bahaiprayers.net endpoints named in scope 4.1 while building session 3, not
 * invented. CLAUDE.md section 11 requires normalisation to be unit-tested
 * because a silent bug here would be wrong for the whole V0 dataset.
 */

// A short 'Abdu'l-Bahá prayer, AuthorId 3.
const PRAYER_15692: RawPrayer = {
  Id: 15692,
  AuthorId: 3,
  LanguageId: 1,
  Text:
    'O Lord! Bless this family and grant it happiness in both this world and the world to come. ' +
    'Confirm this distinguished person in the greatest service to the human world, which is the ' +
    'unity of all mankind, that he may attain to Thy good-pleasure in this world and obtain a ' +
    'bounteous portion from the surging ocean of divine outpourings in this luminous age.',
  Tags: [{ Id: 5376, Name: 'Additional Prayers Revealed by ‘Abdu’l‑Bahá', Kind: 'GENERAL' }],
}

// "Blessed is the spot", AuthorId 2, one sentence carried across ten poetic lines.
const PRAYER_4966: RawPrayer = {
  Id: 4966,
  AuthorId: 2,
  LanguageId: 1,
  Text:
    'Blessed is the spot, and the house,\nand the place, and the city,\nand the heart, and the ' +
    'mountain,\nand the refuge, and the cave,\nand the valley, and the land,\nand the sea, and the ' +
    'island,\nand the meadow where mention\nof God hath been made,\nand His praise glorified.',
  Tags: [{ Id: 66, Name: 'Gatherings', Kind: 'GENERAL' }],
}

// Carries the "##For Women" editorial note ahead of the actual prayer.
const PRAYER_208: RawPrayer = {
  Id: 208,
  AuthorId: 3,
  LanguageId: 1,
  Text:
    '##For Women\n\nO my God, O Forgiver of sins and Dispeller of afflictions!  O Thou Who art ' +
    'pardoning and merciful!  I raise my suppliant hands to Thee, tearfully beseeching the court ' +
    'of Thy divine Essence to forgive, through Thy mercy and pardon, Thy handmaiden who hath ' +
    'ascended unto the seat of truth.  Cause her, O Lord, to be overshadowed by the clouds of Thy ' +
    'bounty and favor, immerse her in the ocean of Thy forgiveness and clemency, and enable her to ' +
    'enter the sanctified abode, Thy heavenly Paradise.\nThou art, verily, the Mighty, the ' +
    'Compassionate, the Generous, the Merciful.',
  Tags: [{ Id: 56, Name: 'Departed', Kind: 'GENERAL' }],
}

// "Is there any Remover of difficulties" — a well-known prayer of the Báb, AuthorId 1.
const PRAYER_341: RawPrayer = {
  Id: 341,
  AuthorId: 1,
  LanguageId: 1,
  Text:
    'Is there any Remover of difficulties save God?  Say: Praised be God! He is God!  All are His ' +
    'servants, and all abide by His bidding!',
  Tags: [{ Id: 84, Name: 'Tests and Difficulties', Kind: 'GENERAL' }],
}

const HIDDEN_WORD_ARABIC_1: RawHiddenWord = {
  Id: 1,
  Number: 1,
  LanguageId: 1,
  IsArabic: true,
  Text:
    '<p>O SON OF SPIRIT!</p>\n<p>My first counsel is this: Possess a pure, kindly and radiant ' +
    'heart, that thine may be a sovereignty ancient, imperishable and everlasting.</p>',
}

const GLEANING_2: RawGleaning = {
  Id: 2,
  Number: 2,
  Roman: 'II',
  LanguageId: 1,
  Text:
    '<p>The beginning of all things is the knowledge of God, and the end of all things is strict ' +
    'observance of whatsoever hath been sent down from the empyrean of the Divine Will that ' +
    'pervadeth all that is in the heavens and all that is on the earth.</p>',
}

const PM_1: RawPrayerAndMeditation = {
  Id: 1,
  Number: 1,
  LanguageId: 1,
  Text:
    '<p>Glorified art Thou, O Lord my God! Every man of insight confesseth Thy sovereignty and Thy ' +
    'dominion.</p>\n<p>Methinks, the lamp of Thy love is burning in their hearts.</p>',
}

const TAG_HEALING: RawTag = {
  Id: 1,
  LanguageId: 1,
  Name: 'Healing',
  Kind: 'GENERAL',
  PrayerCount: 7,
}

// The Tablet of Aḥmad, with its editorial preamble (a bold title and an attributed
// quotation) ahead of the real text. The API's own Tags array already names it too.
const PRAYER_TABLET_OF_AHMAD: RawPrayer = {
  Id: 386,
  AuthorId: 2,
  LanguageId: 1,
  Text:
    '**Tablet of Aḥmad\n\n*“These daily obligatory prayers, together with a few other specific ' +
    'ones, such as the Healing Prayer, the Tablet of Aḥmad, have been invested by Bahá’u’lláh ' +
    'with a special potency and significance.”\n\n*—From a letter written on behalf of Shoghi ' +
    'Effendi\n\nHe is the King, the All-Knowing, the Wise!\n\nLo, the Nightingale of Paradise ' +
    'singeth upon the twigs of the Tree of Eternity.',
  Tags: [{ Id: 97, Name: 'Tablet of Ahmad', Kind: 'GENERAL' }],
}

describe('normalisePrayer', () => {
  it("maps AuthorId 3 to 'Abdu'l-Bahá and reaches past a short opening sentence for the title", () => {
    const row = normalisePrayer(PRAYER_15692)
    expect(row.id).toBe(deterministicUuid(CORPUS_NAMESPACE, 'prayers:15692'))
    expect(row.source_id).toBe('15692')
    expect(row.source_feed).toBe('prayers')
    expect(row.collection).toBe('prayers')
    expect(row.text_type).toBe('prayer')
    expect(row.source_work).toBeNull()
    expect(row.author).toBe("'Abdu'l-Bahá")
    expect(row.translator).toBeNull()
    // "O Lord!" alone (2 words) is not distinctive; first_line reaches into the
    // next sentence until it has gathered at least eight words (decision D3.9).
    expect(row.first_line).toBe(
      'O Lord! Bless this family and grant it happiness in both this world and the world to come.',
    )
    expect(row.title).toBe('O Lord! Bless this family and grant it…')
    expect(row.display_title).toBe(row.title)
    expect(row.word_count).toBe(63)
    expect(row.length_band).toBe('short')
    expect(row.segment_count).toBe(0)
    expect(row.visibility).toBe('global')
    expect(row.created_by).toBeNull()
    expect(row.language).toBe('en')
  })

  it("maps AuthorId 2 to Bahá'u'lláh and reads a whole rhythmic one-sentence prayer as its first line", () => {
    const row = normalisePrayer(PRAYER_4966)
    expect(row.author).toBe("Bahá'u'lláh")
    expect(row.first_line).toBe(
      'Blessed is the spot, and the house, and the place, and the city, and the heart, and the ' +
        'mountain, and the refuge, and the cave, and the valley, and the land, and the sea, and ' +
        'the island, and the meadow where mention of God hath been made, and His praise glorified.',
    )
    expect(row.title).toBe('Blessed is the spot, and the house, and…')
    // Ten poetic lines, one sentence: the segment estimate reads one, banded short.
    expect(row.length_band).toBe('short')
    expect(row.word_count).toBe(51)
    // The full text keeps every authored line break, for the reading view.
    expect(row.text.split('\n')).toHaveLength(9)
  })

  it('drops the embedded editorial note and normalises AuthorId 1 to the Báb', () => {
    const withNote = normalisePrayer(PRAYER_208)
    expect(withNote.text.startsWith('##')).toBe(false)
    expect(withNote.first_line).toBe('O my God, O Forgiver of sins and Dispeller of afflictions!')
    expect(withNote.title).toBe('O my God, O Forgiver of sins and…')
    expect(withNote.word_count).toBe(97)
    expect(withNote.length_band).toBe('medium')

    const theBab = normalisePrayer(PRAYER_341)
    expect(theBab.author).toBe('The Báb')
    expect(theBab.first_line).toBe('Is there any Remover of difficulties save God?')
    expect(theBab.title).toBe('Is there any Remover of difficulties save God?')
    expect(theBab.word_count).toBe(25)
  })

  it('throws rather than guess at an AuthorId outside the three known central figures', () => {
    const unknownAuthor: RawPrayer = { ...PRAYER_15692, AuthorId: 99 }
    expect(() => normalisePrayer(unknownAuthor)).toThrow(/AuthorId 99/)
  })

  it('builds a lowercased search vector from the title, full text and author', () => {
    const row = normalisePrayer(PRAYER_15692)
    expect(row.search_vector).toContain('o lord')
    expect(row.search_vector).toContain("'abdu'l-bahá")
    expect(row.search_vector).toBe(row.search_vector.toLowerCase())
  })

  it('names a known tablet by its own name, not its opening line (decision D3.8)', () => {
    const row = normalisePrayer(PRAYER_TABLET_OF_AHMAD)
    expect(row.title).toBe('Tablet of Aḥmad')
    expect(row.display_title).toBe('Tablet of Aḥmad')
    expect(row.source_work).toBe('Tablet of Aḥmad')
    // first_line still opens on the real text, the preamble already stripped.
    expect(row.first_line.startsWith('He is the King')).toBe(true)
    expect(row.text.startsWith('**')).toBe(false)
  })
})

describe('normaliseHiddenWord', () => {
  it("attributes every Hidden Word to Bahá'u'lláh and names the source work", () => {
    const row = normaliseHiddenWord(HIDDEN_WORD_ARABIC_1)
    expect(row.id).toBe(deterministicUuid(CORPUS_NAMESPACE, 'hidden-words:1'))
    expect(row.source_feed).toBe('hidden-words')
    expect(row.collection).toBe('hidden-words')
    expect(row.text_type).toBe('hidden-word')
    expect(row.source_work).toBe('The Hidden Words')
    expect(row.author).toBe("Bahá'u'lláh")
    // "O SON OF SPIRIT!" alone (4 words) is not distinctive across the many
    // Hidden Words that share an address; first_line reaches into the body.
    expect(row.first_line).toBe(
      'O SON OF SPIRIT! My first counsel is this: Possess a pure, kindly and radiant heart, that ' +
        'thine may be a sovereignty ancient, imperishable and everlasting.',
    )
    expect(row.title).toBe('O SON OF SPIRIT! My first counsel is…')
    expect(row.word_count).toBe(26)
    expect(row.length_band).toBe('short')
    // The address and the body were two <p> paragraphs: joined on a blank line.
    expect(row.text).toBe(
      'O SON OF SPIRIT!\n\nMy first counsel is this: Possess a pure, kindly and radiant heart, ' +
        'that thine may be a sovereignty ancient, imperishable and everlasting.',
    )
  })
})

describe('normaliseGleaning', () => {
  it('names Gleanings as the source work and unwraps its single HTML paragraph', () => {
    const row = normaliseGleaning(GLEANING_2)
    expect(row.id).toBe(deterministicUuid(CORPUS_NAMESPACE, 'gleanings:2'))
    expect(row.source_feed).toBe('gleanings')
    expect(row.text_type).toBe('gleaning')
    expect(row.source_work).toBe("Gleanings from the Writings of Bahá'u'lláh")
    expect(row.author).toBe("Bahá'u'lláh")
    expect(row.word_count).toBe(47)
    expect(row.length_band).toBe('short')
    expect(row.title).toBe('The beginning of all things is the knowledge…')
  })
})

describe('normalisePrayerAndMeditation', () => {
  it('names Prayers and Meditations as the source work and joins its paragraphs on a blank line', () => {
    const row = normalisePrayerAndMeditation(PM_1)
    expect(row.id).toBe(deterministicUuid(CORPUS_NAMESPACE, 'prayers-and-meditations:1'))
    expect(row.source_feed).toBe('prayers-and-meditations')
    expect(row.text_type).toBe('prayer')
    expect(row.source_work).toBe('Prayers and Meditations')
    expect(row.author).toBe("Bahá'u'lláh")
    expect(row.text).toContain('\n\n')
  })
})

describe('normaliseTag', () => {
  it('carries the name and records the source id', () => {
    const row = normaliseTag(TAG_HEALING)
    expect(row.id).toBe(deterministicUuid(CORPUS_NAMESPACE, 'tag:1'))
    expect(row.name).toBe('Healing')
    expect(row.source_tag_id).toBe('1')
  })
})

describe('passageTagLinksForPrayer', () => {
  it('links a prayer to every tag it carries, by the same deterministic ids', () => {
    const links = passageTagLinksForPrayer(PRAYER_15692)
    expect(links).toEqual([
      {
        passage_id: deterministicUuid(CORPUS_NAMESPACE, 'prayers:15692'),
        tag_id: deterministicUuid(CORPUS_NAMESPACE, 'tag:5376'),
      },
    ])
  })

  it('returns no links for a prayer that carries no tags', () => {
    expect(passageTagLinksForPrayer({ ...PRAYER_341, Tags: [] })).toEqual([])
  })

  it('also links a named tablet to Special Tablets, alongside its ordinary tags', () => {
    const links = passageTagLinksForPrayer(PRAYER_TABLET_OF_AHMAD)
    expect(links).toEqual([
      {
        passage_id: deterministicUuid(CORPUS_NAMESPACE, 'prayers:386'),
        tag_id: deterministicUuid(CORPUS_NAMESPACE, 'tag:97'),
      },
      {
        passage_id: deterministicUuid(CORPUS_NAMESPACE, 'prayers:386'),
        tag_id: SPECIAL_TABLETS_TAG.id,
      },
    ])
  })
})
