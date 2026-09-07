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
/**
 * Scope 6.2: "Word count is precise, honest, and free at ingestion. It is not a
 * band and not a judgement." Written once and read from both places that show
 * one, so a passage row and the add moment can never come to disagree about how
 * a count is worded.
 */
const wordCount = (count: number) => (count === 1 ? '1 WORD' : `${String(count)} WORDS`)

/**
 * The count of lines, in the caps slot. Written once and read from both places
 * that show one: the add moment, where it says how many lines a passage will be
 * learnt in, and today's queue, where it says how many of them today holds.
 */
const lineCount = (count: number) => (count === 1 ? '1 LINE' : `${String(count)} LINES`)

/**
 * Scope 11.5's word for the third upkeep state, written once so that the
 * vocabulary table and the control that sets it can never disagree.
 */
const upkeepResting = 'Resting'

/**
 * The app's own name in the caps slot, which is the eyebrow above the title on
 * every top-level tab screen (design-tokens 5.1, tall header). Written once so
 * that Discover and Memorise cannot come to carry different words there.
 */
const appNameEyebrow = 'BY HEART'

export const strings = {
  /** Scope 3.3. Pencilled, and cheap to change until a domain is bought. */
  appName: 'By Heart',
  /** The same name in the caps slot, for the tall header's eyebrow. */
  appNameEyebrow,

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
    upkeepResting,
    dailyQueue: 'Today',
    streak: 'Days in a row',
  },

  /**
   * **Memorise: today's queue, upkeep and focus.** Scope 8.3, 8.5 and 8.6.
   *
   * Two rules govern every word here.
   *
   * **Nothing counts what was left out.** Principle 7.3: overdue material rolls
   * forward silently and no discouraging count is ever displayed. There is a
   * count of today's work, already capped, and there is no other number.
   *
   * **When the queue is done, it is done.** Scope 8.3 forbids a "study more"
   * prompt by name, so the finished state is a statement and not an invitation.
   */
  memorise: {
    /** Section header above today's queue. Scope 11.5's word, in the caps slot. */
    todaySection: 'TODAY',
    /** How many lines today holds. Already capped, so it can only ever be small. */
    lineCount,
    /**
     * The finished day. A statement, with nothing offered after it: scope 8.3,
     * "When the queue is done, it is done. No study more prompt."
     */
    done: 'You are up to date.',
    /** A user who has not added anything yet, told where adding happens. */
    emptyList: 'Nothing on your list yet. Add a passage from Discover when you want to learn it.',
    /** Section header above the passages on the list, each a door to its upkeep. */
    upkeepSection: 'UPKEEP',

    /**
     * Scope 8.6: "a persistent line on the Memorise tab states what is paused
     * and when focus lifts." Named where there is one passage, counted where
     * there are several, because five titles in a row is not a line.
     */
    focusLine: (what: string, until: string) =>
      `Focused on ${what}. Everything else is paused until ${until}.`,
    focusPassageCount: (count: number) => `${String(count)} passages`,
    /** Scope 8.6: on expiry focus releases automatically and tells the user. */
    focusEnded: 'Focus has ended. Your whole list is back.',
  },

  /**
   * How a passage comes round, and what the user is driving at. Scope 8.5 and
   * 8.6, on the one screen that sets them.
   *
   * The three upkeep captions are the scope's own table in plain words. Nothing
   * here judges the choice: scope 8.5 is explicit that "the app does not guilt
   * users for choices it offered them".
   */
  upkeep: {
    section: 'HOW OFTEN IT COMES ROUND',
    active: 'Active',
    activeCaption: 'Comes round as often as it needs to.',
    occasional: 'Occasional',
    occasionalCaption: 'Comes round about three times less often.',
    resting: upkeepResting,
    restingCaption: 'Never comes round. It stays in your log.',

    focusSection: 'FOCUS',
    focusNote: 'While focus is on, everything else on your list is paused.',
    focusStart: 'Focus on this passage',
    focusEnd: 'End focus now',
    focusDays: 'Days of focus',
    focusUntil: (until: string) => `Focus lifts on ${until}.`,
    /** A screen reader needs to know which control the two marks belong to. */
    fewer: (label: string) => `Fewer: ${label}`,
    more: (label: string) => `More: ${label}`,
  },

  settings: {
    /** The row on Log that opens the settings screen. */
    open: 'Settings',
    /** Caps slot. Labels the version line a tester reads off their screen. */
    versionEyebrow: 'VERSION',

    /**
     * Scope 8.3's two caps, which the section calls user-adjustable and which
     * live here because Settings is the only screen in the app that configures
     * anything. The captions say what each cap counts, in the app's own word
     * for a piece of a passage.
     */
    queueSection: 'THE DAILY QUEUE',
    dailyReviewLimit: 'Lines to review each day',
    dailyReviewLimitCaption: 'Lines you have met before, come round again.',
    dailyNewLimit: 'New lines each day',
    dailyNewLimitCaption: 'Lines you have not met yet.',
    /**
     * The footer note of design-tokens 5.7. It is the one place the app explains
     * the cap, and it says what principle 7.3 does rather than what it forbids.
     */
    queueNote: 'Anything above the cap waits for another day. Nothing is lost.',
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
    eyebrow: appNameEyebrow,
    /** Section header above the four collections, which is the library's first screen. */
    collectionsSection: 'COLLECTIONS',
    /** Section header above the alphabetical list of categories (scope 6.1). */
    categoriesSection: 'CATEGORIES',
    /** The count on a category row. Scope 6.1: "each with a passage count". */
    passageCount: (count: number) => (count === 1 ? '1 PASSAGE' : `${String(count)} PASSAGES`),
    /** The count on a passage row. Scope 6.2. */
    wordCount,
  },

  /**
   * The add moment. Scope 8.4: the app proposes the lines, the user confirms
   * them, and it happens as the passage is added to the list.
   *
   * **"Line" is the scope's own word** for what the data model calls a segment
   * (scope 8.1, "cumulative line building"). The user never meets the word
   * segment, here or anywhere else.
   *
   * The counts are scope 6.2's requirement at this exact moment: "At the add
   * moment: segment count and word count, stated plainly." **No estimated time
   * to learn**, which that section forbids by name: "pace-based estimates are
   * invented precision, and the moment of commitment is the worst possible place
   * to invent it."
   */
  segmentation: {
    /**
     * One sentence of guidance, and the only new copy on the screen. It says
     * what the lines are for (scope 8.1: one at a time, then together) and what
     * can be done to them before starting (scope 8.4).
     */
    note: 'These are the lines you will learn, one at a time. Join or split them before you start.',
    lineCount,
    wordCount,
    /** The one control that carries a word, in the caps slot, so in capitals. */
    join: 'JOIN',
    /**
     * What a screen reader announces, where "JOIN" on its own would not say
     * which two lines it joins. The number is the line as it is counted on
     * screen, from one.
     */
    joinLine: (position: number) => `Join line ${String(position)} with the line above it`,
    /**
     * The cut marks inside a line have no label to read, and there can be
     * several in one line, so each says where it would cut by quoting the words
     * that would begin the new line. Decision D5.8.
     */
    splitLine: (position: number, opening: string) =>
      `Split line ${String(position)} before "${opening}"`,
    /** The pinned button that commits it. Design-tokens 5.5, caps in the accent. */
    confirm: 'ADD TO MY LIST',
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
    /** The proposed lines on the add moment's screen (scope 8.4). */
    lineList: 'Lines',
    /** Today's queue, and the list of passages beneath it (scope 8.3, 8.5). */
    queueList: 'Today',
    upkeepList: 'Upkeep',
    /** The three upkeep states, which are one choice rather than three switches. */
    upkeepOptions: 'How often this passage comes round',
  },
} as const

export type Strings = typeof strings
