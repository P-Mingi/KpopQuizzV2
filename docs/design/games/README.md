# /games hub redesign: pixel source of truth

Owner-validated 2026-09-14 ("I validate it 100%"). This folder is the spec the worker builds
against. Nothing in it is a suggestion; the hub must match these artboards pixel for pixel.

## What is here

- `Main.dc.html` (1440 wide) and `Mobile.dc.html` (390 wide): the two page artboards. Claude
  Design source. Open `preview/*.html` for a standalone view with the photos inlined.
- `CardAnatomy.dc.html`: one game card with the five zones numbered and the build notes (px
  values, tokens). `MidPlay.dc.html`: the daily band in its play state, with three callouts.
- `renders/*.png`: full-page renders of each artboard at exact width, DM Sans loaded. These are
  the pixel oracle. Diff your `next start` screenshots against them at the same viewport.
- `canvas.json`: the canvas layout only, no build meaning.

## Photo mapping (the artboards reference short names; the app serves `/idols/`)

| artboard file  | app file                        |
|----------------|---------------------------------|
| rm.jpg         | /idols/RM BTS.jpg               |
| jin.jpg        | /idols/Jin BTS.jpg              |
| suga.jpg       | /idols/Suga BTS.jpg             |
| jimin.jpg      | /idols/Jimin BTS.jpg            |
| v.jpg          | /idols/V BTS.jpg                |
| jk.jpg         | /idols/Jungkook BTS.jpg         |
| jennie.jpg     | /idols/Jennie BLACKPINK.jpg     |
| lisa.jpg       | /idols/Lisa BLACKPINK.jpg       |
| karina.jpg     | /idols/Karina AESPA.jpg         |
| hanni.jpg      | /idols/Hanni NEWJEANS.jpg       |
| wonyoung.jpg   | /idols/Wonyoung IVE.jpg         |

Faces are rendered object-fit cover in a 12px-radius square with the site border + card shadow
(see `.face` in the artboard CSS). Do not copy the downsampled images into the repo; use the
existing `/idols/` assets.

## Tokens (all lifted from `apps/quiz/src/styles/globals.css`; globals.css wins on conflict)

rose #E8457A, brand-light #FCE8EF, brand-dark #B5345F, button #D13A6E, plum #A83A8F,
violet #7B3FA8, cream #FAF8F5, surface #FFFFFF, surface-alt #F3F1ED, ink #1A1714,
txt2 #6B6560, txt3 #9E998F, radius 20 (cards) / 24 (daily band) / 999 (pills), DM Sans,
shadow-lift rose-tinted. Dark band base #17131A with two radial glows (rose top-left, violet
bottom-right). Tier colors S #E8457A, A #F5894D, B #EBB33E.

## Values that are SAMPLE in the artboards (never ship them as literals)

fans playing today (3,204), votes today (12,880), Elo numbers, streak "1 day", "Your best: 5 of 7",
the four blind test answers, the countdown "12:27:14". Real values from the current page: 53
groups, 4 modes, 14 boards, 20 rankings. The mission says what replaces each sample.

Timer semantics (verified in the players): Name Them All counts DOWN (`playlist.timerSeconds`);
Sort It and Match-Up count UP (finish time is the score; Match-Up adds 3 s per wrong pair). The
pills in the Sort It and Match-Up previews are elapsed time.
