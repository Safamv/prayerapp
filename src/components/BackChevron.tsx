/**
 * The back chevron. Design-tokens 8.3, exactly: `polyline 15,5 8,12 15,19`,
 * stroke `accent`, width 1.6.
 *
 * Inline SVG rather than an icon file, because design-tokens 8.3 permits no
 * image assets at all: three inline paths are the whole icon set.
 */
export function BackChevron({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <polyline
        points="15,5 8,12 15,19"
        stroke="var(--accent)"
        strokeWidth={1.6}
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  )
}
