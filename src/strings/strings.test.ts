import { describe, expect, it } from 'vitest'
import { strings } from './index'

/**
 * The vocabulary of scope 11.5, checked word for word.
 *
 * This is the cheapest possible guard against the failure the strings module
 * exists to prevent: a later session quietly improving a label. Scope 11.5 fixes
 * these nine words for V0 and CLAUDE.md section 3 requires a logged decision to
 * change one, so a change that arrives without a decision fails here first.
 */

describe('scope 11.5 vocabulary, verbatim', () => {
  it('is the plain language V0 ships, not the [v1.1] metaphor candidates', () => {
    expect(strings.vocabulary).toEqual({
      list: 'My list',
      learning: 'Learning',
      memorised: 'Memorised',
      freshnessStrong: 'Strong',
      freshnessFading: 'Fading',
      freshnessNeedsReview: 'Needs review',
      upkeepResting: 'Resting',
      dailyQueue: 'Today',
      streak: 'Days in a row',
    })
  })

  it('does not contain the word lapsed, which scope 11.5 deleted', () => {
    // It carries an unfortunate resonance in a religious context and it judges
    // the user, which principle 7.1 forbids.
    const everyWord = JSON.stringify(strings).toLowerCase()
    expect(everyWord).not.toContain('lapsed')
  })

  it('carries none of the garden vocabulary, which is a [v1.1] candidate list', () => {
    const everyWord = JSON.stringify(strings).toLowerCase()
    for (const candidate of ['cultivation', 'garden', 'bloom', 'tending', 'dormant', 'constancy']) {
      expect(everyWord).not.toContain(candidate)
    }
  })
})

describe('the caps slot', () => {
  it('writes tab labels in capitals rather than transforming them', () => {
    // Design-tokens 2.3: tracking on transformed text renders inconsistently and
    // screen readers announce it differently.
    for (const label of Object.values(strings.tabs)) {
      expect(label).toBe(label.toUpperCase())
    }
    expect(strings.settings.versionEyebrow).toBe(strings.settings.versionEyebrow.toUpperCase())
  })

  it('keeps the sentence-case screen titles beside them, per scope 3.1', () => {
    expect(strings.screenTitles.discover).toBe('Discover')
    expect(strings.screenTitles.memorise).toBe('Memorise')
    expect(strings.screenTitles.log).toBe('Log')
  })
})

describe('Australian English', () => {
  it('spells memorise with an s', () => {
    expect(strings.tabs.memorise).toBe('MEMORISE')
    expect(strings.vocabulary.memorised).toBe('Memorised')
    expect(JSON.stringify(strings)).not.toMatch(/memoriz/i)
  })

  it('uses no em dash in user-facing copy', () => {
    expect(JSON.stringify(strings)).not.toContain('—')
  })
})
