import { useEffect, useState } from 'react'

/**
 * Reads something from the database and re-renders when it arrives.
 *
 * Every screen that reads the database does the same thing: run one
 * asynchronous read, hold `undefined` until it lands, and drop the result if the
 * screen has moved on.
 *
 * It lives here rather than in a feature folder because two of them use it now:
 * Discover's four screens, and the confirm screen of session 5, which is on the
 * memorisation side. `userContext.ts` is beside it for the same reason.
 *
 * ## Why the dependency is a key rather than the function
 *
 * The reader is an inline arrow, so it is a new function on every render and
 * would re-run the query forever if it were the dependency. The caller passes
 * the identity of what it is reading instead - a tag id, a passage id - which is
 * the thing that actually decides whether the answer would differ.
 *
 * `undefined` means "still reading". A query with nothing to show returns an
 * empty array or `null`, so a screen can tell the two apart.
 */
export function useAsyncValue<T>(read: () => Promise<T>, key: string): T | undefined {
  const [value, setValue] = useState<T | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    setValue(undefined)

    void read().then(
      (result) => {
        if (!cancelled) setValue(result)
      },
      (error: unknown) => {
        // A failed read leaves the screen in its reading state rather than
        // rendering a half-built one. The console is where a tester's report
        // starts; there is no error surface in the app until the V0 exit review.
        console.error('A screen read failed', error)
      },
    )

    return () => {
      cancelled = true
    }
    // The dependency is the key, deliberately, not `read`. See the note above.
  }, [key])

  return value
}
