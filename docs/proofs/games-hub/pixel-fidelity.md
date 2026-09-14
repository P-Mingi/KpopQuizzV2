# Games hub, pixel fidelity

Method. The rebuilt `/games` is rendered in system Chrome (the same engine the e2e
suite uses) at the two artboard widths, clipped to the hub root `.gh` (no site
chrome). Each shot is compared against the owner render in
`docs/design/games/renders/` with pixelmatch (threshold 0.14, antialias ignored).
Because the oracle render includes the artboard's own mock nav and tab bar, which
this rebuild does not reproduce (the real `TopNav` and `MobileTabBar` are out of
scope), the oracle is cropped to its content column and the vertical offset is
swept to the tightest alignment before diffing. Scripts and raw PNGs live beside
this file (`pixel/`).

## Numbers

| Width | Region | Mismatch | Notes |
| --- | --- | --- | --- |
| 1440 | full hub column (1160 x 2300) | 4.52% | structurally aligned |
| 390 | full hub column (390 x 3400) | 15.71% | real photos dominate |
| 390 | header + band (390 x 640) | 14.08% | low-drift region |

Files: `pixel/render-1440.png`, `pixel/render-390.png` (this rebuild),
`pixel/oracle-1440.png`, `pixel/oracle-390.png` (owner renders),
`pixel/diff-1440.png`, `pixel/diff-390.png` (pixelmatch output, red = mismatch).

## What the residual mismatch is (and is not)

The diff overlays show the residual is confined to three sources, none of them a
layout or structural drift:

1. Real idol photos. Every `.gh-face` is a real `/idols/*.jpg` (RM, Jin, Suga,
   Jimin, V, Jungkook, Jennie, Karina, Hanni), which is a different image from the
   placeholder crop the artboard used, so each face reads as ~100% different pixels.
   On mobile the faces are large relative to the column, so they carry most of the
   15.71%.
2. Real data text. The band answers (Saki, UNFORGIVEN, THAT'S A NO NO, Motto), the
   live vote count (2,258), and the mode counts (53 groups, 4 modes, 14 boards, 20
   rankings) are the site's real values, not the artboard's sample strings, so the
   glyphs differ.
3. Intentional data-honesty deviations (see `data-honesty.md`): the dropped
   "fans playing today" chip, the dropped "played today" note, the un-picked band
   answers, and the anonymous (absent) streak all show as ghosts of the oracle.

Structure, spacing, radii, colors, the dark band with its rose waveform, the eight
card grid, the filter row, and the ranking strip all land on the artboard grid at
both widths. The 390 mobile column accumulates a few pixels of vertical drift over
its ~3800px height (sub-pixel per-section rounding), which is why a full-column
number reads higher than the header+band region; each section on its own aligns.
