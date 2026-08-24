import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

/**
 * The scheduler wall.
 *
 * CLAUDE.md section 4 rule 5 and scope 8.2: nothing may be imported into
 * `src/scheduler/` beyond its own types. This is decision D0.3 - enforced by
 * tooling rather than by instruction, because the failure it prevents is
 * gradual rather than dramatic.
 *
 * Implemented with `no-restricted-syntax` rather than `no-restricted-imports`.
 * The latter matches import specifiers with gitignore semantics, in which a
 * negation cannot re-permit a relative path, so "block everything except
 * relative imports" is not expressible. See decision D1.2. `no-restricted-
 * imports` remains the right tool for the session 2 boundaries, which are
 * ordinary package and path prefixes.
 *
 * Anything not beginning with `./` is outside the folder. Anything containing
 * `..` is a way out of it. Dynamic import is blocked outright: a pure module
 * has no reason to load anything at runtime.
 */
const WALL =
  'src/scheduler/ must import nothing outside itself. It is a sealed module so it can be ' +
  'swapped for FSRS later (scope 8.2, CLAUDE.md 4.5, decision D0.3). If the scheduler needs ' +
  'a value, pass it in as an argument.'

const sourceHolders = ['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration']

/**
 * `esquery` terminates an attribute regex at the first `/`, so these patterns
 * deliberately contain none. "Does not begin with a dot" catches every bare
 * package specifier; "contains two dots" catches every way out of the folder.
 *
 * @param {string} outside regex source matching a specifier that is not permitted
 */
const wallRules = (outside) => [
  ...sourceHolders.map((node) => ({
    selector: `${node}[source.value=/${outside}/]`,
    message: WALL,
  })),
  ...sourceHolders.map((node) => ({
    selector: `${node}[source.value=/\\.\\./]`,
    message: WALL,
  })),
  { selector: 'ImportExpression', message: WALL },
]

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.browser },
    },
  },
  {
    files: ['**/*.js'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['vite.config.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['src/scheduler/**/*.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...wallRules('^[^.]')],
    },
  },
  {
    // Test files inside the wall need the test runner and nothing else.
    files: ['src/scheduler/**/*.test.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...wallRules('^(?!vitest$)[^.]')],
    },
  },
)
