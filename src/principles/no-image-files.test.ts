import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * **Design-tokens 8.3, as a failing build.** Decision D10.2.
 *
 * > No image or icon files. Every mark in the app is an inline SVG. The fleuron
 * > is a text glyph.
 *
 * Session 10 is the first session that had to put a bitmap anywhere, because iOS
 * reads a home screen icon as one and will not take an SVG. D10.2 records how
 * narrowly that exception is drawn: the icons are **generated during the build**
 * from design-tokens 4's star, so they exist in `dist/`, which is not committed,
 * and the repository still holds no image file at all.
 *
 * That distinction is the whole of the exception, and it is exactly the kind of
 * distinction that erodes. The next person needing an icon will reach for a file
 * in `public/`, and the reasoning that made this acceptable will not be in front
 * of them. So the rule is enforced rather than described.
 *
 * It reads the git index rather than the working tree deliberately: an
 * untracked scratch file is nobody's business, and `dist/` is where the four
 * PNGs are supposed to be.
 */

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|avif|bmp|ico|tiff?|svg)$/i

function committedFiles(): string[] {
  const root = join(import.meta.dirname, '..', '..')
  return execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
    .split('\n')
    .filter((line) => line.length > 0)
}

describe('design-tokens 8.3: the app contains no image or icon files', () => {
  it('commits no bitmap and no SVG file anywhere in the repository', () => {
    const images = committedFiles().filter((file) => IMAGE_EXTENSIONS.test(file))
    expect(
      images,
      'Every mark in the app is an inline SVG (design-tokens 8.3). The home screen ' +
        'icons are the one exception and they are generated into dist/ during the ' +
        'build, never committed. See decision D10.2 and scripts/lib/appIcon.ts.',
    ).toEqual([])
  })
})
