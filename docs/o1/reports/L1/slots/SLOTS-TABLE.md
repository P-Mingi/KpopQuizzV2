# Slots table: every image and icon slot -> page -> render (lane slots, o1/slots, 2026-11-10)

How it was proved: dev server of the hub build on this branch, the public reads answered by ORCH's stand-in (`slot-stub`: a fixture row per slot, a labelled picture per
file, every other read forwarded to o1-dev, writes refused). Scenarios (scripts in `tools/`): A = a row for every slot (icons as PNG), C = icons as the library's
star in bare ink (visibly different from every default), D = fallbacks only (`banner:otakudle`, `daily:mode-byseries`, `icon:o-by`), E = no row at all.
`verify.mjs` reads the live DOM (`img src`, `data-slot-icon`, `data-slot-mode`). Screenshots are in `img/` (`A-png-*`, `B-homepng-*`, `C-icon-*`, `C-homeicon-*`,
`D-fallback-*`, `E-none-*`). The admin sits behind a secret path and was never opened: `src/components/admin/photos/slots-panels.test.ts` renders the two panels
(react-dom/server) and checks every new slot is listed.

Verdicts: OK = already showed, proved. FIXED = did not show before this lane, wired and proved. NEW = new slot, proved. LOCAL GAP = no data in o1-dev to draw the row,
proved by a render test instead.

## Image slots (banner, card_image): 24 slots

| Slot key | Admin group | Page and place | Fixture saved | Page drew | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| banner:kpopdle | Bannières et images | /kpopdle, top banner | picture | `.hub-dle-banner img` = banner_kpopdle | OK | A-png-banner-kpopdle-1280 |
| banner:otakudle | idem | /otakudle, top banner (also the fallback of every series page) | picture | banner_otakudle; on the series pages with no banner of their own: banner_otakudle (scenario D) | OK | A-png-banner-otakudle-1280, D-fallback-banner-one-piece-1280 |
| banner:daily | idem | /daily, above the hero | picture | nothing before; now the figure above the hero | FIXED | A-png-banner-daily-1280 |
| banner:otakudle/one-piece | idem | /otakudle/one-piece, top banner | picture | banner_otakudle__one-piece | OK (now derived from lib/dle/series.ts) | A-png-banner-one-piece-1280 |
| banner:otakudle/dragon-ball | idem | /otakudle/dragon-ball, top banner | picture | banner_otakudle__dragon-ball | NEW | A-png-banner-dragon-ball-1280, D-fallback-banner-dragon-ball-1280 (fallback) |
| home:kpopdle | idem | hub home Today row Kpopdle (96 px) and /daily cover of the Kpopdle block | picture | home_kpopdle in both | OK | A-png-home-today-1280, A-png-daily-blocks-1280 |
| home:otakudle | idem | hub home Today row Otakudle and /daily cover of the Otakudle block | picture | home_otakudle in both | OK | same |
| home:site-k | idem | hub home, site card KpopQuiz | picture | home_site-k | OK | A-png-home-sites-1280 |
| home:site-a | idem | hub home, site card OtakuQuiz | picture | home_site-a | OK | A-png-home-sites-1280 |
| home:qotd-k | idem | hub home Today, K-pop quiz row | picture | home_qotd-k | OK | A-png-home-today-1280 |
| home:qotd-a | idem | hub home Today, anime quiz row | picture | row absent: o1-dev has no anime quiz of the day | LOCAL GAP (same code path as qotd-k; `home-today-icons.test.ts`, home-assets tests) | none |
| home:debate | idem | hub home Today, debate row | picture | home_debate | OK | A-png-home-today-1280 |
| home:cross-1 | idem | hub home, "When K-pop meets anime", tile 1 | picture | home_cross-1 | OK | A-png-home-crossover-1280 |
| home:cross-2 | idem | same, tile 2 | picture | home_cross-2 | OK | same |
| home:cross-3 | idem | same, tile 3 | picture | home_cross-3 | OK | same |
| daily:mode-idol | idem | /daily, dot of the Kpopdle block and row of "Your day" | picture | daily_mode-idol | OK | A-png-daily-blocks-1280, A-png-daily-side-1280 |
| daily:mode-group | idem | same | picture | daily_mode-group | OK | same |
| daily:mode-song | idem | same | picture | daily_mode-song | OK | same |
| daily:mode-hidden | idem | same | picture | daily_mode-hidden | OK | same |
| daily:mode-char | idem | same, Otakudle | picture | daily_mode-char | OK | same |
| daily:mode-series | idem | same, Otakudle | picture | daily_mode-series | OK | same |
| daily:mode-byseries | idem | /daily, square of every series without its own (shared slot) | picture | daily_mode-byseries on both series (scenario D) | OK (now the fallback) | D-fallback-daily-side-1280 |
| daily:mode-byseries-one-piece | idem | /daily, One Piece dot and row | picture | daily_mode-byseries-one-piece | NEW | A-png-daily-side-1280 |
| daily:mode-byseries-dragon-ball | idem | /daily, Dragon Ball dot and row | picture | daily_mode-byseries-dragon-ball | NEW | A-png-daily-side-1280 |

Count: 24 slots, 21 verified OK or NEW, 1 FIXED (banner:daily), 1 LOCAL GAP (home:qotd-a), 1 more (daily:mode-byseries) verified through its fallback role. None "not showing".

## Icon slots (type icon): 19 slots, drawn by `IconMark` with `data-slot-icon` / `data-slot-mode`

Before this lane no public page read any icon slot (`parseIconSettings` had no consumer outside the admin): all 17 existing slots were NOT SHOWING. Now each draws its
saved row (PNG or library icon, circle or not, colour) and keeps today's drawing, byte for byte, while nothing is saved (scenario E vs the base commit: the main HTML of
the home, /daily, /kpopdle, /otakudle and both series pages is identical; see the notes below).

| Slot id | Admin group | Page and place | Saved in fixture | Page drew | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| k-idol, k-group, k-song, k-hidden | Kpopdle, étapes | /kpopdle step strip (4 steps; states current, done, next, soon) | PNG (A) and bare star (C) | `k-idol:png` ... (A), `:icon` (C) | FIXED | A-png-steps-kpopdle-1280/375, C-icon-steps-kpopdle-1280, E-none-steps-kpopdle-1280 (default) |
| o-char, o-series | Otakudle, étapes | step strip of /otakudle and both series pages | PNG, star | `o-char:png`, `o-series:png` | FIXED | A-png-steps-otakudle-1280, C-icon-steps-otakudle-1280 |
| o-by | Otakudle, étapes ("Par série (toutes les séries)") | fallback of every series step and tile | star in scenario D | both series draw it (`o-by-one-piece:icon`, `o-by-dragon-ball:icon`) | FIXED, kept as the shared slot | D-fallback-steps-one-piece-1280, D-fallback-series-tiles-otakudle-1280 |
| o-by-one-piece | Otakudle, une étape par série | step of the strip (3rd) and tile "One Piece" of /otakudle | PNG, star | `o-by-one-piece:png` in the strip and in the tile | NEW | A-png-steps-one-piece-1280, A-png-series-tiles-otakudle-1280 |
| o-by-dragon-ball | idem | step of the strip (4th) and tile "Dragon Ball" | PNG, star | `o-by-dragon-ball:png` | NEW | A-png-steps-dragon-ball-1280 |
| link-o | Liens en bas de page | foot of /kpopdle, the door to Otakudle (64 px) | PNG, star | `link-o:png` | FIXED | A-png-hop-kpopdle-1280, C-icon-hop-kpopdle-1280 |
| link-k | idem | foot of /otakudle and series pages, the door to Kpopdle | PNG, star | `link-k:png` | FIXED | A-png-hop-otakudle-1280/375, C-icon-hop-otakudle-1280 |
| hints | Titres | /kpopdle, title above the hints | PNG, star | `hints:png` | FIXED (Kpopdle pages only, as the slot's page says) | A-png-hints-kpopdle-1280, C-icon-hints-kpopdle-1280 |
| howto | Titres | /kpopdle, title of the "How to play" fold | PNG, star | `howto:png` | FIXED (Kpopdle pages only) | A-png-howto-kpopdle-1280, C-icon-howto-kpopdle-1280 |
| today-kpopdle | Accueil, jeux du jour | hub home Today, Kpopdle row, when `home:kpopdle` is empty | PNG (B), star (C) | `today-kpopdle:png` / `:icon`; with `home:kpopdle` filled the picture wins | NEW | B-homepng-home-today-1280, C-homeicon-home-today-1280 |
| today-otakudle | idem | Otakudle row | same | same | NEW | same |
| today-qotd-k | idem | K-pop quiz row, when `home:qotd-k` is empty | same | same | NEW | same |
| today-debate | idem | debate row, when `home:debate` is empty | same | same | NEW | same |
| today-qotd-a | idem | anime quiz row | not drawn locally: no anime quiz of the day in o1-dev | render test: `today-qotd-a` draws | NEW, LOCAL GAP | `home-today-icons.test.ts` |
| today-blindtest | idem | blind test row, a mark beside the name (the play button stays) | not drawn locally: no blind test of the day in o1-dev | render test: mark drawn only when saved | NEW, LOCAL GAP | `home-today-icons.test.ts` |

Count: 19 slots. 17 FIXED or NEW and shown on a page with a real render (15 in the browser, 2 by render test), 2 more (o-by-*) NEW. 0 not showing.

## Notes

- Defaults: scenario E (no row at all) compared with the base commit dddb441, main HTML of each page with the clocks masked. Identical on 1280 and 375 for the home, /daily,
  /kpopdle, /otakudle, /otakudle/one-piece and /otakudle/dragon-ball. Two runs of the same code also differ on some pages by the "Yesterday" block (a flaky dev read of
  dle_day), so each page was compared in two runs and matched in at least one, the only difference being that block.
- Pixel differences that appear only once a row is saved: the saved icon replaces the page's drawing in its own box (a hop door becomes the owner's shape and colour; a
  step keeps its 56 px circle, its breathing and its check badge; a soon step is drawn at 60 percent opacity).
- Series without a row of their own take what the owner saved on `o-by`, then their default (`books` for One Piece, `sparkle` for Dragon Ball: the icons the pages
  draw today). The /daily dots and rows are unchanged by icon slots (they use the image slot, else the library icon of the mode).
