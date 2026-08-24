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

/**
 * The Dexie wall. CLAUDE.md rule 4, decision D0.9.
 *
 * `src/data/` is the only place Dexie is imported. Everything else calls the
 * functions those modules export. This is what makes v1.0 sync one layer rather
 * than forty files, and it is the reason the rule is a build failure rather than
 * a review comment: the breach it prevents looks like ordinary correct work.
 */
const DEXIE_WALL =
  'Dexie is imported only inside src/data/ (CLAUDE.md 4.4, decision D0.9). Call a function ' +
  'from src/data/ instead. If the function you need does not exist yet, add it there.'

/**
 * The Discover wall. Principle 7.6, decisions D0.4 and D1.10.
 *
 * Nothing under src/features/discover/ may reach the scheduler, a progress
 * table, or the Ruhi route. The devotional half of the product is protected by
 * a failing build rather than by a paragraph somebody read forty turns ago.
 *
 * The companion test in src/principles/discover-isolation.test.ts checks the
 * same boundary against the source text, because a lint rule can be switched off
 * to get a build green and a test cannot be, quietly.
 */
const DISCOVER_WALL =
  'src/features/discover/ may not import the scheduler, a progress table, or the Ruhi route ' +
  '(principle 7.6, decisions D0.4 and D1.10). Discover shows no due counts, no streak, no ' +
  'freshness and no Ruhi quotation. Read through src/data/passages.ts, src/data/tags.ts or ' +
  'src/data/bookmarks.ts, none of which can return any of it.'

/**
 * Colour and font families. Design-tokens 8.4: both are build failures, not
 * review comments. A hex value in a component is a colour that will not follow
 * the palette; a font family in a component is a face that will not follow the
 * typeface.
 */
const COLOUR_WALL =
  'Raw colour values live only in src/theme/ (CLAUDE.md 4.1, design-tokens 8.4). Use a token: ' +
  'a Tailwind class such as bg-field, or var(--field) directly.'

const FAMILY_WALL =
  'Font families are never named outside src/theme/ (CLAUDE.md 4.2, design-tokens 8.4). Use a ' +
  'slot: typeStyle(role), or var(--family-display), var(--family-body), var(--family-caps).'

/** The ten families of design-tokens 8.1, which may be named in the registry and nowhere else. */
const FONT_FAMILIES = [
  'Italiana',
  'Cormorant',
  'Tangerine',
  'EB Garamond',
  'IM Fell English',
  'Goudy Bookletter 1911',
  'Cinzel Decorative',
  'Bodoni Moda',
  'Georgia',
  'Times New Roman',
]

const colourRules = [
  { selector: 'Literal[value=/#[0-9a-fA-F]{3}/]', message: COLOUR_WALL },
  { selector: 'TemplateElement[value.raw=/#[0-9a-fA-F]{3}/]', message: COLOUR_WALL },
  { selector: 'Literal[value=/rgba?[(]/]', message: COLOUR_WALL },
  { selector: 'TemplateElement[value.raw=/rgba?[(]/]', message: COLOUR_WALL },
  ...FONT_FAMILIES.map((family) => ({
    selector: `Literal[value=/${family}/]`,
    message: FAMILY_WALL,
  })),
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
      'no-restricted-syntax': ['error', ...wallRules('^[^.]'), ...colourRules],
    },
  },
  {
    // Test files inside the wall need the test runner and nothing else.
    files: ['src/scheduler/**/*.test.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...wallRules('^(?!vitest$)[^.]'), ...colourRules],
    },
  },
  {
    // The Dexie wall. Every file in src/ except src/data/ itself.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/data/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['dexie', 'dexie/*'], message: DEXIE_WALL }] },
      ],
    },
  },
  {
    // The Discover wall.
    files: ['src/features/discover/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'dexie',
                'dexie/*',
                '**/scheduler',
                '**/scheduler/*',
                '**/data/db',
                '**/data/ruhi',
                '**/data/userPrayers',
                '**/data/segmentProgress',
                '**/data/reviewLog',
                '**/data/userStats',
                '**/data/progressMapping',
              ],
              message: DISCOVER_WALL,
            },
          ],
        },
      ],
    },
  },
  {
    // Colour and font families. src/theme/ is the registry and is exempt;
    // src/principles/ holds the tests that police these rules and must be able
    // to name what they are looking for.
    files: ['src/**/*.{ts,tsx}'],
    // src/scheduler/ is excluded here because its own block above already
    // carries these rules alongside its import wall. A second block naming the
    // same rule for the same files would replace the wall rather than add to it.
    ignores: ['src/theme/**', 'src/principles/**', 'src/scheduler/**'],
    rules: {
      'no-restricted-syntax': ['error', ...colourRules],
    },
  },
)
