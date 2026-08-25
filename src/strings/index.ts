/**
 * **Every user-facing string in the app.** Principle 7.11, from the first commit.
 *
 * This is what makes the deferred vocabulary decision of scope 11.5 safe: a
 * future tone pass is one file, not a hunt through forty components. It is
 * enforced by `src/principles/strings-in-jsx.test.ts`, which fails the build if
 * any literal text appears inside JSX anywhere outside this folder.
 *
 * ## Two rules for editing this file
 *
 * **Never invent a label and never improve one.** V0 ships the plain-language
 * vocabulary of the scope 11.5 table verbatim. The metaphor vocabulary
 * ("In cultivation", "The garden", "Days of constancy") is a `[v1.1]` candidate
 * list, not a plan, and it cannot be judged before the visual direction is real.
 * Changing a word here means logging a decision (CLAUDE.md section 3).
 *
 * **Caps-slot text is written out in capitals.** Design-tokens 2.3: never
 * `text-transform`, because tracking on transformed text renders inconsistently
 * and screen readers announce it differently. So a tab label is stored as
 * `'DISCOVER'` and the sentence-case form lives beside it where a screen title
 * needs one.
 *
 * `as const` is what makes a missing key a compile error rather than an empty
 * span: `strings.tabs.discovr` does not type-check.
 */
export const strings = {
  /** Scope 3.3. Pencilled, and cheap to change until a domain is bought. */
  appName: 'By Heart',

  /** Scope 3.1. Caps slot, so written in capitals (design-tokens 2.3). */
  tabs: {
    discover: 'DISCOVER',
    memorise: 'MEMORISE',
    log: 'LOG',
  },

  /** The same three names in the display slot, for the screen titles. */
  screenTitles: {
    discover: 'Discover',
    memorise: 'Memorise',
    log: 'Log',
    settings: 'Settings',
  },

  /**
   * Scope 11.5, transcribed exactly. Nothing here renders yet: freshness is
   * session 9, upkeep is session 6, the daily queue is session 6. The words are
   * fixed now so that no later session has to invent one under time pressure.
   */
  vocabulary: {
    list: 'My list',
    learning: 'Learning',
    memorised: 'Memorised',
    freshnessStrong: 'Strong',
    freshnessFading: 'Fading',
    /** Scope 11.5 deleted "lapsed": it judges the user, which principle 7.1 forbids. */
    freshnessNeedsReview: 'Needs review',
    upkeepResting: 'Resting',
    dailyQueue: 'Today',
    streak: 'Days in a row',
  },

  settings: {
    /** The row on Log that opens the settings screen. */
    open: 'Settings',
    /** Caps slot. Labels the version line a tester reads off their screen. */
    versionEyebrow: 'VERSION',
  },

  /**
   * Discover: the library. Scope 6.1, 6.5 and 6.6.
   *
   * **Nothing here may name a due date, a streak, a freshness state or any
   * other memorisation word.** Principle 7.6 is enforced against the folder by
   * `src/principles/discover-isolation.test.ts`, but a label is the one way
   * memorisation chrome could reach a devotional screen without importing
   * anything, so it is worth saying here too.
   */
  discover: {
    /** Tall header eyebrow on the library's first screen: the app's own name. */
    eyebrow: 'BY HEART',
    /** Section header above the four collections, which is the library's first screen. */
    collectionsSection: 'COLLECTIONS',
    /** Section header above the alphabetical list of categories (scope 6.1). */
    categoriesSection: 'CATEGORIES',
    /** The count on a category row. Scope 6.1: "each with a passage count". */
    passageCount: (count: number) => (count === 1 ? '1 PASSAGE' : `${String(count)} PASSAGES`),
    /**
     * The count on a passage row. Scope 6.2: "Word count is precise, honest, and
     * free at ingestion. It is not a band and not a judgement."
     */
    wordCount: (count: number) => (count === 1 ? '1 WORD' : `${String(count)} WORDS`),
  },

  /**
   * The reading view. Scope 6.6, design-tokens 5.4.
   *
   * Scope 6.6 gives the toolbar two actions and says they are different intents:
   * a bookmark is "find this again on Sunday", the list is "I intend to learn
   * this". The labels keep them apart rather than blurring them into one saved
   * state, which is why neither says "save".
   */
  reading: {
    bookmarkAdd: 'Bookmark',
    bookmarkRemove: 'Remove bookmark',
    listAdd: 'Add to my list',
    /**
     * Principle 7.6: "a passage already on your list shows nothing in the
     * reading view except that the add button reads as already added". This is
     * that, and it is the whole of what Discover is permitted to say about it.
     */
    listAlreadyAdded: 'On my list',
    /**
     * The moment of adding, and the moment of keeping a place, each confirmed
     * where it happened. Adding carries an undo because it is the one action in
     * Discover with no other way back (decision D4.9); bookmarking does not,
     * because the mark that set it is right there and toggles.
     */
    addedToList: 'Added to your list',
    addUndone: 'Taken off your list',
    bookmarked: 'Bookmarked',
    bookmarkUndone: 'Bookmark removed',
    undo: 'Undo',
    /**
     * Design-tokens 7.2 and scope 4.3. The Bahá'í International Community, not
     * the publishing trust: the source handoff had the wrong body and
     * design-tokens section 9 corrects it.
     */
    copyright: "© BAHÁ'Í INTERNATIONAL COMMUNITY",
    /** Scope 4.3 requires the translator "where relevant". No corpus text has one yet. */
    translatedBy: 'TRANSLATED BY',
  },

  /**
   * The four collections of scope 4.1, in the caps slot.
   *
   * Written out in capitals rather than uppercased from the column, because
   * these are labels the app owns (design-tokens 2.3). A collection with no
   * entry here falls back to the passage's own collection value, so a fifth
   * feed shows something rather than nothing.
   */
  collections: {
    prayers: 'PRAYERS',
    'hidden-words': 'THE HIDDEN WORDS',
    gleanings: 'GLEANINGS',
    'prayers-and-meditations': 'PRAYERS AND MEDITATIONS',
  },

  /**
   * The same four, in the display slot, for the title of a collection's own
   * screen. Separate entries rather than one set put through a case change,
   * because "THE HIDDEN WORDS" and "The Hidden Words" are both written the way
   * their slot needs them (design-tokens 2.3).
   */
  collectionTitles: {
    prayers: 'Prayers',
    'hidden-words': 'The Hidden Words',
    gleanings: 'Gleanings',
    'prayers-and-meditations': 'Prayers and Meditations',
  },

  /** What kind of text a passage is, for the reading-surface eyebrow. */
  textTypes: {
    prayer: 'PRAYER',
    'hidden-word': 'HIDDEN WORD',
    gleaning: 'GLEANING',
  },

  /**
   * Read by screen readers and never drawn. They are user-facing all the same,
   * so they live here rather than in a component.
   */
  accessibility: {
    back: 'Back',
    primaryNavigation: 'Main',
    /** The library's collection list, its category list, and a passage list. */
    collectionList: 'Collections',
    categoryList: 'Categories',
    passageList: 'Passages',
  },
} as const

export type Strings = typeof strings
