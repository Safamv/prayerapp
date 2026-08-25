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
 * /memorise/add/:passageId                           the lines, before adding it
 * ```
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

export const MEMORISE_PATH = '/memorise'

/**
 * The add moment of scope 8.4: the proposed lines, confirmed before the passage
 * goes on the list. Under `/memorise` because that is what it is - the first
 * screen of memorising something - and principle 7.6 keeps memorisation out of
 * Discover. See decision D5.1.
 */
export function addToListPath(passageId: string): string {
  return `${MEMORISE_PATH}/add/${encodeURIComponent(passageId)}`
}
