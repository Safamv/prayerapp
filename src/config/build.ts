/**
 * The build stamp Settings shows, in the format of CLAUDE.md section 8:
 *
 *     v0.2.0 · a3fa300 · 24 Aug 2026
 *
 * This is what a tester reads off their screen when reporting something, so it
 * has to be present from this session onward and it has to be true. The three
 * values are replaced literally at build time by the `define` block in
 * `vite.config.ts`; nothing is fetched and nothing is computed at runtime.
 */
declare const __APP_VERSION__: string
declare const __APP_COMMIT__: string
declare const __APP_BUILD_DATE__: string

/**
 * `typeof` on an undeclared name is safe in JavaScript and returns `'undefined'`,
 * so this reads correctly in any environment that has not had the substitution
 * applied rather than throwing a reference error.
 */
function injected(value: string | undefined, fallback: string): string {
  return value === undefined || value === '' ? fallback : value
}

export const BUILD_INFO = Object.freeze({
  version: injected(typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : undefined, '0.0.0'),
  commit: injected(typeof __APP_COMMIT__ === 'string' ? __APP_COMMIT__ : undefined, 'unknown'),
  buildDate: injected(
    typeof __APP_BUILD_DATE__ === 'string' ? __APP_BUILD_DATE__ : undefined,
    'unknown',
  ),
})

/** The single line rendered in Settings. The separator is U+00B7, a middle dot. */
export function buildStamp(): string {
  return `v${BUILD_INFO.version} · ${BUILD_INFO.commit} · ${BUILD_INFO.buildDate}`
}
