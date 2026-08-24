import { join, sep } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { label, lineOf, parse, sourceFilesUnder, SRC_DIR } from './sources'

/**
 * **Principle 7.11, as a failing build.** Decision D0.4.
 *
 * > Every user-facing string lives in one module. From the first commit. This is
 * > what makes deferring vocabulary decisions safe: a future tone pass is one
 * > file, not a hunt through forty components.
 *
 * Scope 11.5 defers the vocabulary deliberately, on the grounds that a strings
 * file is the cheapest thing in the product to change. That is only true while
 * every word is actually in it, and one hard-coded label in one component is
 * enough to make it quietly untrue.
 *
 * So this test parses every `.tsx` file outside `src/strings/` with TypeScript's
 * own parser and fails on two things.
 *
 * **Text between tags.** `<span>Days in a row</span>`, and its disguise
 * `<span>{'Days in a row'}</span>`.
 *
 * **User-facing attributes.** `aria-label="Back"` and its neighbours. A screen
 * reader announces those, so they are as user-facing as anything drawn, and
 * they are the most common way a string escapes the module unnoticed.
 *
 * `className`, `to`, `id` and the rest are untouched: they are not read by
 * anyone.
 */

const STRINGS_DIR = join(SRC_DIR, 'strings') + sep

/** Attributes a person reads or hears. Everything else is markup. */
const USER_FACING_ATTRIBUTES = new Set([
  'alt',
  'aria-description',
  'aria-label',
  'aria-placeholder',
  'aria-roledescription',
  'aria-valuetext',
  'placeholder',
  'title',
])

/**
 * Whitespace and the typographic marks that are punctuation rather than words.
 * A bare `·` or `—` between two expressions is layout, not vocabulary.
 */
function isNotText(value: string): boolean {
  return /^[\s·—–-]*$/.test(value)
}

function componentFiles(): string[] {
  return sourceFilesUnder(SRC_DIR, ['.tsx']).filter((path) => !path.startsWith(STRINGS_DIR))
}

interface Breach {
  readonly where: string
  readonly text: string
}

function breachesIn(path: string): Breach[] {
  const source = parse(path)
  const breaches: Breach[] = []

  const record = (node: ts.Node, text: string) => {
    breaches.push({ where: `${label(path)}:${String(lineOf(source, node))}`, text })
  }

  const visit = (node: ts.Node): void => {
    if (ts.isJsxText(node) && !isNotText(node.text)) {
      record(node, node.text.trim())
    }

    // `{'literal'}` sitting where text would sit.
    if (ts.isJsxExpression(node) && node.parent !== undefined && isJsxChildren(node.parent)) {
      const inner = node.expression
      if (
        inner !== undefined &&
        (ts.isStringLiteral(inner) || ts.isNoSubstitutionTemplateLiteral(inner)) &&
        !isNotText(inner.text)
      ) {
        record(node, inner.text)
      }
    }

    if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name)) {
      const attribute = node.name.text
      const initialiser = node.initializer
      if (
        USER_FACING_ATTRIBUTES.has(attribute) &&
        initialiser !== undefined &&
        ts.isStringLiteral(initialiser) &&
        !isNotText(initialiser.text)
      ) {
        record(node, `${attribute}="${initialiser.text}"`)
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(source)
  return breaches
}

function isJsxChildren(node: ts.Node): boolean {
  return ts.isJsxElement(node) || ts.isJsxFragment(node)
}

describe('principle 7.11 - every user-facing string lives in one module', () => {
  it('has components to check, so this suite cannot pass vacuously', () => {
    expect(componentFiles().length).toBeGreaterThan(3)
  })

  it('finds no literal text in any component', () => {
    const breaches = componentFiles().flatMap(breachesIn)
    const reported = breaches.map((breach) => `${breach.where}  ${JSON.stringify(breach.text)}`)

    if (reported.length > 0) {
      // The failure needs to name the file and the words, not just a count.
      console.error(
        `Principle 7.11: move these into src/strings/ and read them from there.\n` +
          reported.map((line) => `  ${line}`).join('\n'),
      )
    }

    expect(reported).toEqual([])
  })
})
