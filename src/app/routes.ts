/**
 * The app's routes, in one place.
 *
 * ## The shape of the browse
 *
 * ```
 * /discover                                          the four collections
 * /discover/collection/:collection                   its categories, or its passages
 * /discover/collection/:collection/category/:tagId   that category's passages
 * /discover/passage/:passageId                       the passage in full
 * /bookmarks                                         the places you have kept
 * /memorise                                          today's work, and the doors
 * /memorise/review/:passageId                        one prayer's lines, today
 * /memorise/recite/:passageId                        the whole passage, from memory
 * /memorise/list                                     what you intend to learn
 * /memorise/add/:passageId                           the lines, before adding it
 * /memorise/upkeep/:passageId                        how one passage comes round
 * /memorise/passage/:passageId                       how well you know one passage
 * /settings
 * ```
 *
 * **`/discover` keeps its name although the tab now reads DEVOTIONS.** The word
 * changed on screen and nowhere else (decision D7.1): "discover" is the name
 * principle 7.6's wall is written against, in `eslint.config.js` and in
 * `discover-isolation.test.ts`, both of which match on the folder path. Renaming
 * the folder to match a label would move the wall, and a wall that moves when a
 * word changes is not a wall.
 *
 * They live here rather than in a feature folder because the last one crosses
 * between two: the reading view is in Discover and the screen it opens is in
 * Memorise (decision D5.1). A path is a string with no data behind it, so one
 * module for all of them costs nothing and spares the two folders importing
 * each other.
 *
 * A category sits inside a collection rather than beside it, because that is
 * what the material is: every one of the 63 categories belongs to a prayer, so
 * "Healing" is a way of finding a prayer and not a way of finding a Hidden Word.
 * Putting the four collections first is what makes the other 503 passages
 * reachable at all - see decision D4.1, which is the reason this changed.
 *
 * The collection is carried in the path rather than inferred, so the back
 * chevron walks back up the way the reader came and a category URL says which
 * collection it was read in.
 *
 * Written as functions rather than as template literals at each call site so
 * that a screen cannot link to a path that does not exist, and so that changing
 * the shape of a URL is one edit.
 */
export const DISCOVER_PATH = '/discover'

export function collectionPath(collection: string): string {
  return `${DISCOVER_PATH}/collection/${encodeURIComponent(collection)}`
}

export function categoryPath(collection: string, tagId: string): string {
  return `${collectionPath(collection)}/category/${encodeURIComponent(tagId)}`
}

export function passagePath(passageId: string): string {
  return `${DISCOVER_PATH}/passage/${encodeURIComponent(passageId)}`
}

/**
 * Bookmarks, scope 6.7. A tab of its own rather than a screen inside Discover
 * (decision D7.1), so it is a top-level path.
 *
 * Its screens live under `src/features/discover/` all the same. The folder is
 * where principle 7.6 is a failing build rather than a paragraph, and a screen
 * full of passages that must never grow a freshness star belongs inside it.
 */
export const BOOKMARKS_PATH = '/bookmarks'

export const MEMORISE_PATH = '/memorise'

/**
 * My list, scope 6.5: the ordered list of what the user intends to memorise.
 *
 * Under `/memorise` because a list of things you have committed to learn is
 * memorisation by any reading, and principle 7.6 keeps that out of the prayer
 * book. It absorbed the roll call session 6 put on the Memorise tab, so every
 * row here still opens `upkeepPath`. See decision D7.3.
 */
export const MY_LIST_PATH = `${MEMORISE_PATH}/list`

export const SETTINGS_PATH = '/settings'

/**
 * The add moment of scope 8.4: the proposed lines, confirmed before the passage
 * goes on the list. Under `/memorise` because that is what it is - the first
 * screen of memorising something - and principle 7.6 keeps memorisation out of
 * Discover. See decision D5.1.
 */
export function addToListPath(passageId: string): string {
  return `${MEMORISE_PATH}/add/${encodeURIComponent(passageId)}`
}

/**
 * One prayer's work for today: its lines from the queue, one at a time, at
 * whichever rung of scope 9.1's ladder each has climbed to.
 *
 * A prayer rather than the whole day, because decision D8.1 makes the row on the
 * Memorise tab the door: you take on one prayer, finish it, and are back on the
 * tab with that row gone. The passage is in the path so the screen can be
 * reopened on the line it left off at, and so a restored tab lands somewhere
 * real.
 */
export function reviewPath(passageId: string): string {
  return `${MEMORISE_PATH}/review/${encodeURIComponent(passageId)}`
}

/**
 * **The milestone**: the whole passage, recited from memory. Scope 9.5.
 *
 * Reached two ways, and they are the two configurations scope 9.5 describes.
 * **Deliberately attempted**, from the FROM MEMORY section of the Memorise tab,
 * which is where a passage appears once the app has shown you every one of its
 * lines (decision D9.1, Safa's call). And **served by the queue**, once the
 * passage has been promoted and its whole-passage card comes round (scope 8.7),
 * when the row in today's work opens this instead of the line walk.
 *
 * A separate path from `reviewPath` rather than a mode of it, because they are
 * two different acts on two different screens: one walks the lines of a prayer
 * and the other asks for the whole of it in one breath.
 */
export function recitePath(passageId: string): string {
  return `${MEMORISE_PATH}/recite/${encodeURIComponent(passageId)}`
}

/**
 * How a passage comes round, and whether the user is driving at it: scope 8.5's
 * three upkeep states and scope 8.6's focus, for one passage.
 *
 * Under `/memorise` because both are memorisation state, which principle 7.6
 * keeps out of Discover entirely. It is reached from the UPKEEP section of the
 * Memorise tab, which is the roll call of what is on the list. See decision D6.3
 * for why the door is there and not on the list screen session 7 builds.
 */
export function upkeepPath(passageId: string): string {
  return `${MEMORISE_PATH}/upkeep/${encodeURIComponent(passageId)}`
}

/**
 * **The passage detail view.** Scope 11.3: "the honest answer to 'how well do I
 * know this, and am I done?'"
 *
 * Reached from the WHAT YOU KNOW section of the Memorise tab, which is the only
 * place every passage on the list appears whether or not it has work today
 * (decision D11.1, Safa's call).
 *
 * Under `/memorise` for the reason every other path here is: it is memorisation
 * state, and principle 7.6 keeps that out of the prayer book entirely. It is
 * deliberately not `passagePath`, which is the reading view in Discover: the two
 * are the same passage asked two different questions, and only one of them may
 * ever carry a freshness star.
 */
export function passageDetailPath(passageId: string): string {
  return `${MEMORISE_PATH}/passage/${encodeURIComponent(passageId)}`
}
