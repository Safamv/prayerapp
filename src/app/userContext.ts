import { createContext, useContext } from 'react'

/**
 * Who this device is (scope 13.1), handed down rather than fetched.
 *
 * `useBootstrap` resolves the anonymous id once and promises that no other part
 * of the app reaches for one, so that v1.0's real accounts are a change to those
 * few lines and to nothing else. A screen four levels down still needs the id to
 * bookmark something, and this is how it gets it without breaking that promise.
 *
 * There is no default: a screen rendered outside the provider throws a named
 * error rather than quietly writing bookmarks against an empty user id, which
 * would look like working software until someone signed in.
 */
export const UserContext = createContext<string | null>(null)

export function useUserId(): string {
  const userId = useContext(UserContext)
  if (userId === null) throw new Error('useUserId was called outside a UserProvider')
  return userId
}
