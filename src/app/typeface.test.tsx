// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { App } from './App'
import { resetDatabase } from '../data/db'
import { forgetCorpusLoad, rememberCorpusLoaded } from '../data/loadCorpus'
import { forgetThemeHint, readThemeHint } from '../data/themeHint'
import { forgetAnonymousUserId, getOrCreateAnonymousUserId } from '../data/userId'
import { getOrCreateUserSettings } from '../data/userSettings'
import { strings } from '../strings'
import {
  getTypeface,
  shippedTypefaces,
  TEXT_SCALE_MAX,
  TEXT_SCALE_MIN,
  TEXT_SCALE_STEPS,
} from '../theme'

/**
 * **Scope 12.3's typeface picker and scope 7.9's text size control**, driven
 * through the real app rather than rendered in isolation.
 *
 * The arithmetic is tested next door in `src/theme/`, over every role and every
 * face. **This file is about the four things only the whole app can be wrong
 * about.**
 *
 * **That choosing a face reaches every screen.** The point of the theme registry
 * is that a choice is one write to `document.documentElement` and the whole app
 * follows in CSS. A picker that changed only the picker would look identical in
 * a unit test.
 *
 * **That the choice survives being closed.** It is written to `user_settings`,
 * which is the source of truth, and mirrored into the hint the next launch
 * paints from before it can read a database.
 *
 * **That a face is offered only when its fonts exist**, which is design-tokens
 * 8.1 as behaviour rather than as a rule about a build script.
 *
 * **That the row shows a specimen and not a name.** Design-tokens 5.8 is the
 * whole design of the screen, and a row that read "Bodoni Moda" would pass every
 * other test in this file.
 */

beforeEach(async () => {
  forgetAnonymousUserId()
  forgetThemeHint()
  forgetCorpusLoad()
  await resetDatabase()
  rememberCorpusLoaded()
})

afterEach(cleanup)

function renderApp(at = '/settings') {
  return render(
    <MemoryRouter initialEntries={[at]}>
      <App />
    </MemoryRouter>,
  )
}

function userId(): string {
  return getOrCreateAnonymousUserId()
}

/** The seven rows of the picker, in the order the registry defines them. */
async function specimenRows(): Promise<HTMLElement[]> {
  const group = await screen.findByRole('radiogroup', { name: strings.settings.typefaceSection })
  return within(group).getAllByRole('radio')
}

describe('the typeface picker', () => {
  it('offers every option whose fonts are committed, and no other', async () => {
    renderApp()
    const rows = await specimenRows()
    expect(rows).toHaveLength(shippedTypefaces().length)
    expect(rows).toHaveLength(7)
  })

  it('writes each row in its own face rather than naming it', async () => {
    // Design-tokens 5.7: "the row renders its own sample in its own face, at
    // the sample size given in 5.8". The families come from the registry, so a
    // component never names one (CLAUDE.md rule 2).
    renderApp()
    const rows = await specimenRows()

    for (const [index, typeface] of shippedTypefaces().entries()) {
      const row = rows[index]
      const sample = within(row as HTMLElement).getByText(strings.settings.typefaceSpecimen)
      expect(sample.style.fontFamily).toContain(typeface.display.family)
      expect(sample.style.fontSize).toBe(`${String(typeface.specimenSize)}px`)
    }
  })

  it('says the same eight characters on every row, which is what makes it a comparison', async () => {
    renderApp()
    const rows = await specimenRows()
    const samples = await screen.findAllByText(strings.settings.typefaceSpecimen)
    expect(samples).toHaveLength(rows.length)
  })

  it('captions each row with the face and what it is, per design-tokens 5.8', async () => {
    // The caption is assembled from two modules (decision D13.3): the face's
    // own name from the registry, because a font family is named in src/theme/
    // and nowhere else, and the app's words about it from the strings module.
    // This test cannot write the names out for the same reason - the lint rule
    // that fires on a font family in a file outside the registry fires here
    // too, which is exactly what it is for.
    renderApp()
    const rows = await specimenRows()

    for (const [index, typeface] of shippedTypefaces().entries()) {
      const descriptor = strings.settings.typefaceDescriptors[typeface.id] ?? ''
      expect(descriptor, `${typeface.id} has no caption`).not.toBe('')
      const caption = within(rows[index] as HTMLElement).getByText(
        strings.settings.typefaceCaption(typeface.name, descriptor),
      )
      expect(caption.textContent).toContain(typeface.name)
      expect(caption.textContent).toContain(descriptor)
    }
  })

  it("describes each face in the tokens document's own words", () => {
    // Design-tokens 5.8's caption column, less the face name each begins with.
    // These are vocabulary rather than families, so they may be written out.
    expect(Object.values(strings.settings.typefaceDescriptors)).toEqual([
      'art nouveau',
      'a written hand',
      'carved',
      'the Paris hand',
      'Oxford metal',
      'letterpress',
      'neoclassical',
    ])
  })

  it('starts with the default option chosen, and moves the star when another is', async () => {
    renderApp()
    const rows = await specimenRows()

    expect(rows[0]?.getAttribute('aria-checked')).toBe('true')
    fireEvent.click(rows[6] as HTMLElement)

    await waitFor(() => {
      expect(rows[6]?.getAttribute('aria-checked')).toBe('true')
    })
    expect(rows[0]?.getAttribute('aria-checked')).toBe('false')
  })

  it('reaches every screen, because the choice is written onto the document', async () => {
    renderApp()
    const rows = await specimenRows()

    fireEvent.click(rows[6] as HTMLElement)

    await waitFor(() => {
      const family = document.documentElement.style.getPropertyValue('--family-display')
      expect(family).toContain(getTypeface('bodoni-moda').display.family)
    })
    // The role sizes follow too: 42px screen title times Bodoni's 0.74 scalar.
    expect(document.documentElement.style.getPropertyValue('--type-screen-title-size')).toBe(
      '31.08px',
    )
  })

  it('remembers the choice in user_settings, which is the source of truth', async () => {
    renderApp()
    const rows = await specimenRows()

    fireEvent.click(rows[1] as HTMLElement)

    await waitFor(async () => {
      expect((await getOrCreateUserSettings(userId())).typeface).toBe('tangerine')
    })
  })

  it('mirrors the choice into the hint the next launch paints from', async () => {
    // Decision D13.2. IndexedDB cannot be read before the first paint, so a
    // launch would otherwise show Italiana for a moment on six of the seven.
    renderApp()
    const rows = await specimenRows()

    fireEvent.click(rows[4] as HTMLElement)

    await waitFor(() => {
      expect(readThemeHint()?.typefaceId).toBe('im-fell-english')
    })
  })

  it('names the face for a screen reader, since every row reads the same aloud', async () => {
    renderApp()
    const rows = await specimenRows()
    expect(rows.map((row) => row.getAttribute('aria-label'))).toEqual(
      shippedTypefaces().map((typeface) => strings.settings.typefaceOption(typeface.name)),
    )
  })
})

describe('the text size control', () => {
  it('grows the app when the plus is pressed, and shrinks it when the minus is', async () => {
    renderApp()

    const larger = await screen.findByRole('button', { name: strings.settings.textSizeLarger })
    const smaller = screen.getByRole('button', { name: strings.settings.textSizeSmaller })

    const bodyAt = () =>
      Number(
        document.documentElement.style
          .getPropertyValue('--type-passage-body-size')
          .replace('px', ''),
      )

    const start = bodyAt()
    fireEvent.click(larger)
    await waitFor(() => {
      expect(bodyAt()).toBeGreaterThan(start)
    })

    fireEvent.click(smaller)
    await waitFor(() => {
      expect(bodyAt()).toBe(start)
    })
  })

  it('reaches both ends of the range and stops there', async () => {
    renderApp()

    const larger = await screen.findByRole('button', { name: strings.settings.textSizeLarger })
    for (let press = 0; press < TEXT_SCALE_STEPS.length + 2; press += 1) fireEvent.click(larger)

    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue('--text-scale')).toBe(
        String(TEXT_SCALE_MAX),
      )
    })
    expect((larger as HTMLButtonElement).disabled).toBe(true)

    const smaller = screen.getByRole('button', { name: strings.settings.textSizeSmaller })
    for (let press = 0; press < TEXT_SCALE_STEPS.length + 2; press += 1) fireEvent.click(smaller)

    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue('--text-scale')).toBe(
        String(TEXT_SCALE_MIN),
      )
    })
    expect((smaller as HTMLButtonElement).disabled).toBe(true)
  })

  it('remembers the size in user_settings and in the hint', async () => {
    renderApp()

    const larger = await screen.findByRole('button', { name: strings.settings.textSizeLarger })
    fireEvent.click(larger)

    await waitFor(async () => {
      expect((await getOrCreateUserSettings(userId())).text_size).toBe(TEXT_SCALE_STEPS[2])
    })
    expect(readThemeHint()?.textScale).toBe(TEXT_SCALE_STEPS[2])
  })

  it('tells a screen reader which of the six steps is selected', async () => {
    renderApp()
    expect(await screen.findByText(strings.settings.textSizeStep(2, 6))).toBeTruthy()
  })
})
