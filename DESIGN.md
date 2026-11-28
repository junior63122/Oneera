# ONEERA — Design system

Source: audit of the app code on 28/11/2026 (`prototype/tools/designaudit.py`). The code contained **529 distinct colors** (247 of them in the interface, the rest being avatar and illustration palettes), **29 font sizes**, **33 corner radii**, **95 shadows** and about twenty spacing values. This file reduces them to the strict minimum.

**Rule:** any interface value not listed here is a bug and is replaced by the closest token.

**Out of scope, on purpose:** the colors that *depict* something — skin, hair and fabric of the avatars, map illustrations, portal sky. These are content, not interface.

## 1. Colors

Every text color has been measured against its background. The AA ratio is required: 4.5 for normal text, 3 for large text and interface components.

| Token | Value | Use | Contrast on white |
|---|---|---|---|
| `--pri` | `#4A67F5` | Main action, links, selected state | 4.62 ✅ (was `#4F6BF5`, 4.42 ❌) |
| `--pri-d` | `#3D5AFE` | Pressed state, start of the gradient | 5.13 ✅ |
| `--ink` | `#1C1F2A` | Text, dark surfaces (staff bar, toast) | 16.6 ✅ |
| `--ink2` | `#5B6075` | Secondary text | 6.22 ✅ |
| `--ink3` | `#696E81` | Tertiary text, captions | 4.64 on `--soft` ✅ |
| `--line` | `#E6E8F0` | Borders, dividers | — |
| `--soft` | `#F3F5FB` | Muted background (fields, insets, secondary cards) | — |
| `--card` | `#FFFFFF` | Cards, lists, sheets | — |
| `--ok` / `--ok-bg` | `#12863D` / `#E4F6EA` | Success, "open", "resolved" | 4.66 ✅ (was `#16A34A`, 3.3 ❌) |
| `--warn` / `--warn-bg` | `#A86500` / `#FFF1DC` | Warning, "busy" | 4.64 ✅ (was `#E58A00`, 2.64 ❌) |
| `--bad` / `--bad-bg` | `#E1292F` / `#FDECEC` | Danger, error, alert, red button | 4.61 ✅ (was `#E5484D`, 3.91 ❌) |
| `--vio` | `#8452F5` | Replay, informational category | 4.66 ✅ |

**5 grays only:** `--ink`, `--ink2`, `--ink3`, `--line`, `--soft`, plus white.

**Decorative colors** (map markers, density halos, charts) may keep the light shades `#E5484D`, `#E58A00` and `#16A34A`, never as text.

## 2. Typography

**Font:** Figtree (system fallback: SF Pro / Roboto).

**Weights:** 600 (labels), 700 (buttons, titles), 800 (large titles, figures). No other weight.

| Token | Size | Apple HIG equivalent | Use |
|---|---|---|---|
| `--fs-11` | 11 px | Caption 2 | Map labels, tab bar |
| `--fs-12` | 12 px | Caption 1 | Small mentions, pills |
| `--fs-13` | 13 px | Footnote | Secondary text, row subtitles |
| `--fs-15` | 15 px | Subheadline / Body | Row text, chips |
| `--fs-17` | 17 px | Body / Headline | Fields, buttons (16 → 17) |
| `--fs-20` | 20 px | Title 3 | Sheet titles (21 → 20) |
| `--fs-28` | 28 px | Title 1 | Screen titles |
| `--fs-34` | 34 px | Large Title | Large figures |

Hero figures (54, 86) are kept: they are illustrations, not text sizes.

Fields stay at 17 px or more so iOS does not zoom on focus.

## 3. Spacing

Scale **4 · 8 · 12 · 16 · 24 · 32**. Values 1 to 3 px (hairlines, fine adjustments) are allowed.

Sheet side margins are 16 px. Space between blocks is 12 px.

## 4. Corner radii

| Token | Value | Use |
|---|---|---|
| `--r-s` | 8 px | Small elements, thumbnails |
| `--r-m` | 12 px | Fields, small buttons, segmented controls |
| `--r-l` | 16 px | Cards, lists, main buttons |
| `--r-xl` | 24 px | Sheets (top), large panels |
| `--r-pill` | 999 px | Chips, pills, round buttons |

## 5. Shadows

| Token | Value | Use |
|---|---|---|
| `--sh-1` | `0 1px 2px rgba(20,30,60,.06)` | Cards on a light background |
| `--sh-2` | `0 4px 16px rgba(20,30,60,.12)` | Floating buttons, top bar, chips on the map |
| `--sh-3` | `0 -8px 30px rgba(20,30,60,.14)` | Sheets, toasts, modals |

## 6. Motion

| Token | Duration | Use |
|---|---|---|
| `--t-fast` | 150 ms | Press, toggle |
| `--t-base` | 250 ms | Appearance of a sheet, a toast, a page |
| `--t-slow` | 350 ms | Large transition (map, studio) |

- **Easing:** `cubic-bezier(.2,.9,.3,1)` (iOS-style deceleration).
- **Ambient animations** (portal fog, idle avatar, live pulse) are free, but are cut under `prefers-reduced-motion`.

## 7. Components: one definition, identical everywhere

| Component | Rule |
|---|---|
| Main button `.btn` | Height 52, radius 16, text 17 bold, gradient `--pri-d` → `--pri`. Variants: white, line, red, dark, sm (height 40, radius 12). |
| Card `.card` / list `.list` | White, radius 16, padding 16, shadow `--sh-1` |
| Row `.row` | Height ≥ 56, padding 12 / 16, title 15 semi-bold, subtitle 13 `--ink2` |
| Field `.inp` | Height 52, radius 12, 1.5 px `--line` border, focus `--pri`, text 17 |
| Sheet `.sheet` | Radius 24 at the top, handle, max height = screen − 56, close by handle, swipe down or tap outside |
| Chip `.chip` / pill `.pill` | Pill radius, text 13 to 15 |
| Touch target | 44 × 44 minimum (HIG) |

## 8. Required states for every screen

**Empty** (honest message plus action), **loading**, **error** (clear message plus retry), **success**, **very long content** (ellipsis, scrolling).

The visual regression reference is the set of captures in `docs/design/reference/`.
