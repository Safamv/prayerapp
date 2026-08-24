// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider, type ThemeSelection } from './ThemeProvider'
import { useTheme } from './useTheme'

/**
 * The provider. Decision D0.8: the active theme writes its values onto a single
 * element as CSS custom properties, and components reference variable names.
 *
 * These tests read the variables straight off the element, because that is what
 * the browser reads and it is the only thing that proves the registry reached
 * the page at all.
 */

const NAVY: ThemeSelection = { paletteId: 'paris-navy', typefaceId: 'italiana', textScale: 1 }

afterEach(cleanup)

function Probe() {
  const { palette, typeface, textScale, setPaletteId, setTextScale } = useTheme()
  return (
    <div>
      <span data-testid="palette">{palette.id}</span>
      <span data-testid="typeface">{typeface.id}</span>
      <span data-testid="scale">{String(textScale)}</span>
      <button
        type="button"
        data-testid="to-oxblood"
        onClick={() => {
          setPaletteId('oxblood-cloth')
        }}
      />
      <button
        type="button"
        data-testid="to-large"
        onClick={() => {
          setTextScale(1.75)
        }}
      />
    </div>
  )
}

function renderWithTarget(initial: ThemeSelection, onChange?: (selection: ThemeSelection) => void) {
  const target = document.createElement('div')
  const props = onChange === undefined ? { initial, target } : { initial, target, onChange }
  render(
    <ThemeProvider {...props}>
      <Probe />
    </ThemeProvider>,
  )
  return target
}

/** The value of one CSS custom property, as the browser would read it. */
function variable(target: HTMLElement, name: string): string {
  return target.style.getPropertyValue(name)
}

describe('the theme provider', () => {
  it('writes the palette onto the element as CSS custom properties', () => {
    const target = renderWithTarget(NAVY)

    expect(variable(target, '--field')).toBe('#1F3A63')
    expect(variable(target, '--paper')).toBe('#F2EAD8')
    expect(variable(target, '--on-paper-72')).toBe('rgba(20,36,61,.72)')
  })

  it('writes the three slot families, so no component ever names one', () => {
    const target = renderWithTarget(NAVY)

    expect(variable(target, '--family-display')).toContain('Italiana')
    expect(variable(target, '--family-body')).toContain('Cormorant')
    expect(variable(target, '--family-caps')).toContain('Italiana')
  })

  it('writes the computed size and tracking for a role', () => {
    const target = renderWithTarget(NAVY)

    expect(variable(target, '--type-passage-body-size')).toBe('20px')
    expect(variable(target, '--type-tab-label-tracking')).toBe('.18em')
  })

  it('rewrites every colour when the palette changes', () => {
    const target = renderWithTarget(NAVY)

    fireEvent.click(screen.getByTestId('to-oxblood'))

    expect(variable(target, '--field')).toBe('#5A1F22')
    expect(variable(target, '--paper')).toBe('#F5EFE2')
    // The gold is constant across both palettes (design-tokens 1.2).
    expect(variable(target, '--accent')).toBe('#C9A961')
    expect(screen.getByTestId('palette').textContent).toBe('oxblood-cloth')
  })

  it('recomputes every size when the text scale changes', () => {
    const target = renderWithTarget(NAVY)

    fireEvent.click(screen.getByTestId('to-large'))

    // Body text reaches the full range: 20 x 1.75.
    expect(variable(target, '--type-passage-body-size')).toBe('35px')
    // Display type is clipped first: 42 x 1.25, not 42 x 1.75.
    expect(variable(target, '--type-screen-title-size')).toBe('52.5px')
  })

  it('reports a change so the caller can persist it, without knowing about the database', () => {
    const onChange = vi.fn()
    renderWithTarget(NAVY, onChange)

    fireEvent.click(screen.getByTestId('to-oxblood'))

    expect(onChange).toHaveBeenCalledWith({
      paletteId: 'oxblood-cloth',
      typefaceId: 'italiana',
      textScale: 1,
    })
  })

  it('clamps a stored text size that is out of range', () => {
    renderWithTarget({ ...NAVY, textScale: 99 })

    expect(screen.getByTestId('scale').textContent).toBe('1.75')
  })

  it('falls back to the defaults for a stored id that no longer exists', () => {
    // A stored setting can outlive the option it names, either because a [v0.1]
    // typeface was withdrawn or because a device carried a setting from a newer
    // version. A blank screen is the wrong answer to a stale preference.
    const target = renderWithTarget({ paletteId: 'gone', typefaceId: 'also-gone', textScale: 1 })

    expect(screen.getByTestId('palette').textContent).toBe('paris-navy')
    expect(screen.getByTestId('typeface').textContent).toBe('italiana')
    expect(variable(target, '--field')).toBe('#1F3A63')
  })
})

describe('useTheme outside a provider', () => {
  it('throws by name rather than losing every colour silently', () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      expect(() => render(<Probe />)).toThrow('useTheme was called outside a ThemeProvider')
    } finally {
      quiet.mockRestore()
    }
  })
})
