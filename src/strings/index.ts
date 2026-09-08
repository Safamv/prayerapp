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
 * How many passages a thing holds, in the caps slot. Read by the category rows
 * of scope 6.1, the row that opens My list, and the Bookmarks screen, so the
 * three cannot come to word the same count differently.
 */
const passageCount = (count: number) => (count === 1 ? '1 PASSAGE' : `${String(count)} PASSAGES`)

/**
 * Scope 11.5's word for the third upkeep state, written once so that the
 * vocabulary table and the control that sets it can never disagree.
 */
const upkeepResting = 'Resting'

/**
 * Scope 11.5's V0 label for the ordered list of what the user intends to
 * memorise, and scope 6.5's own words: "Internal term: `list`. V0 UI label: My
 * list." Written once so the vocabulary table, the screen's own title, the row
 * that opens it and the button that adds to it can never come to disagree.
 */
const myList = 'My list'

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

  /**
   * The tabs. Caps slot, so written in capitals (design-tokens 2.3).
   *
   * **Three, and they are not scope 3.1's three.** Decision D7.1 splits the bar
   * down the middle: the devotional half of the app on the left, the activity
   * half on the right. Log is no longer a tab; everything it was going to hold
   * belongs on Memorise, which is the whole activity side now. Recents joins the
   * left pair at v1.0 (scope 6.4) and makes it four.
   *
   * `discover` keeps its internal name everywhere - the folder, the route, the
   * strings key - because that name is what principle 7.6's wall is written
   * against. Only the word on screen changed.
   */
  tabs: {
    discover: 'DEVOTIONS',
    bookmarks: 'BOOKMARKS',
    memorise: 'MEMORISE',
  },

  /** The same names in the display slot, for the screen titles. */
  screenTitles: {
    discover: 'Devotions',
    bookmarks: 'Bookmarks',
    memorise: 'Memorise',
    myList,
    settings: 'Settings',
  },

  /**
   * Scope 11.5, transcribed exactly. Nothing here renders yet: freshness is
   * session 9, upkeep is session 6, the daily queue is session 6. The words are
   * fixed now so that no later session has to invent one under time pressure.
   */
  vocabulary: {
    list: myList,
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
    emptyList: 'Nothing on your list yet. Add a passage from Devotions when you want to learn it.',
    /**
     * The two doors at the foot of the Memorise tab. Session 6 had a roll call
     * of every passage on the list here; My list absorbed it (decision D7.3),
     * so what is left is one row that opens it and one that opens Settings.
     *
     * Settings arrived from Log, which decision D2.4 called a default rather
     * than a choice and invited Safa to overturn. He did (D7.1).
     */
    myListRow: myList,
    passageCount,

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

  /**
   * **The quiz ladder.** Scope 9.1, 9.3, 9.4 and 9.6.
   *
   * Three rules govern every word here, and all three are principles rather than
   * taste.
   *
   * **Nothing is scored** (7.2, 9.6). There is no count of right answers on this
   * screen, no percentage, no total at the end. The reader rates themselves and
   * that rating is the only judgement the app ever holds.
   *
   * **Correct and incorrect are shown calmly** (7.1). No buzzer, no failure
   * word, no exclamation mark. A word you did not choose is simply put in its
   * place, and the sentence that says so states what happened rather than how it
   * went.
   *
   * **Nothing congratulates you, least of all with scripture** (7.5). Finishing
   * a prayer's lines returns you to the Memorise tab with one row fewer on it,
   * and finishing the day is the sentence that was already there: "You are up to
   * date."
   */
  review: {
    /** Level 1, a line the reader has not met before. Scope 9.1: read and reveal. */
    readNew: 'A new line. Read it through.',
    /** Level 1 again, for a line that came back after being forgotten. */
    readAgain: 'Read it through.',
    /** Levels 2 and 3. Scope 9.3: the blanked words are a tappable word bank. */
    fillBlanks: 'Tap the words back into their places.',
    /** Level 4. Scope 9.1: order the segments, in the app's word for a segment. */
    putInOrder: 'Put the lines back in the order they run.',
    /** Level 4's reveal, which is the whole answer at once (scope 7.2). */
    orderRevealed: 'This is the order they run in.',
    /** The pinned button that ends level 4. A reveal, never a verdict. */
    showOrder: 'SHOW THE ORDER',

    /**
     * Which line of this prayer's work today, in the caps slot. A count of what
     * you have taken on, already capped by scope 8.3, and the only number on the
     * screen. Principle 7.3 forbids counting what the cap left out, and nothing
     * here does.
     */
    lineOfDay: (position: number, total: number) => `LINE ${String(position)} OF ${String(total)}`,

    /**
     * Scope 9.6: "Again, Hard, Good, Easy, chosen after the reveal. This is the
     * only input to SM-2. Nothing is auto-scored." The four words are the
     * scope's own, in the caps slot, so they are written in capitals.
     */
    ratingSection: 'HOW DID THAT GO?',
    ratingAgain: 'AGAIN',
    ratingHard: 'HARD',
    ratingGood: 'GOOD',
    ratingEasy: 'EASY',

    /**
     * What a blank is called by anyone who cannot see the rule drawn in the
     * line, and what is said when one is filled.
     *
     * The two sentences are the same shape on purpose. Getting it right and
     * getting it wrong are both reported as what happened to the text, never as
     * how the reader did: principle 7.2 displays strictly and judges gently, and
     * a screen reader hearing "Wrong!" would be the buzzer principle 7.1 forbids
     * on every other surface.
     */
    missingWord: 'missing word',
    wordPlaced: (word: string) => `${word} is in place.`,
    wordCorrected: (chosen: string, correct: string) =>
      `${chosen} is not the word. The word is ${correct}.`,
    /** A chip that has been used. Read where the dimming cannot be seen. */
    chipUsed: (word: string) => `${word}, already used`,
  },

  /**
   * **My list.** Scope 6.5: the ordered list of what the user intends to
   * memorise, with the V0 label scope 11.5 fixes.
   *
   * A memorisation surface, so it may say what upkeep state a passage is in -
   * and it does, because it absorbed the roll call session 6 put on the Memorise
   * tab (decision D7.3). Every row still opens the upkeep screen behind it.
   *
   * **Removing is one tap and permanent.** Scope 6.5: "removable at any time,
   * permanently, with no penalty or friction", so there is no confirmation
   * dialogue. What it has instead is the band of decision D4.10 with an Undo
   * beside it, because the remove throws away the lines and everything learnt of
   * them (D5.4) and a mis-tap should not cost three weeks in silence.
   */
  myList: {
    /** Nothing on the list. The same sentence the empty queue uses, so they agree. */
    empty: 'Nothing on your list yet. Add a passage from Devotions when you want to learn it.',
    passageCount,
    /** The control on a row. Caps slot, in capitals. */
    remove: 'REMOVE',
    /** What a screen reader hears, where "REMOVE" alone would not say what of. */
    removeNamed: (title: string) => `Remove ${title} from your list`,
    /** The band, and the way back. The same two words the reading view uses. */
    removed: 'Taken off your list',
    removeUndone: 'Put back on your list',
    undo: 'Undo',
  },

  /**
   * **Dragging a list into the order you want.** Scope 6.7's rule, which governs
   * Bookmarks and My list identically.
   *
   * Nothing here is drawn. The handle is a mark and the rest is what a screen
   * reader announces, which is the whole of how this works for anyone not using
   * touch: the handle takes focus, and the arrow keys move the row.
   */
  reorder: {
    handle: (title: string) => `Reorder ${title}. Use the up and down arrow keys to move it.`,
    movedTo: (title: string, position: number, total: number) =>
      `${title} moved to ${String(position)} of ${String(total)}.`,
  },

  settings: {
    /** The row on Memorise that opens the settings screen. */
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
    passageCount,
    /** The count on a passage row. Scope 6.2. */
    wordCount,
  },

  /**
   * **Bookmarks.** Scope 6.7: the passages a user has kept a place in.
   *
   * A devotional surface, so nothing here may name a due date, a freshness
   * state, a streak or the list. Scope 6.6 keeps a bookmark and My list apart on
   * purpose - "find this again on Sunday" against "I intend to learn this" - and
   * a shared word here would blur them faster than a shared screen would.
   *
   * **The sort and filter labels are the axes Safa chose** when scope 6.7 told
   * this session to propose a set and ask (decision D7.2). They are in the caps
   * slot, so they are written in capitals.
   */
  bookmarks: {
    eyebrow: appNameEyebrow,
    /** Nothing kept yet. It says where a bookmark comes from, and stops. */
    empty: 'Nothing bookmarked yet. Keep a place in a prayer and it will be here.',
    /** Nothing left after the filters. Says what to do, without judgement. */
    noneMatch: 'Nothing here with those filters. Change one and they come back.',
    passageCount,

    /** The leading caps label on each row of controls. */
    sortLabel: 'SORT',
    collectionLabel: 'COLLECTION',
    authorLabel: 'AUTHOR',

    /**
     * The four sorts. **My order is the hand arrangement and the default**, and
     * scope 6.7 is emphatic that choosing another is a view over the same
     * bookmarks and never a rewrite of it.
     */
    sortManual: 'MY ORDER',
    sortRecent: 'RECENT',
    sortTitle: 'TITLE',
    sortShortest: 'SHORTEST',

    /** The chip that clears a filter. One per row of chips. */
    filterAll: 'ALL',
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
    /** Today's queue (scope 8.3). */
    queueList: 'Today',
    /** A row of today's queue, which opens that prayer's lines (decision D8.1). */
    queueRow: (title: string, lines: string) => `${title}, ${lines.toLowerCase()}`,
    /** The three parts of a quiz screen (scope 9.1, 9.3, 9.6). */
    quizLine: 'The line',
    chipBank: 'Words to choose from',
    orderLines: 'The lines to put in order',
    selfRating: 'How did that go?',
    /** The two ordered screens of scope 6.5 and 6.7. */
    bookmarkList: 'Bookmarks',
    myList,
    /** The three rows of controls above the bookmarks (decision D7.2). */
    sortOptions: 'Sort bookmarks',
    collectionFilter: 'Filter by collection',
    authorFilter: 'Filter by author',
    /** The three upkeep states, which are one choice rather than three switches. */
    upkeepOptions: 'How often this passage comes round',
  },
} as const

export type Strings = typeof strings
