/**
 * Discover's routes, in one place.
 *
 * Three screens, pushed one on top of the other: the category browse, a
 * category's passage list, and a passage in full (scope 6.1, 6.5, 6.6). Written
 * as functions rather than as template literals at each call site so that a
 * screen cannot link to a path that does not exist, and so that changing the
 * shape of a URL is one edit.
 */
export const DISCOVER_PATH = '/discover'

export function categoryPath(tagId: string): string {
  return `${DISCOVER_PATH}/category/${encodeURIComponent(tagId)}`
}

export function passagePath(passageId: string): string {
  return `${DISCOVER_PATH}/passage/${encodeURIComponent(passageId)}`
}
