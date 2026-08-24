# Design Tokens and Patterns
## By Heart — Bahá'í Prayer and Memorisation App

**Version:** 1.1
**Date:** 24 August 2026
**Supersedes:** `Handoff: Bahá'í Prayer Memorization — Library, Reader, Typeface settings`
**Repo path:** `/docs/design-tokens.md`
**Spelling:** Australian English throughout

---

## 0. What this document is, and what it is not

**This document owns:** colour, typography, spacing, iconography, motion, and the reusable
construction patterns those produce.

**This document does not own:** what screens exist, what they are called, what they contain, what
data they show, or when they ship. All of that is owned by `/docs/scope.md`. Where the two disagree,
**the scope wins**, without exception.

The source handoff conflated the two. It specified three screens with content, grouping,
information architecture and product scope embedded in the visual spec, and several of those
choices contradicted the scope directly. Those have been removed here and are listed in section 10
so the resolution is on record rather than silently applied.

### 0.1 The visual language, in one paragraph

A vintage printed book. Navy or oxblood cloth, old gold, bone paper. Art nouveau display type over
a Garamond-family body. Paper grain, ink bleed, letterpress. **No rounded corners, no gradients, no
shadows, no foil sheen.** Every departure from that is a mistake, not a variation.

---

## 1. Themes

Two palettes ship. The system must be **data driven from the first commit**: a registry of theme
objects keyed by id, one active at a time, read by a single provider. Adding an eleventh theme
should be appending an object, never editing a conditional.

Do not hard-code a colour anywhere in a component. Tokens only, via the provider. This is enforced
by lint.

### 1.1 Palette P1 — Paris Navy (default)

| Token | Value | Used for |
|-------|-------|----------|
| `field` | `#1F3A63` | Navy chrome: headers, primary button |
| `deep` | `#14243D` | Tab bar background; list-title ink on paper |
| `accent` | `#C9A961` | Old gold: display type on navy, active star, button label |
| `paper` | `#F2EAD8` | Bone paper background; icon fill on navy |
| `accent-dk` | `#8A6B2F` | Drop cap, active section headers |
| `accent-md` | `#A8873F` | Fleuron, second freshness state |
| `ink` | `#2A2419` | Passage body text |
| `ink-soft` | `#7A6A4F` | Byline italic |
| `label` | `#8C7A4E` | Reading-surface eyebrow |
| `faint` | `#A0906C` | Attribution and copyright |
| `grain-a` / `grain-b` | `rgba(90,70,40,.055)` / `rgba(90,70,40,.04)` | Paper grain dots |
| `sheen` / `sheen-d` | `rgba(255,255,255,.035)` / `rgba(0,0,0,.05)` | Navy cloth grain |
| `field-tint` | `rgba(242,234,216,.07)` | Search field fill on navy |
| `accent-90` / `-80` / `-34` | `rgba(201,169,97,.9/.8/.34)` | Eyebrow, search icon, search border |
| `on-field-66` / `-55` / `-45` | `rgba(242,234,216,.66/.55/.45)` | Text on navy: header label, placeholder, inactive tab |
| `rule` / `rule-md` / `rule-str` | `rgba(31,58,99,.13/.18/.28)` | Row divider / section rule / secondary button border |
| `on-paper-72` … `-36` | `rgba(20,36,61,.72/.6/.5/.44/.42/.4/.36)` | Ink alphas: dimmed titles, button label, sub-labels, attribution, inactive headers, counts |
| `hair` / `hair-lt` | `rgba(42,36,25,.26/.16)` | Twin rules on the reading surface |
| `ink-shadow` | `rgba(42,36,25,.35)` | 0.5px text-shadow on passage body (ink bleed) |

### 1.2 Palette P2 — Oxblood Cloth

Identical token names. Only these differ:

| Token | Value |
|-------|-------|
| `field` | `#5A1F22` |
| `deep` | `#3A1214` |
| `paper` | `#F5EFE2` |
| `ink` | `#2A1B18` |
| `ink-soft` | `#7A5A50` |
| `label` | `#8C6A56` |
| `faint` | `#A08878` |
| `grain-a` / `grain-b` | `rgba(105,60,55,.05/.035)` |
| `sheen` | `rgba(255,255,255,.04)` |
| `sheen-d` | `rgba(0,0,0,.06)` |
| `field-tint` | `rgba(245,239,226,.08)` |
| `accent-34` | `rgba(201,169,97,.36)` |
| `on-field-66/55/45` | `rgba(245,239,226,.66/.55/.45)` |
| `rule` / `rule-md` / `rule-str` | `rgba(90,31,34,.15/.2/.3)` |
| `on-paper-*` | `rgba(58,18,20, …)` at the same alphas as P1 |
| `hair` / `hair-lt` / `ink-shadow` | `rgba(42,27,24, …)` at the same alphas as P1 |

**`accent`, `accent-dk`, `accent-md`, `accent-90` and `accent-80` are identical in both palettes.**
The gold is constant. The cloth and the paper change.

---

## 2. Typography

### 2.1 The three slots

Every piece of text sits in one of three slots: **display**, **body**, or **caps**. A typeface
option supplies a family for each slot plus three optical scalars, so that all seven options sit at
the same apparent size when given the same nominal size.

| Option | Display | Body | Caps / labels | `ds` | `bs` | `cs` |
|--------|---------|------|---------------|------|------|------|
| **Italiana** (default) | Italiana 400 | Cormorant | Italiana | 1.0 | 1.0 | 1.0 |
| Tangerine | Tangerine 700 | EB Garamond | EB Garamond | 1.5 | 0.92 | 1.05 |
| Cormorant Unicase | Cormorant Unicase 600 | Cormorant | Cormorant Unicase | 0.68 | 1.0 | 1.05 |
| Cormorant italic | Cormorant 400 *italic* | Cormorant | Cormorant | 1.1 | 1.0 | 1.05 |
| IM Fell English | IM Fell English 400 | IM Fell English | IM Fell English SC | 0.8 | 0.92 | 1.12 |
| Goudy 1911 | Cinzel Decorative 400 | Goudy Bookletter 1911 | Cinzel Decorative | 0.62 | 0.95 | 0.88 |
| Bodoni Moda | Bodoni Moda 400 | Bodoni Moda | Bodoni Moda | 0.74 | 0.9 | 0.95 |

**V0 ships Italiana only.** All seven are defined in the registry from session 2; the picker UI and
the six additional font loads land in the first build after V0. This is a load-weight and
offline-integrity decision, not a design one, and it is fully reversible.

### 2.2 Base sizes

Computed size is **`base × opticalScalar × userTextScale`**, clamped per role. See 2.4.

| Role | Base | Slot | Tracking | Line-height |
|------|------|------|----------|-------------|
| Screen title | 42px | display | .01em | 1.02 |
| Reading-surface title | 40px | display | .01em | 1.04 |
| Settings title | 25px | display | .01em | — |
| Drop cap | 64px | display | — | 0.82 |
| Passage body | 20px | body | — | 1.58 |
| List row title | 20px | body | — | 1.25 |
| Byline italic | 16.5px | body italic | — | — |
| Search placeholder | 15.5px | body | — | — |
| Settings row label | 19px | body | — | — |
| Eyebrow (list screen) | 9.5px | caps | .28em | — |
| Eyebrow (reading surface) | 9.5px | caps | .3em | — |
| Section header | 9px | caps | .26em | — |
| Row attribution | 8.5px | caps | .16em | — |
| Tab label | 8.5px | caps | .18em | — |
| Attribution / copyright | 8.5px | caps | .16em | 1.9 |
| Primary button label | 10.5px | caps | .24em | — |
| Secondary button label | 9.5px | caps | .22em | — |
| Row caption (settings) | 13px | body (Cormorant) | — | — |

### 2.3 Typographic rules

- **All caps-slot text is written as uppercase literal strings.** Never `text-transform`. Tracking
  on transformed text renders inconsistently and screen readers announce it differently.
- Passage body uses `text-wrap: pretty`.
- Passage body carries the ink-bleed shadow. Nothing else does.

### 2.4 Text size and the scalar interaction

User text size is a required accessibility control (scope 7.9) with a genuinely large maximum. It
multiplies against the optical scalar, which means the extremes can collide: Tangerine's display
scalar of 1.5 against a large user scale would put a 42px title past 110px on a 390px viewport.

**Rules:**

1. `computed = base × opticalScalar × userTextScale`
2. Clamp per role, not globally. Display roles clamp harder than body roles, because body text is
   what the accessibility requirement actually exists to serve.
3. Body and passage text must reach the full range. Display type may be clipped first.
4. Every typeface option must be checked at both ends of the text size range before it ships.

---

## 3. Other tokens

- **Border radius: 0 everywhere.** No rounded corners, no pills, no capsules. This is printed-object
  logic and it is the single most load-bearing rule in the visual language.
- **Shadows: none**, with one exception, the primary button's letterpress highlight
  `0 1px 0 rgba(255,255,255,.5)`.
- **Paper grain**, two stacked dot layers:
  `radial-gradient(grain-a .5px, transparent .5px)` at `4px 4px`, offset `0 0`
  `radial-gradient(grain-b .5px, transparent .5px)` at `9px 9px`, offset `3px 2px`
- **Navy cloth grain**, two stacked dot layers:
  `radial-gradient(sheen .5px, transparent .5px)` at `4px 4px`
  `radial-gradient(sheen-d .5px, transparent .5px)` at `7px 7px`, offset `2px 3px`
- **Ink bleed**, passage body only: `text-shadow: 0 0 .5px ink-shadow`
- **Fleuron:** `❦` (U+2766), 15px, `accent-md`, centred
- **Reference viewport:** 390 × 844. Production screens scroll; the reference does not.

---

## 4. The freshness star

One nine-pointed star SVG, four states, expressed as fill plus opacity. **Nothing else encodes
freshness.** No numbers, no bars, no percentages.

| State | Token label | Fill | Opacity |
|-------|-------------|------|---------|
| Strong | `strong` | `accent` | 1 |
| Fading | `fading` | `accent-md` | .5 |
| Needs review | `needsReview` | `field` | .3 |
| Resting | `resting` | `field` | .16 |

Path, `viewBox="0 0 24 24"`:

```
12,2 13.44,8.05 18.43,4.34 15.64,9.9 21.85,10.26 16.14,12.73 20.66,17 14.7,15.22
15.42,21.4 12,16.2 8.58,21.4 9.3,15.22 3.34,17 7.86,12.73 2.15,10.26 8.36,9.9 5.57,4.34 10.56,8.05
```

**Two hard rules.**

**The third state is "Needs review", never "Lapsed."** Scope 11.5 deletes that word for its
resonance in a religious context and because it judges the user, which principle 7.1 forbids.

**The star never appears in Discover or in the reading view.** Principle 7.6 forbids all
memorisation chrome in the library, category lists, search results and reading view. The star is
memorisation chrome. It lives in Memorise and Log only. The same star glyph is used decoratively in
the tab bar, which is not a freshness usage and is fine.

---

## 5. Construction patterns

The source handoff specified three named screens. Those names carried an information architecture
that contradicts the scope, so the screens are described here as **patterns** instead. Every
measurement is preserved. What each screen contains is the scope's business.

### 5.1 Navy header

Background `field` plus cloth grain. Three variants:

| Variant | Padding | Contents |
|---|---|---|
| **Tall** | `52px 26px 24px` | Eyebrow (`accent-90`, margin-bottom 14px), 42px display title in `accent`, optional search field at margin-top 22px |
| **Compact with action** | `46px 22px 15px` | Flex row, gap 14px: 17px back chevron, centred flex-1 caps label in `on-field-66`, optional 17px trailing icon in `accent` |
| **Compact with title** | `46px 22px 22px` | Back chevron then 25px display title in `accent` |

Headers are fixed. Content scrolls beneath them.

### 5.2 Search field

Inside a tall header. Padding `9px 12px`, fill `field-tint`, 1px border `accent-34`, gap 10px.
13px magnifier icon (stroke `accent-80`, width 1.7, circle r6.5 at 10.5/10.5, line 15.4,15.4 to
20.5,20.5), then placeholder text in `on-field-55`.

### 5.3 List surface

Padding `0 26px`, background `paper` plus paper grain.

**Section header row:** `display:flex; align-items:baseline; gap:10px; padding:22px 0 12px`
(24px top for sections after the first). Caps label, then a 1px `rule-md` flex-1 rule, then a count
in `on-paper-40`.

**List row:** `display:flex; align-items:center; gap:13px; padding:11px 0`, 1px `rule` bottom
border, no border on the last row in a section. Optional 15px leading icon, then a 20px body title
in `deep`, with a secondary caps line 3px below in `on-paper-44`.

**Dimmed variant** for rows the user has not engaged with: title `on-paper-72`, secondary line
`on-paper-36`.

**Touch target: every row must measure at least 44px tall in production.** The reference measures
roughly 43px. That is a bug in the reference, not a spec.

### 5.4 Reading surface

Padding `34px 32px 0`, on paper plus grain, in this order:

1. Caps eyebrow in `label`, margin-bottom 16px
2. Display title, 40px, `ink`. May carry an authored line break; see 8.2
3. Byline, body italic 16.5px, `ink-soft`, margin-top 10px
4. Twin rules: 1px `hair` with margin `22px 0 3px`, then 1px `hair-lt` with margin-bottom 24px
5. Passage body, 20px body at 1.58, `ink`, ink-bleed shadow, `text-wrap: pretty`, with a floated
   display drop cap: 64px, line-height .82, padding `6px 10px 0 0`, `accent-dk`
6. Fleuron, centred, margin `26px 0`
7. Attribution block: two lines, caps 8.5px, `faint`, line-height 1.9. **Mandatory. See section 7.**

The body scrolls under the fixed header. Any pinned action buttons sit over it.

### 5.5 Buttons

Fixed to the bottom, padding `0 32px 30px`, stacked in a column with gap 11px.

**Primary:** fill `field`, 1px border `deep`, letterpress highlight
`inset 0 1px 0 rgba(255,255,255,.5)`, padding 15px, centred caps label in `accent`.

**Secondary:** transparent, 1px border `rule-str`, padding 13px, centred caps label in
`on-paper-60`.

### 5.6 Tab bar

Background `deep`, padding `15px 26px 26px`. Three 80px items, each a 15px icon above a caps label
with 6px gap.

**Active:** icon and label both `accent`.
**Inactive:** icon `paper` at .42 opacity, label `on-field-45`.

The tab bar is fixed and persists through the reading view. **No numeric badge on any tab.**
Principle 7.6 permits a small dot at most, and nothing is the safer default.

### 5.7 Settings row

Padding `13px 0`, 1px `rule` divider, `display:flex; align-items:center; gap:14px`.

**Specimen row** (typeface picker): the row renders its own sample in its own face, at the sample
size given in 5.8, colour `ink`, with a caption in body 13px `on-paper-50`. The selection star sits
right at 14px `accent`, and is **hidden rather than removed** when unselected so the row does not
reflow.

**Swatch row** (palette picker): a three-swatch strip of 16px squares, flush with no gap, the
lightest swatch carrying a 1px `rule-md` border so bone reads against paper. Then the name at 19px
body `deep`, caption 13px `on-paper-50` 2px below, then the selection star.

Section header inside a settings list: caps label in `on-paper-42` plus rule, `padding:18px 0 8px`.

Footer note: padding `0 26px 30px`, body italic 14px `on-paper-50`.

### 5.8 Typeface specimen sizes

Each specimen is set at the size that makes that face read at a comparable weight on the row.

| Face | Specimen size | Caption |
|---|---|---|
| Italiana | 25px | Italiana · art nouveau |
| Tangerine 700 | 38px, line-height .9 | Tangerine · a written hand |
| Cormorant Unicase 600 | 22px | Cormorant Unicase · carved |
| Cormorant italic | 30px | Cormorant italic · the Paris hand |
| IM Fell English | 26px | IM Fell English · Oxford metal |
| Cinzel Decorative | 18px, line-height 1.3 | Goudy 1911 · letterpress |
| Bodoni Moda | 23px | Bodoni Moda · neoclassical |

Specimen text is a fixed short phrase, colour `ink`.

---

## 6. Motion and touch

- **No hover states.** Touch first.
- **Pressed state:** a low-opacity `field` wash. No scale, no ripple, no bounce.
- **Transitions:** under 200ms, opacity and position only. No easing flourish.
- **Palette and typeface swaps are instant, never animated.**

---

## 7. Content rules

These are licence conditions and correct devotional practice, not decoration. They are visual
requirements because they constrain every layout that renders a passage.

1. **Every surface that shows a passage shows its attribution.** List rows, reading view, quiz
   screens, milestone screen, everywhere. No exceptions.
2. **The reading view also shows the copyright line.** The exact string is
   **`© BAHÁ'Í INTERNATIONAL COMMUNITY`**, not the publishing trust. See scope 4.3.
3. Sacred text is never used as reward or congratulation chrome (principle 7.5).

---

## 8. Implementation requirements

### 8.1 Fonts must be self-hosted

The source handoff loaded ten families from Google Fonts. **That is not acceptable here.** The app
is local-first and must work fully offline from first run with no runtime network calls
(scope 4.2, 12.2). A CDN font load fails offline and produces invisible or unstyled text.

Self-host, subset to Latin plus the diacritics the corpus actually uses (`á í ú ḥ Ḥ ṭ Ṭ ṣ ẓ ' '`),
`font-display: swap`, preload the active face only.

Families: Italiana, Cormorant, Cormorant Unicase, Tangerine, EB Garamond, IM Fell English,
IM Fell English SC, Goudy Bookletter 1911, Cinzel Decorative, Bodoni Moda.

### 8.2 The drop cap and authored line breaks

Two things the reference does that the data model does not yet support:

- The reading-surface title carries an **authored line break**. Corpus titles arrive as plain
  strings. This needs a `display_title` field on `passages`, or the break is dropped.
- The **drop cap** takes the first character of the passage. Corpus text may open with a quotation
  mark, a diacritic, or a non-Latin character. The drop cap logic needs a defined fallback.

Both are scope-side data model items, recorded here because the visual pattern depends on them.

### 8.3 Icons

**No image or icon files.** Every mark in the app is an inline SVG. The fleuron is a text glyph.

| Icon | Where | Drawing |
|---|---|---|
| Nine-pointed star | Freshness state (section 4) | Path in section 4 |
| Magnifier | Search field (section 5.2) | Section 5.2 |
| Back chevron | Any pushed screen | `polyline 15,5 8,12 15,19`, stroke `accent`, width 1.6 |
| Open book | Discover tab | Two page quadrilaterals rising from a centre gutter |
| Three ascending rules | Memorise tab | Cumulative line building (scope 8.1) |
| Shelf of volumes | Log tab | Three uprights, one leaning, on a baseline |

The three tab icons were added in session 2 at Safa's request; see decision D2.10. They are a first
pass, explicitly open to being redrawn, and nothing in the tab bar depends on which shapes they are.

**Common drawing rules.** Stroke 1.6, square caps, mitred joins, no fills, no rounded corners, no
shadows (section 3). Colour comes from `currentColor` so the container sets it from a token; no icon
names a colour.

### 8.4 Enforcement

- Raw hex and `rgb()` values are banned outside the token registry, enforced by lint.
- Font families are never named in components. Slot names only.
- Both are build failures, not review comments.

---

## 9. What was removed from the source handoff

For the record, so nobody restores it by accident.

| Removed | Reason |
|---|---|
| Screen scope table ("build only these three") | Scope v4.0 section 14 owns release scoping |
| All screen content and seed prayer data | Corpus comes from the fetch script |
| Library grouping by MEMORIZING / LEARNING / TO BEGIN | Memorisation chrome in Discover, breaches principle 7.6 |
| Freshness star on library rows | Same |
| Reader breadcrumb "MEMORIZING · DAY 6" | Same, and the reading view is named explicitly in 7.6 |
| Tab labels TODAY / LIBRARY / SETTINGS | Tabs are Discover / Memorise / Log, scope 3.1 |
| "LISTEN · 1 MIN" secondary button | Audio is not scheduled; it breaks the free tier, which is a product constraint |
| Freshness state "lapsed" | Renamed "Needs review", scope 11.5 |
| US spelling throughout | Australian English, scope 18.19 |
| "© BAHÁ'Í PUBLISHING TRUST" | Correct holder is the Bahá'í International Community, scope 4.3 |
| State table and `prayers[]` shape | Scope section 10 owns the data model |
| "Deferred, do not build" list | Scope section 14 owns this |
| Google Fonts CDN loading | Breaks offline-first, see 8.1 |

---

## 10. Change log

| Version | Date | Change |
|---|---|---|
| 1.0 | 23 Aug 2026 | Derived from the design handoff. Product scoping and information architecture removed, nine conflicts with scope v4.0 resolved in the scope's favour, screens converted to patterns, theming made registry-driven, fonts moved to self-hosted, text size interaction specified. |
| 1.1 | 24 Aug 2026 | Section 8.3: three tab icons added and the icon list turned into a table with common drawing rules. Requested by Safa in session 2, recorded as decision D2.10. No other section changed. |
