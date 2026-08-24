import { newId } from './ids'

/**
 * The anonymous user id (scope 13.1).
 *
 * V0 has no account, no auth and no network. Every user-owned record still
 * carries a `user_id`, generated once on this device and reused forever after.
 * That is what makes v1.0's "signing in claims your anonymous id and turns on
 * sync" a claim rather than a migration.
 *
 * ## Why localStorage and not IndexedDB
 *
 * The id is the key that `user_settings` and `user_stats` are keyed *by*, so it
 * cannot live in a table keyed by itself, and scope section 10 has no table to
 * put it in. Inventing one would be inventing schema the scope does not have.
 * localStorage is cleared by exactly the same user action that clears
 * IndexedDB, so it survives precisely as long as the data it identifies.
 *
 * ## Why every data function takes it as an argument
 *
 * Nothing in `src/data/` calls `getOrCreateAnonymousUserId` itself. The app
 * resolves the id once at start-up and passes it down. When v1.0 replaces a
 * locally generated id with one from a real account, the swap is at that single
 * call site and no data function changes at all.
 */
export const ANONYMOUS_USER_ID_KEY = 'by-heart.anonymous-user-id'

/**
 * Returns this device's anonymous user id, creating and storing it on first run.
 *
 * If storage is unavailable (a private window with storage disabled, some
 * embedded browsers) this returns a fresh id each call rather than throwing.
 * The app then works for the session and forgets afterwards, which is a better
 * failure than a white screen on a device that cannot persist anything anyway.
 */
function readableStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    // Some embedded browsers throw on the property itself rather than returning
    // nothing, so reading it has to be guarded as well as using it.
    return null
  }
}

export function getOrCreateAnonymousUserId(): string {
  const store = readableStorage()
  if (store === null) return newId()

  const existing = store.getItem(ANONYMOUS_USER_ID_KEY)
  if (existing !== null && existing !== '') return existing

  const created = newId()
  try {
    store.setItem(ANONYMOUS_USER_ID_KEY, created)
  } catch {
    // Quota or a blocked write. The id is still usable for this session.
  }
  return created
}

/** Test-only. Forgets this device's id so the next call generates a new one. */
export function forgetAnonymousUserId(): void {
  try {
    globalThis.localStorage?.removeItem(ANONYMOUS_USER_ID_KEY)
  } catch {
    // Nothing stored, nothing to forget.
  }
}
