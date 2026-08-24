import 'fake-indexeddb/auto'

/**
 * Gives every test a working IndexedDB.
 *
 * `fake-indexeddb` is a complete implementation of the IndexedDB specification
 * that runs in Node, not a mock or a stub. Dexie is unmodified and unaware of
 * it: it opens a database, runs its schema, builds its indexes and enforces its
 * key constraints exactly as it does in a browser. So a data test that passes
 * here has genuinely round-tripped through a database, which is the only way to
 * catch the mistakes that matter in this layer, such as a compound index that
 * was declared in the wrong order.
 *
 * Importing it for the jsdom tests too is harmless: they simply never open a
 * database.
 */

/**
 * Gives every test a working `localStorage`.
 *
 * Node 22 defines a global `localStorage` of its own that stays `undefined`
 * unless the process is started with `--localstorage-file`, and that definition
 * shadows the one jsdom would otherwise install. So neither environment offers
 * one, and the anonymous user id of scope 13.1 lives in exactly that.
 *
 * Unlike IndexedDB, which gets a full implementation of the specification
 * because the mistakes worth catching there are index and transaction mistakes,
 * this is a plain string map. `localStorage` is a synchronous key-value store
 * with no indexes, no transactions and no schema, so there is nothing for a
 * heavier implementation to catch.
 */
const existing = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
// Inspected through its descriptor rather than read. Node's own definition is a
// getter that emits an experimental-feature warning on every access, once per
// test worker, and that noise would sit in the middle of every gate output.
const alreadyUsable = existing !== undefined && 'value' in existing && existing.value !== undefined

if (!alreadyUsable) {
  const entries = new Map<string, string>()
  const storage: Storage = {
    get length() {
      return entries.size
    },
    key: (index: number) => [...entries.keys()][index] ?? null,
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => void entries.set(key, String(value)),
    removeItem: (key: string) => void entries.delete(key),
    clear: () => void entries.clear(),
  }
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true })
}
