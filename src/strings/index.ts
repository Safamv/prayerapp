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
 * How many quotations a Ruhi book, unit or section holds, in the caps slot.
 * Written once so the four screens of the Ruhi route cannot word it differently.
 */
const quotationCount = (count: number) =>
  count === 1 ? '1 QUOTATION' : `${String(count)} QUOTATIONS`

/**
 * **Scope 5.4's two categories.** The curriculum's own words, not the app's:
 * a Ruhi book says which quotations are to be memorised and which are there to
 * be reflected on, and this is that, folded to Australian spelling.
 *
 * Both cases are written out rather than transformed, because design-tokens 2.3
 * bans `text-transform` and the caps form carries tracking.
 *
 * **It is not a freshness state and it is not progress.** It says what the book
 * asks of the reader, and it would read the same on the day they installed the
 * app. Design-tokens 4's second hard rule is about the star, and nothing here is
 * a second measure of how well anything is known.
 */
const ruhiDesignations = {
  memorise: 'To memorise',
  reflection: 'Reflection',
} as const

const ruhiDesignationsCaps = {
  memorise: 'TO MEMORISE',
  reflection: 'REFLECTION',
} as const

/**
 * Scope 5.4's label for the door and the screen behind it, chosen by Safa over
 * "Ruhi collections" and "Ruhi quotations": the screen it opens lists three
 * books, and that is how it would be said out loud in a study circle.
 */
const ruhiBooks = 'Ruhi books'

/**
 * Scope 11.5's word for the third upkeep state, written once so that the
 * vocabulary table and the control that sets it can never disagree.
 */
const upkeepResting = 'Resting'

/**
 * **Design-tokens 4's four freshness states, in scope 11.5's V0 words.**
 *
 * Written once and read from three places: the vocabulary table below, the row
 * beside a passage on the Memorise tab, and the passage detail view. The keys
 * are the token labels design-tokens 4's own table gives, so a `Freshness` value
 * from `src/progress/` indexes this directly and no component ever holds a
 * mapping from a state to a word.
 *
 * **The third is "Needs review" and never "Lapsed."** Scope 11.5 deletes that
 * word for its resonance in a religious context and because it judges the user,
 * which principle 7.1 forbids. Design-tokens 4 repeats it as one of its two hard
 * rules. It is written down here in one place so that changing it back would be
 * an edit somebody had to make on purpose.
 *
 * Resting is the same word as the upkeep state it comes from, because it is the
 * same thing: scope 8.5's resting passage, seen from the star rather than from
 * the control that set it.
 */
const freshness = {
  strong: 'Strong',
  fading: 'Fading',
  needsReview: 'Needs review',
  resting: upkeepResting,
} as const

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
    ruhi: ruhiBooks,
  },

  /**
   * Scope 11.5, transcribed exactly. Every word in it now renders: the queue and
   * the upkeep states from session 6, the list from session 7, and freshness and
   * the streak from session 11. The table is kept whole all the same, because it
   * is the scope's own list of what this product calls things, and a future tone
   * pass reads it rather than hunting through the sections below.
   */
  vocabulary: {
    list: myList,
    learning: 'Learning',
    memorised: 'Memorised',
    freshnessStrong: freshness.strong,
    freshnessFading: freshness.fading,
    /** Scope 11.5 deleted "lapsed": it judges the user, which principle 7.1 forbids. */
    freshnessNeedsReview: freshness.needsReview,
    upkeepResting,
    dailyQueue: 'Today',
    streak: 'Days in a row',
  },

  /**
   * **The four freshness states, keyed by the token label.** Design-tokens 4.
   *
   * A `Freshness` value from `src/progress/` indexes this straight, so no
   * component ever holds its own mapping from a state to a word and the four
   * cannot come to be worded differently on two screens.
   *
   * The star is the only thing that draws freshness (design-tokens 4: "Nothing
   * else encodes freshness. No numbers, no bars, no percentages"). These are its
   * name, not a second measure of it: scope 11.5 supplies them precisely so that
   * the states can be said, and scope 11.3 requires the current one to be named
   * in words on the passage detail view.
   */
  freshness,

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
     * **The door to the milestone.** Scope 9.5, decision D9.1, Safa's call.
     *
     * A section of the Memorise tab that exists only when a passage qualifies,
     * which is once the app has shown the reader every one of its lines. On
     * every other morning the tab holds exactly what it held before, which is
     * the thing decision D8.1 was protecting when it refused a second door.
     *
     * The invitation stands until it is taken. It is never a prompt at the end
     * of a session and it never asks twice, because scope 9.5 says the milestone
     * is deliberately attempted and an attempt the app chose the moment for is
     * not deliberate.
     */
    reciteSection: 'FROM MEMORY',
    /**
     * What a row in that section holds, where a row of today's queue would carry
     * a count of lines. The whole passage is not a number of lines, and saying
     * "8 LINES" of a thing you are about to recite in one breath would be the
     * wrong unit.
     */
    wholePassage: 'THE WHOLE PASSAGE',

    /**
     * What is said on returning from a recital, on the tab it returns to.
     *
     * All four are statements of what happened to the passage. **None of them
     * congratulates**: principle 7.1 forbids the arcade, principle 7.5 forbids
     * encouragement built out of scripture, and scope 9.6 makes the reader's own
     * rating the only judgement in the product, so a second one here would be
     * the app marking work it has already said it does not mark.
     *
     * The milestone is marked by the screen it happens on (decision D9.2), not
     * by a word afterwards.
     */
    milestoneReached: 'Memorised. It comes round as a whole passage now.',
    milestoneScheduled: 'It will come round again in its own time.',
    milestoneDemoted: 'Back to its lines for a while.',
    milestoneUnchanged: 'Its lines carry on as they were.',

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

    /**
     * **The streak.** Scope 11.4, and scope 11.5's own words for it: "Days in a
     * row".
     *
     * One quiet line at the top of the tab, in the same italic the focus line
     * uses. A sentence the app says, not a banner it puts up, and nothing beside
     * it: no flame, no best-ever, no count of what would be lost.
     *
     * **Nothing is said at nought.** A reader who has not started, or whose
     * streak has just gone, is told nothing rather than told a zero. Scope 11.4
     * forbids a notification about a streak at risk and principle 7.1 forbids
     * anything that makes a quiet day feel like a failure; a nought on the
     * screen every morning is the same thing said more slowly.
     */
    streakLine: (days: number) =>
      days === 1 ? '1 day in a row.' : `${String(days)} days in a row.`,

    /**
     * **The section that holds every passage on the list, with its star.**
     * Scope 11.1's "progress per passage", decision D11.1, Safa's call.
     *
     * Session 7 removed a roll call of the same passages from this tab and said
     * why (decision D7.3): two screens listing the same prayers one tap apart.
     * This is not that. My list is where the list is arranged and things are
     * taken off it; this is where the reader is told how each one is going, and
     * it is the only place a passage that has nothing due today appears at all.
     *
     * Drawn only when there is something on the list, so a new reader's tab is
     * exactly the tab they had before.
     */
    knownSection: 'WHAT YOU KNOW',
  },

  /**
   * **The passage detail view.** Scope 11.3.
   *
   * > The honest answer to "how well do I know this, and am I done?"
   *
   * Five facts and no sixth. **No percentages of any kind** (scope 11.2): with
   * nothing auto-graded, a percentage would be built out of the reader's own
   * self-ratings, and a reader protecting a number starts rating themselves
   * generously, which corrupts the only input the scheduler has. Nothing here
   * scores, ranks or congratulates.
   *
   * Every sentence states something that happened or is true now. The one about
   * lapses says what a lapse actually is - a line went back to the beginning
   * (decision D1.5) - rather than using the word, because "lapse" is the same
   * judgement scope 11.5 deleted from the freshness states.
   */
  progress: {
    /** The current state, above everything else. Scope 11.3's first item. */
    freshnessSection: 'HOW IT IS GOING',
    /** Scope 11.3's last item: how many lines sit at each state. */
    linesSection: 'ITS LINES',
    /** The three remaining facts, said as sentences rather than as figures. */
    historySection: 'WHAT HAS HAPPENED',

    /**
     * Scope 11.3: "Longest interval reached, stated plainly." The scope's own
     * example is "you last recalled this after 3 weeks"; this says the same
     * thing about the state the column actually holds, which is the interval
     * reached rather than one already elapsed.
     */
    longestInterval: (span: string) => `Its longest interval so far is ${span}.`,
    noInterval: 'It has not settled into an interval yet.',

    /**
     * Scope 11.3's lapse count, said as what it is. A line goes back to a one
     * day interval and walks the steps again (decision D1.5), which is a fact
     * about the schedule and not a mark against the reader.
     */
    lapses: (count: number) =>
      count === 1
        ? 'Once, a line has gone back to the beginning.'
        : `${String(count)} times, a line has gone back to the beginning.`,
    noLapses: 'No line has gone back to the beginning.',

    /** Scope 11.3's "milestone date, if reached". Kept through a demotion (D9.5). */
    milestoneOn: (day: string) => `You recited the whole of this from memory on ${day}.`,
    /**
     * A passage that comes round as a whole right now (scope 8.7). Its lines are
     * retained and not surfaced, so the breakdown above is not drawn for it and
     * this stands in place of it.
     */
    comesRoundWhole: 'It comes round as one whole passage now.',
    /** A passage that reached the milestone and has since been demoted (D9.5). */
    backOnItsLines: 'It is back on its lines for now.',

    /** The door down to scope 8.5 and 8.6, which this screen reports and never sets. */
    upkeepRow: 'How often it comes round',
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
     * **Levels 5 and 6.** Scope 9.1: recite, reveal, self-rate.
     *
     * Level 5 leaves the first letter of each word standing and level 6 leaves
     * nothing, and the sentence says which without making it sound like a step
     * up or a step down. There is no "you should know this by now" anywhere in
     * the product and this is the rung where one would be easiest to write.
     *
     * "Aloud or in your head" is there because it is the only instruction the
     * app can honestly give: scope 9.2 removed typed input entirely, so nothing
     * is entered, checked or graded, and a reader who does not know that will
     * sit waiting for a box to appear.
     */
    reciteScaffold: 'Recite it from memory. The first letter of each word is there to help.',
    reciteFree: 'Recite it from memory, aloud or in your head.',
    /**
     * The pinned button at levels 5 and 6. Scope 9.4 makes this reveal
     * **progressive, segment by segment**, so it is tapped once per line and
     * says which line it is about to show rather than "reveal".
     */
    showNextLine: 'SHOW THE NEXT LINE',
    /** Every line shown. The same shape as level 4's, and just as unjudging. */
    reciteRevealed: 'This is what it says.',
    /** A line still hidden, for anyone who cannot see that it is. */
    hiddenLine: 'hidden line',

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
   * **The milestone screen.** Scope 9.5.
   *
   * > First five words or so visible, so you know which passage you are
   * > reciting. Everything else hidden. Recite from memory. Reveal. Self-rate.
   *
   * **It reveals all at once**, unlike levels 5 and 6 (scope 9.4): "the
   * milestone reveals in one movement because it is a single honest moment and a
   * staged reveal turns it into an exam."
   *
   * Three words are not here and each absence is deliberate. There is no
   * congratulation, because principle 7.5 forbids one built out of scripture and
   * principle 7.1 forbids the arcade. There is no count of anything, because
   * scope 9.6 auto-scores nothing and there is nothing to count. And there is no
   * word for what the reader has achieved, because the screen itself is what
   * says it (decision D9.2).
   */
  milestone: {
    /**
     * The one sentence above the passage. It names the act and stops.
     *
     * "The whole of it" rather than "the whole passage" because the reader is
     * looking at the title of a specific prayer and the phrase should belong to
     * that prayer rather than to a category of thing.
     */
    recite: 'Recite the whole of it from memory.',
    /** The pinned button. One movement, so one tap, so one word for it. */
    reveal: 'SHOW THE PASSAGE',
    /** After it. A statement about the text, never about the reader. */
    revealed: 'This is the whole of it.',
    /**
     * What a screen reader is told stands in for the hidden remainder, which is
     * drawn as a run of hairline rules and is otherwise silent.
     */
    hidden: 'The rest of the passage is hidden.',
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

  /**
   * **The Ruhi route.** Scope 5, decision D1.10.
   *
   * Every word here is either the curriculum's own or one the app already uses.
   * Nothing on these screens says anything about how the reader is going: a book
   * of quotations is a reading surface, and principle 7.6's reasoning applies to
   * it even though the folder wall does not.
   */
  ruhi: {
    /** The door at the foot of the Memorise tab, and the title of the screen it opens. */
    door: ruhiBooks,
    bookLabel: (number: number) => `BOOK ${String(number)}`,
    unitLabel: (number: number) => `UNIT ${String(number)}`,
    quotationCount,
    designations: ruhiDesignations,
    designationsCaps: ruhiDesignationsCaps,

    /**
     * Where a quotation sits, said in one line. Scope 5.4: "every quotation
     * shows its source work and its Ruhi reference together."
     *
     * `within` is whatever names the level below the unit, and it is a string
     * rather than a number because Book 3's twenty four lessons are named
     * "Lesson 1" and are not sections. On a search result and on a quotation it
     * is the section; on a section's own screen, where the section is already
     * the title in the header, it is the unit's name instead.
     */
    reference: (book: number, unit: number, within: string) =>
      `BOOK ${String(book)} · UNIT ${String(unit)} · ${within.toLocaleUpperCase('en-AU')}`,

    /**
     * Scope 5.2: the mapping carries the Ruhi edition it was built against, and
     * that edition is meant to be visible. The credits screen of scope 4.3 is
     * `[v1.0]`, so until it exists the edition sits quietly at the foot of the
     * book it belongs to, where somebody comparing the app against a printed
     * book would look for it.
     */
    edition: (edition: string) => `Mapped against Ruhi edition ${edition}.`,

    /** The search field of scope 5.4, which searches the mapping and nothing else. */
    searchPlaceholder: 'Search the Ruhi quotations',
    searchLabel: 'Search the Ruhi quotations',
    searchNothing: 'Nothing in the three books matches that.',
    searchCount: (count: number) =>
      count === 1 ? '1 QUOTATION FOUND' : `${String(count)} QUOTATIONS FOUND`,

    /** The filter of scope 5.4, drawn only where a section holds both categories. */
    filterLabel: 'SHOW',
    filterAll: 'ALL',

    /**
     * The two ways onto the list. One quotation goes through the confirm screen
     * of scope 8.4; a whole section takes the app's proposal and says how many
     * lines that is, which is the same number the confirm screen states.
     */
    addOne: 'ADD TO MY LIST',
    addOneAlready: 'ALREADY ON YOUR LIST',
    addSection: (lines: number) =>
      lines === 1 ? 'ADD THIS SECTION · 1 LINE' : `ADD THIS SECTION · ${String(lines)} LINES`,
    /**
     * What is said afterwards, on the screen the reader is left on (D4.10's
     * shape). It states what changed and nothing else: no encouragement, and no
     * count of what is left to do.
     */
    added: (count: number) =>
      count === 1 ? 'One quotation added to your list' : `${String(count)} added to your list`,
    addedNone: 'They are all on your list already',

    /** An id that is not in the mapping: a hand-typed address, or an old link. */
    missing: 'That quotation is not in the mapping.',
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
    /** The lines of a recital, at levels 5 and 6 and on the milestone screen. */
    reciteLines: 'The lines to recite',
    /**
     * What is announced in place of a first-letter scaffold.
     *
     * A scaffold is a visual mnemonic: "R n, O L," read aloud is noise, and a
     * screen reader given the letters would either spell them out one by one or
     * run them together into a word that is not one. So the region says what is
     * drawn on the screen, and the recital itself is the one level 6 asks for.
     * See decision D9.4.
     */
    scaffoldLine: 'The first letter of each word of this line.',
    /** The section of the Memorise tab that offers a whole passage (D9.1). */
    reciteList: 'Passages you can recite from memory',
    /** A row of it, where the trailing caps label alone would not say what of. */
    reciteRow: (title: string) => `${title}, the whole passage`,
    /** The two ordered screens of scope 6.5 and 6.7. */
    bookmarkList: 'Bookmarks',
    myList,
    /** The three rows of controls above the bookmarks (decision D7.2). */
    sortOptions: 'Sort bookmarks',
    collectionFilter: 'Filter by collection',
    authorFilter: 'Filter by author',
    /** The three upkeep states, which are one choice rather than three switches. */
    upkeepOptions: 'How often this passage comes round',
    /**
     * The section of the Memorise tab that holds every passage with its star
     * (scope 11.1, decision D11.1), and a row of it.
     *
     * The row's name carries the freshness word because the star itself is
     * `aria-hidden`: it is a drawing of a state whose name is already printed
     * beside it, and announcing both would say everything twice.
     */
    knownList: 'How each passage is going',
    knownRow: (title: string, state: string) => `${title}, ${state.toLowerCase()}`,
    /** The four lists of the Ruhi route (scope 5.4). */
    ruhiBookList: 'Ruhi books',
    ruhiUnitList: 'Units',
    ruhiSectionList: 'Sections',
    ruhiQuotationList: 'Quotations',
    ruhiSearchResults: 'Quotations that match',
    /**
     * A quotation row, where the title is a truncation of the quotation's own
     * opening and the caps line beside it is its category.
     */
    ruhiQuotationRow: (title: string, designation: string) =>
      `${title}, ${designation.toLowerCase()}`,
    /** The filter of scope 5.4, which is one choice out of three. */
    ruhiFilter: 'Show which quotations',
    /** How many lines of a passage sit at each state. Scope 11.3. */
    lineStates: 'How many lines sit at each state',
    linesAtState: (state: string, lines: string) => `${state}, ${lines.toLowerCase()}`,
  },
} as const

export type Strings = typeof strings
