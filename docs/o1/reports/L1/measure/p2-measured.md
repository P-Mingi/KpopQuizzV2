# Audit 02 P2-1: risks 2, 7, 8, 9, measured (lab, public site, 2026-11-09)

No field data exists yet (P0-3 is behind a flag, off), so the baseline is a lab one: headless Chromium, 390x844 at 2x, CPU 4x slower,
network 1.6 Mbit/s with 150 ms latency, cache off, 5 runs per page, median. `/_vercel/*` aborted. Scripts and raw output are next to this file.

| Page | LCP / FCP (same element, text) | CLS |
|---|---|---|
| `/` | 2476 ms | 0.0448 (the quiz of the day note, see home-cls-results.txt) |
| `/q/are-you-a-real-coer` | 2516 ms | 0.0055 |
| `/blindtest` | 2604 ms | 0 |

## Risk 9, Inter preload: NOT applied (it measured worse)

The same pages with `<link rel="preload" as="font">` for `Inter_latin-s...woff2` injected into `<head>` (route interception, nothing sent
anywhere): `/` 2672 ms (+196), `/q/...` 3068 ms (+552), `/blindtest` 3092 ms (+488). On a slow link the font competes with the two render
blocking stylesheets, and LCP here is text, so it arrives later. This matches the comment in `app/layout.tsx` (Pretendard stopped being
preloaded for the same reason). Keep `preload: false`.

## Risk 2, render blocking CSS: measured, candidate prepared, NOT applied

CSS coverage over 8 templates (`/`, a quiz, `/blindtest`, `/quizzes`, `/groups`, `/leaderboard`, `/daily`, `/faq`) at 390 and 1440 (css-coverage.txt):

- the main Next chunk (globals.css plus Tailwind): 399,143 bytes (76,096 over the wire with brotli), rules used by any of the 16 loads: 2.1%;
- the UX v1 sheet `/api/ux-v1/a0/styles`: 229,172 bytes (43,702 over the wire), used by any load: 24.1%, at most 9% on one page.

Coverage only counts rules that match the DOM at that moment (no hover, dialog or other route), so it is an upper bound on waste, not a
list to delete. A static pass (`dead-css-candidate.cjs`) is safer: it removes only rules with a class that appears nowhere in `src/` or
`public/`, not even as the start of a dynamically built name. It finds 876 dead rules in `globals.css` (476,097 to 375,647 source bytes,
brotli 73,961 to 63,102, about 11 KB). I did not apply it: the gain is about 8% of the blocking CSS, the file is hot on 37 old branches,
class names that arrive in database content (articles, blocks) cannot be seen from the repo, and every page's stylesheet hash would
change. Owner decision: apply the script's output after a screenshot pass of all templates, or split `globals.css` by route group
(the real fix, a larger job).

## Risk 7, cover host check: done

`app/(site)/q/[slug]/ux-page.tsx` now falls back to the group photo when `cover_image_url` is on a host `next/image` refuses (the card
already did; before, the page threw while rendering). No change for a configured host, so the served HTML is unchanged.

## Risk 8, eager chrome and game: partly done

- `VerseFooter` is a `next/dynamic` chunk: pages that are not Verse routes no longer carry its code (still server-rendered on Verse routes).
- `BtGame` and `BtResults` are `next/dynamic` (client only) on the blind test hub, warmed on idle, so the hub chunk is smaller.
- NOT done: rendering the v11 footer on the server. `UxFooter` lives inside the client shell, chosen by pathname; moving it is a
  restructure of the shell for every page. Left as a follow-up.
