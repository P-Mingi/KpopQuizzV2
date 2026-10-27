# Theme tokens (o1-contract-v1)

Code: `UX_TOKEN_NAMES`, `UX_NEW_TOKEN_NAMES`, `UxTokenName`, `ThemeTokenName` and `SiteTheme` in
`apps/quiz/src/lib/site/types.ts`; the kpop values in `registry.ts`. Tests: `registry.test.ts` (kpop values equal
`styles/ux-v1/a0.css`), `contract.test.ts` (the name list equals the file; kpop sheets never read a site-only token;
the rules of every per-site sheet; F0's files add no rule to the kpop sheet Tailwind builds, section 2). Token names
are never extendable inside the run (BACKLOG 5.3); token values of anime and hub are (5.2).

Sources: BACKLOG 5.1 ("Theme token names"), lane cards B1, O1, H1; S 5.1 and 5.2 (Option A), 5.5 (fonts);
COLLISION-MAP 1.7 and row 18.

## 1. The frozen names

### 1.1 Existing names: every `--ux-*` name a0.css declares on its token blocks (75)

Token blocks are the rules whose every selector is `html.ux-v1`, `html.ux-v1.dark`, `html.ux-v1:not(.light)` (inside
the system dark media query), `.ux-theme-light` or `.ux-theme-dark`, in the A0 part and the v12 part of the file.
In file order:

| group | names (without `--ux-`) |
|---|---|
| grounds | `page`, `surface`, `surface-2`, `raised`, `paper`, `card-fill` |
| lines | `hair`, `line`, `line-2`, `edge`, `pink-line`, `input` |
| text | `ink`, `muted` |
| accent (anime orange and hub accent live here, so no kpop rule changes) | `pink`, `pink-fill`, `pink-fill-h`, `pink-ink`, `pink-soft`, `pink-soft-ink` |
| feedback | `ok`, `ok-soft`, `no`, `no-soft`, `warn`, `on-ok`, `knob-off` |
| glass, depth | `nav-bg`, `tabbar-bg`, `photo-edge`, `shadow-card`, `shadow-ov`, `scrim` |
| decorative grounds | `theme-band`, `qotd-bg`, `qotd-edge`, `bt-bg`, `lav-soft`, `lav-ink`, `hl`, `bulb`, `bulb-fill` |
| category accents | `acc-pink`, `acc-purple`, `acc-blue`, `acc-teal`, `acc-amber`, `acc-coral` |
| rarity | `rar-common`, `rar-uncommon`, `rar-rare`, `rar-epic`, `rar-legendary` |
| motion, layout, type | `ease`, `spring`, `wide`, `text`, `stage`, `gut`, `font` |
| v12 (inside the `@ux-v12` markers) | `lt-a`, `lt-b`, `lt-c`, `lt-d`, `th-hits26`, `th-hits25`, `th-gen5`, `th-gen4`, `th-viral`, `th-kpdh`, `th-title`, `th-ink`, `host-bg`, `good`, `good-soft` |

Not theme tokens: `--ux-rc`, `--ux-rar-ink` and `--ux-th`, which component rules set locally (`.ux-r-*`,
`.ux-th-*`); a site may override them only inside its own component rules.

BACKLOG's shorthand list maps onto these names: "card" is `card-fill`; "focus" is not a token (the focus ring of
`.ux-app :focus-visible` reads `--ux-pink`, section 4); `on-ok` already exists.

### 1.2 New names (4)

| name | meaning | declared where | kpop |
|---|---|---|---|
| `--ux-on-accent` | text and icons on `pink-fill` and `pink-fill-h` | a0.css light and dark blocks (B1), and each site sheet | `#FFFFFF` light and dark |
| `--ux-on-no` | text on a `no` fill | site sheets only | never declared |
| `--ux-accent2` | quiet second colour (anime indigo, hub neutral) | site sheets only | never declared |
| `--ux-font-display` | display face (headings, wordmark) | site sheets only, from `theme.fontDisplay` | never declared |

`--ux-on-ok` keeps its existing meaning (text on an `ok` fill). kpop also reads it for the key letter on a `no` fill
(`.p4-ans.is-no .p4-k`, `.p6-ans.is-no .p6-k`): a site keeps `on-ok` readable on its `no` fill, or overrides those two
rules to `var(--ux-on-no)` in its own sheet (the only shared-class rules a site sheet may write, with the focus ring
colour of section 6: rule 6 of 3.3).

## 2. kpop: one change, under parity

kpopquiz.org keeps every value. B1 makes exactly this CSS change, nothing else:

1. Declare `--ux-on-accent: #FFFFFF;` in the light block (`html.ux-v1, .ux-theme-light`), the dark block
   (`html.ux-v1.dark, .ux-theme-dark`) and the system dark block (`html.ux-v1:not(.light)`).
2. Replace the white literal by `var(--ux-on-accent)` in the rules that put text on `--ux-pink-fill`:
   `.ux-btn-primary`, `.ux-brand-mk`, `.ux-links a[aria-current="page"]`, `.ux-langsw > a[aria-current="page"],
   .ux-langsw > button[aria-pressed="true"]` (a0.css), `.p4-nextq .p4-go` (p4.css), `.p8-nextq .p8-go` (p8.css).
   Every other white literal (text on photos, live avatars, the story card, rarity chips) stays as it is.

Parity accepts this change through Q0a's normalisation N1 (the `?v=` hash differs, the served sheets are equal once
every white literal reads `var(--ux-on-accent)` and a white declaration of `--ux-on-accent` is dropped). Any other
kpop CSS byte is a parity failure. So:

- a0.css and every sheet of `styles/ux-v1/` and `styles/ux-v12/` never declare or read `--ux-on-no`, `--ux-accent2` or
  `--ux-font-display` (contract.test.ts);
- the registry's kpop theme lists only names a0.css declares, plus `on-accent` (registry.test.ts);
- `<html>` of a kpop page carries no `data-site` attribute (B1 renders it only when `SITE_ID !== 'kpop'`).
- One Tailwind build serves the three sites, and it scans every file under `apps/quiz/src` (`tailwind.config.ts`
  `content: ./src/**/*.{ts,tsx}`), tests and comments included: a word there that names a Tailwind utility puts that
  utility's rule in the kpop sheet, even when nothing renders it. So no file a lane of the run adds under `src`
  (anime and hub pages, blocks, type modules, tests) may name a utility the kpop tree does not already use; anime and
  hub styling lives in the site sheets (section 3). A frozen name that is also a utility is written so the scanner
  does not read it: the token `shadow-card` (`theme.boxShadow.card`) is a template literal in `types.ts`, found by
  the gate's parity on 25fa0a0 (CR-009, css-content). `contract.test.ts` proves F0's files add no rule (the sheet of
  every scanned file equals the sheet without them, with a planted proof); parity's css-content step proves it for
  every lane.

## 3. Anime and hub: the site sheet

### 3.1 Where the sheets live and how they ship

- `apps/quiz/src/styles/sites/<site>/tokens.css`: the site's token values (O1 for anime, H1 for hub).
- `apps/quiz/src/styles/sites/<site>/<lane>.css` (lane id in lower case, e.g. `o2.css`): one sheet per lane for the
  classes of the anime or hub blocks its TWINS rows list (A1 to A7, H1 to H4), named `<site>-<lane>-*`; never a rule on
  a class of `components/ux-v1/**` or of an area component (rule 18: a shared component that needs a difference gets
  a prop or a token from its owner). Only the lanes whose rows list a block get a sheet: O1 (`tokens.css`, A6, A7), O2
  (A1 to A4, A7), O3 (A5), O4 (A5 in create), O5 (A5 in name-all), O6 (A4), X1 (the A4 credit slot), H1
  (`tokens.css`, H1 to H4). ORCH assigns each file to its lane (request F0-2).
- B1's `buildUxStylesheet()` appends, on a build whose `SITE_ID` is `anime` or `hub` only, the files of
  `styles/sites/<SITE_ID>/` after the existing sheets: `tokens.css` first, then the others by file name. The kpop
  build reads nothing from `styles/sites/` (its bytes and its `?v=` hash stay today's).
- Non-kpop builds always run with `NEXT_PUBLIC_UX_V1=1` and `NEXT_PUBLIC_UX_V12=1` (flags-env.md 2): the new sites
  exist only on the UX v1 shell; the legacy `globals.css` tokens, `tailwind.config.ts` and `lib/design-tokens.ts`
  are not themed per site.

### 3.2 Selectors (frozen)

| theme | selector | specificity | beats |
|---|---|---|---|
| light | `html.ux-v1[data-site="<site>"]` | 0,2,1 | `html.ux-v1` (0,1,1), `.ux-theme-light` |
| dark, explicit class | `html.ux-v1.dark[data-site="<site>"]` | 0,3,1 | `html.ux-v1.dark` (0,2,1) |
| dark, system | `@media (prefers-color-scheme: dark) { html.ux-v1[data-site="<site>"]:not(.light) }` | 0,3,1 | `html.ux-v1:not(.light)` (0,2,1) |

The site light selector ties with kpop's dark selectors (0,2,1) and wins by source order (site sheets come last).
Hence the rule: **a site sheet that sets a name in one theme sets it in all three blocks**, else a dark page shows
the site's light value. `data-site` is set on `<html>` by B1's root layout, from `SITE_ID`, on non-kpop builds only.

### 3.3 Rules every site sheet follows (contract.test.ts checks 1 to 4 and 6, R checks 5)

1. Every selector of every rule starts with `html.ux-v1[data-site="<site>"]` or `html.ux-v1.dark[data-site="<site>"]`
   for the folder's own site, so a sheet can never style another site even if it were shipped there.
2. A declared `--ux-*` property is a frozen name (section 1). Local custom properties are named `--<site>-*`
   (`--anime-*`, `--hub-*`).
3. Allowed at-rules: `@media`, `@supports`, `@keyframes`. Never `@import` or `@font-face` (fonts come from
   `next/font`, section 5).
4. No dash characters (U+2013, U+2014) and no emoji, comments included (rule 10).
5. Component rules of a site use tokens, never a hex value that duplicates one (a new colour need is a token value,
   inside the frozen names).
6. Rule 18. After the site scope, a selector names only the lane's own block classes (`<site>-<lane>-*`, from the sheet's
   file name; `tokens.css` names none). The only rules a site sheet may write on a shared class are the token swaps
   this file lists, each setting one colour from a token: `.p4-ans.is-no .p4-k` and `.p6-ans.is-no .p6-k` (`color`,
   section 1.2), and `.ux-app :focus-visible` (`outline-color`, section 6). A rule on the bare scope (a token block)
   declares custom properties only. So a sheet cannot change the layout, spacing, type size, order or visibility of a
   shared component, and a planted fork of `.ux-panel`, `.ux-tabbar`, `.p1-home` or `.ux-btn-primary` fails the test.

## 4. Values

### 4.1 Where values live

The registry `theme.light` and `theme.dark` of a site are the source of truth; `tokens.css` declares the same values
(dark and system dark share `theme.dark`). O1 and H1 each add a unit test that compares their `tokens.css` with their
registry entry, as `registry.test.ts` does for kpop against a0.css. A value change is a 5.2 CR plus the contrast test.

### 4.2 Anime: Option A "Persimmon and Sumi" (S 5.2), proposed, pending G5

The registry stands in with the kpop values until O1 writes these (PLACEHOLDERS). Values per S 5.2; D0's prototype
(`design/o1-prototype/assets/tokens.css`) shows them; G5 may still move a value, never a name.

| name | light | dark |
|---|---|---|
| `page` | #F4F5F7 | #11131A |
| `surface` | #EAECF0 | #1A1D26 |
| `surface-2` | #E1E4E9 | #222632 |
| `raised`, `paper`, `card-fill` | #FFFFFF | #1A1D26 |
| `hair`, `line`, `edge` | #E4E6EB, #E2E4E9, #D9DCE2 | #2A2E3A, #272B36, #323746 |
| `input` | #85868F | #6E6D7A |
| `ink` | #1A1A22 | #F1F2F5 |
| `muted` | #5C5D6B | #A3A6B4 |
| `pink` (display accent: logo, large text, decoration; never small text) | #E2501C | #F47C3C |
| `pink-fill` | #C2410C | #F07A3A |
| `pink-fill-h` | #A3340A | #FF8A4C |
| `on-accent` | #FFFFFF | #11131A |
| `pink-ink` (links, small accent text) | #B4380A | #FF9A62 |
| `pink-soft`, `pink-soft-ink` | #FDEBDF, #9A2F08 | #3A2219, #FFB38A |
| `ok`, `on-ok` | #22703F, #FFFFFF | #4FC07F, #11131A |
| `no`, `on-no` | #B4233C, #FFFFFF | #FF6B81, #11131A |
| `warn` | #7C5A00 | #E3B341 |
| `accent2` | #2E3A78 | #AEB8FF |
| `lav-soft`, `lav-ink` (the soft form of `accent2`) | #E9EBF7, #2E3A78 | #23284A, #AEB8FF |

O1 sets every other colour token too (`line-2`, `pink-line`, `ok-soft`, `no-soft`, `knob-off`, the glass, scrim,
decorative grounds, category accents, the v12 grounds), from D0's frames: a kpop pink left on an anime page is a
review finding. Layout and motion tokens (`ease`, `spring`, `wide`, `text`, `stage`, `gut`) and `font` stay kpop's.

### 4.3 Hub: neutral theme (H1), proposed, pending G5

Values come from D0's hub frames (neutral greys, `accent2` and `lav-*` on the same neutral family) and land in
H1's registry entry and `tokens.css`. Font display: Inter (`theme.fontDisplay`).

## 5. Fonts

- Body and UI on every site: Inter through `--ux-font` (unchanged).
- `--ux-font-display` on anime: `var(--font-site-display), var(--ux-font)`, where `--font-site-display` is the
  `next/font/google` variable of M PLUS Rounded 1c (weights 700 and 800, Latin subset preloaded), loaded by B1's
  `lib/site/fonts.ts` on the anime build only. The name `--font-display` is taken by the legacy design and is not
  used. Hub: `--ux-font-display: var(--ux-font)`.
- Native titles (Japanese, Korean) use the system stack of S 5.5; no CJK webfont at launch.

## 6. Contrast (the pairs O1, H1 and D0 test, light and dark)

WCAG 2 ratios on the exact values. Text needs 4.5:1, large text (24 px, or 18.66 px bold) and UI parts need 3:1.

| foreground | on | minimum |
|---|---|---|
| `ink` | `page`, `surface`, `surface-2`, `raised`, `paper` | 4.5 |
| `muted` | `page`, `surface`, `surface-2`, `raised` | 4.5 |
| `pink-ink` | `page`, `surface`, `raised` | 4.5 |
| `pink-soft-ink` | `pink-soft` | 4.5 |
| `on-accent` | `pink-fill`, `pink-fill-h` | 4.5 |
| `on-ok` | `ok` (and `no` while kpop rules read it there) | 4.5 |
| `on-no` | `no` | 4.5 |
| `ok`, `no`, `warn` | `page`, `raised` | 4.5 |
| `lav-ink` | `lav-soft` | 4.5 |
| `accent2` (when it carries text) | `page`, `raised` | 4.5 |
| `pink` (display only) | `page`, `raised` | 3.0 |
| `pink` as the focus ring | `page`, `surface`, `raised` | 3.0 |
| `input` (field borders) | `raised`, `paper` | 3.0 |

The focus ring stays `outline: 2px solid var(--ux-pink)` on every site (Option A: 3.57 on the light page, above
3.0). A site that wants another ring colour overrides `.ux-app :focus-visible` in its sheet with an existing token
(`pink-fill` light, `pink-ink` dark, as S 5.2 suggests) through `outline-color` only (3.3 rule 6); there is no focus
token.

## 7. Outside the stylesheet

- `viewport.themeColor` is not a token: kpop keeps its literals (#FAF8F5, #141210); anime and hub use their `page`
  values (B1 wires it in the root layout).
- The kit panes (`.ux-theme-light`, `.ux-theme-dark`) belong to the kpop kit page and get no per-site selector.
- The D0 prototype may declare `on-no`, `accent2` and `font-display` on its kpop frames for convenience; production
  kpop CSS never does (section 2).


## Amendment D-120 (owner, 2026-10-26: OtakuQuiz orange, no blind test on OtakuQuiz)

These points supersede the lines they name above.

4. `docs/o1/contracts/tokens.md` section 4.2: the anime values are not Option A "Persimmon and Sumi" but the owner's order: only the accent family
   (`pink`, `pink-fill`, `pink-fill-h`, `pink-ink`, `pink-soft`, `pink-soft-ink`, `pink-line`) plus `qotd-bg`, `qotd-edge`, `bt-bg` and `hl` are orange;
   grounds, lines, feedback and the other names are kpop's. The table of the values is `ANIME_LIGHT` and `ANIME_DARK` of `lib/site/registry.ts`
   and `styles/sites/anime/tokens.css`; the contrast test is `lib/site/anime-orange.test.ts`.
7. `docs/o1/contracts/tokens.md` section 3.3, rule 6 (and the exemption list of `checkSiteSheet` in `lib/site/contract.test.ts`): a sheet of anime named
   `legacy.css` is allowed to repeat a shared selector under the anime scope, with colour properties only (colour, background, border, outline, shadow, fill,
   stroke, custom properties), and to set on the bare scope only the legacy custom properties of `LEGACY_VARS` in `lib/site/anime-legacy-pink.ts` (--brand and the
   others of `styles/globals.css`, which are not `--ux-*` names). Owner order of 2026-10-26 (no pink on otakuquiz.org). The file is generated from the shared
   sheets by that module and a test regenerates it and compares; planted cases in `contract.test.ts` prove that a layout property, an unscoped selector or a
   foreign custom property in it still fail. Every other sheet of every site keeps rule 6. Also `tokens.md` 1.1: the anime sheet now sets `acc-pink`, `lt-a`,
   `th-hits26`, `th-viral`, `th-kpdh` and `host-bg` (their kpop values carry a pink hue).
