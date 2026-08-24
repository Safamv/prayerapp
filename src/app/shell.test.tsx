// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resetDatabase } from '../data/db'
import { forgetAnonymousUserId } from '../data/userId'
import { getOrCreateUserSettings } from '../data/userSettings'
import { strings } from '../strings'
import { getPalette } from '../theme'
import { App } from './App'

/**
 * The three-tab shell. Scope 3.1, design-tokens 5.6.
 *
 * The three screens are empty this session, so what is worth testing is the
 * shell itself: that the three tabs exist and route, that Settings shows the
 * build stamp a tester reads off their screen, that the anonymous user id and
 * settings row are created on first run, and that principle 7.6's ban on a
 * numeric badge holds.
 */

function renderApp(at = '/') {
  return render(
    <MemoryRouter initialEntries={[at]}>
      <App />
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  forgetAnonymousUserId()
  await resetDatabase()
})

afterEach(cleanup)

describe('the three-tab shell', () => {
  it('shows the three tabs of scope 3.1', async () => {
    renderApp()

    await waitFor(() => {
      expect(screen.getByText(strings.tabs.discover)).toBeDefined()
    })
    expect(screen.getByText(strings.tabs.memorise)).toBeDefined()
    expect(screen.getByText(strings.tabs.log)).toBeDefined()
  })

  it('opens on Discover, the devotional surface', async () => {
    renderApp()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: strings.screenTitles.discover })).toBeDefined()
    })
  })

  it('routes to each tab', async () => {
    for (const [path, title] of [
      ['/memorise', strings.screenTitles.memorise],
      ['/log', strings.screenTitles.log],
      ['/discover', strings.screenTitles.discover],
    ] as const) {
      cleanup()
      renderApp(path)
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: title })).toBeDefined()
      })
    }
  })

  it('sends an unknown route back to Discover rather than showing nothing', async () => {
    renderApp('/a-route-that-does-not-exist')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: strings.screenTitles.discover })).toBeDefined()
    })
  })

  it('keeps the tab bar through every route, including Settings', async () => {
    renderApp('/settings')

    await waitFor(() => {
      expect(screen.getByText(strings.tabs.discover)).toBeDefined()
    })
  })
})

describe('principle 7.6 - no memorisation chrome on the tab bar', () => {
  it('shows no number anywhere in the tab bar', async () => {
    renderApp()

    const nav = await waitFor(() => screen.getByRole('navigation'))
    // Design-tokens 5.6: no numeric badge on any tab. A "3 due today" met while
    // opening the app at a gathering turns worship into a chore reminder.
    expect(nav.textContent ?? '').not.toMatch(/\d/)
  })

  it('names the three tabs and nothing else', async () => {
    renderApp()

    const nav = await waitFor(() => screen.getByRole('navigation'))
    expect(nav.textContent).toBe(
      `${strings.tabs.discover}${strings.tabs.memorise}${strings.tabs.log}`,
    )
  })
})

describe('Settings', () => {
  it('shows the build stamp of CLAUDE.md section 8', async () => {
    renderApp('/settings')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: strings.screenTitles.settings })).toBeDefined()
    })
    // v0.N.0 · <short sha> · D Mon YYYY
    const stamp = screen.getByText(/^v\d+\.\d+\.\d+ · \S+ · /)
    expect(stamp.textContent).toBeTruthy()
  })

  it('is reachable from Log, which is the personal side of the app', async () => {
    renderApp('/log')

    const link = await waitFor(() => screen.getByRole('link', { name: strings.settings.open }))
    expect(link.getAttribute('href')).toBe('/settings')
  })
})

describe('first run', () => {
  it('creates the anonymous user id and its settings row', async () => {
    renderApp()

    await waitFor(() => {
      expect(localStorage.getItem('by-heart.anonymous-user-id')).not.toBeNull()
    })

    const userId = localStorage.getItem('by-heart.anonymous-user-id') ?? ''
    const settings = await getOrCreateUserSettings(userId)
    expect(settings.palette).toBe('paris-navy')
    expect(settings.typeface).toBe('italiana')
  })

  it('applies the theme to the document, so the shell is never unstyled', async () => {
    renderApp()

    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue('--field')).toBe(
        getPalette('paris-navy').tokens.field,
      )
    })
    expect(document.documentElement.style.getPropertyValue('--type-tab-label-size')).toBe('8.5px')
  })
})
