import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The scheduler's three structural guarantees, checked against the source text.
 *
 * This file deliberately lives outside `src/scheduler/`, because the module may
 * not import anything and therefore cannot check itself. It duplicates the
 * ESLint wall on purpose: prose does not survive forty turns (decision D0.4),
 * and neither does a lint rule somebody switches off to get a build green.
 */

const SCHEDULER_DIR = join(import.meta.dirname, 'scheduler')

/**
 * Comments are stripped before scanning. Without this, `dates.ts` fails its own
 * clock check for the comment explaining why it does not read the clock.
 */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ')
}

function sourceFiles(): { name: string; source: string }[] {
  return readdirSync(SCHEDULER_DIR, { recursive: true, encoding: 'utf8' })
    .filter((name) => name.endsWith('.ts'))
    .map((name) => ({
      name,
      source: withoutComments(readFileSync(join(SCHEDULER_DIR, name), 'utf8')),
    }))
}

/** Import and re-export specifiers, in source order. */
function specifiers(source: string): string[] {
  const pattern = /(?:^|\n)\s*(?:import|export)[^\n]*?from\s+['"]([^'"]+)['"]/g
  return [...source.matchAll(pattern)].map((match) => match[1] ?? '')
}

describe('the scheduler is sealed', () => {
  it('has source files to check, so this suite cannot pass vacuously', () => {
    const names = sourceFiles().map((file) => file.name)
    expect(names).toContain('index.ts')
    expect(names.length).toBeGreaterThan(6)
  })

  it('imports nothing from outside its own folder', () => {
    const escapes: string[] = []
    for (const file of sourceFiles()) {
      const permitted = file.name.endsWith('.test.ts') ? ['vitest'] : []
      for (const specifier of specifiers(file.source)) {
        const isLocal = specifier.startsWith('./') && !specifier.includes('..')
        if (!isLocal && !permitted.includes(specifier)) {
          escapes.push(`${file.name} imports ${specifier}`)
        }
      }
    }
    expect(escapes).toEqual([])
  })

  it('never reads the system clock, because today is always passed in', () => {
    const clockReads = [
      { pattern: /new\s+Date\s*\(\s*\)/, name: 'new Date()' },
      { pattern: /Date\s*\.\s*now\s*\(/, name: 'Date.now()' },
      { pattern: /performance\s*\.\s*now\s*\(/, name: 'performance.now()' },
    ]
    const found: string[] = []
    for (const file of sourceFiles()) {
      for (const { pattern, name } of clockReads) {
        if (pattern.test(file.source)) {
          found.push(`${file.name} calls ${name}`)
        }
      }
    }
    expect(found).toEqual([])
  })

  it('is deterministic, so the same state and rating always give the same date', () => {
    const found = sourceFiles()
      .filter((file) => /Math\s*\.\s*random\s*\(/.test(file.source))
      .map((file) => `${file.name} calls Math.random()`)
    expect(found).toEqual([])
  })
})
