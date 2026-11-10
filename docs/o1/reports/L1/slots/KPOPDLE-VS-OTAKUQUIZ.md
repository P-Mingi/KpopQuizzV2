# Kpopdle module (kpopquiz.org home, NET_KPOPDLE_HOME=1) vs "Daily games" module (OtakuQuiz home, /anime locally)

Both rendered from this branch against o1-dev reads (dev servers 3121 and 3122, stopped), at 1280 and 375. Screenshots: `img/side-after-1280.png`, `img/side-after-375.png`
(left or top: Kpopdle after the alignment, right or bottom: OtakuQuiz), `img/kpop-after-*.png`, `img/anime-*.png`. Kpopdle before the alignment: its 375 layout wrapped
the tiles beside the text.

| Point | Kpopdle (before) | OtakuQuiz | Decision |
|---|---|---|---|
| Section title | "Daily game" | "Daily games" | kept: one game, singular is true (the test asserts it) |
| Header action | "All daily games" link to /daily | none (OtakuQuiz avoids the Burrow, which lists K-pop games) | kept: decision 3 of the Kpopdle module; the Burrow lists anime games too |
| Layout, 1280 | one wide row card: tiles, text, button | a row of three vertical cards | kept: a single game in a card three times too wide would look empty |
| Layout, 375 | tiles beside the text, then the button (wrap) | tiles above the text, full width button | ALIGNED: same stack, padding 18, gap 14 |
| "Near" tile stripes | strong red (`--ux-no` over a color-mix of it) | softer (`--ux-no-soft` then `--ux-no`) | kept: the owner decided on 2026-11-08 that Close reads as strong red (`state-colours.test.ts` pins it). The OtakuQuiz module still has the soft tint: it is the one to change, out of this lane (question 2) |
| Title size | 21 px (19 on a phone) | 20 px | ALIGNED to 20 px |
| Button label centred | not set | centred | ALIGNED (`justify-content: center`) |
| Number line | "Kpopdle · Idol no. N" | "Otakudle · no. N" | kept: Kpopdle names its mode, the other games have one |
| Facts line | "8 clues per guess" first | no clue count | kept: it is the Kpopdle pitch |
| Footnote | "A free daily game on bunnyverse.org, our sister site." | "Free daily games on bunnyverse.org, a new character every day." | kept |
| Tile colour | pink soft | orange soft (the site's own token) | kept |

kpopquiz.org stays byte identical with the flag OFF: the module file is loaded only behind the flag (`kpopdle-home.test.ts`, "flag off" and "what keeps the
flag-off home byte-identical"), and only CSS inside that file changed.
