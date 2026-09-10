import { describe, expect, it } from 'vitest'
import { requiredFaces } from './fetch-fonts'
import { TYPEFACES, TYPE_SLOTS, type Typeface } from '../src/theme/typefaces'

/**
 * **The derivation that keeps the font pipeline honest.**
 *
 * CLAUDE.md section 9 says of the theme registry that "adding a theme is
 * appending an object". Session 13 is the session that found out whether that
 * was true, and the part that was not true was here: the fetch script kept its
 * own list of families beside the registry, so appending an option would have
 * produced a picker row that rendered in Georgia and nothing would have failed.
 *
 * `requiredFaces` computes the list instead, and `assertCatalogueCoversRegistry`
 * in the script stops the run if it cannot supply one of them. This tests the
 * computing half; `src/theme/fonts.test.ts` tests the result against what was
 * actually committed.
 *
 * Importing the script is safe: it only runs `main` when it is the process's
 * entry point, so nothing here touches the network.
 */

const key = (face: { family: string; weight: number; style: string }) =>
  `${face.family}|${String(face.weight)}|${face.style}`

describe('requiredFaces', () => {
  it('asks for all three slots of every option', () => {
    const required = new Set(requiredFaces(TYPEFACES).map(key))
    for (const typeface of TYPEFACES) {
      for (const name of TYPE_SLOTS) {
        expect(required.has(key(typeface[name])), `${typeface.id} ${name} is not asked for`).toBe(
          true,
        )
      }
    }
  })

  it('asks for the body family in italic, which design-tokens 2.2 gives the byline', () => {
    const required = new Set(requiredFaces(TYPEFACES).map(key))
    for (const typeface of TYPEFACES) {
      const italic = { ...typeface.body, style: 'italic' }
      expect(required.has(key(italic)), `${typeface.id} has no byline italic`).toBe(true)
    }
  })

  it('asks for each face once however many options share it', () => {
    // Cormorant is the body of four of the seven and the display of one. A
    // pipeline that fetched it five times would work and would be five times
    // the download.
    const faces = requiredFaces(TYPEFACES)
    expect(new Set(faces.map(key)).size).toBe(faces.length)
  })

  it('grows by exactly what a new option needs, and by nothing else', () => {
    // The property that matters: appending an object to the registry changes
    // this list, which is what makes the script's refusal to run a real guard
    // rather than a comment.
    const before = requiredFaces(TYPEFACES).length
    const invented = {
      ...TYPEFACES[0],
      id: 'invented',
      display: { family: 'A Face Nobody Has', weight: 400, style: 'normal' },
      body: { family: 'A Face Nobody Has', weight: 400, style: 'normal' },
      caps: { family: 'A Face Nobody Has', weight: 400, style: 'normal' },
    } as Typeface

    const after = requiredFaces([...TYPEFACES, invented])
    // One roman and one italic, and nothing else.
    expect(after.length).toBe(before + 2)
    expect(after.map(key)).toContain('A Face Nobody Has|400|normal')
    expect(after.map(key)).toContain('A Face Nobody Has|400|italic')
  })

  it('asks for nothing at all when there are no typefaces', () => {
    expect(requiredFaces([])).toEqual([])
  })
})
