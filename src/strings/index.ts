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
   * Read by screen readers and never drawn. They are user-facing all the same,
   * so they live here rather than in a component.
   */
  accessibility: {
    back: 'Back',
    primaryNavigation: 'Main',
  },
} as const

export type Strings = typeof strings
