# Games hub, pixel fidelity

Method. The rebuilt `/games` is rendered in system Chrome (the same engine the e2e
suite uses) at the two artboard widths, clipped to the hub root `.gh` (no site
chrome), against the built app served by `next build` + `next start -p 3021` (NOT
`next dev`: the captures carry no dev-tools badge; `render-390-fullpage-no-dev-badge.png`
shows the full mobile page ending in the footer, no badge). Each shot is compared
against the revision-3 owner render in `docs/design/games/renders/` with pixelmatch
(threshold 0.14, antialias ignored). Because the oracle render includes the
artboard's own mock nav and tab bar, which this rebuild does not reproduce (the real
`TopNav` and `MobileTabBar` are out of scope), the oracle is cropped to its content
column and the vertical offset is swept to the tightest alignment before diffing.
Scripts and raw PNGs live beside this file (`pixel/`, `harness/`).

## Numbers (next build + next start, vs revision-3 renders)

| Width | Region | Mismatch | Notes |
| --- | --- | --- | --- |
| 1440 | full hub column (1160 x 2300) | 4.47% | structurally aligned |
| 390 | full hub column (390 x 3400) | 12.50% | real photos dominate |

The mobile column height is now 3672px against the revised oracle's 3669px content,
so the two align closely down the whole page (12.50%, down from 15.71% before the
fixes). The dark daily band's white text is the most offset-sensitive region on
mobile, so a header+band-only crop reads higher than the full column; the band
itself matches the artboard (see `pixel/` and the report's screenshots).

Files: `pixel/render-1440.png`, `pixel/render-390.png` (this rebuild, next start),
`pixel/render-390-fullpage-no-dev-badge.png` (full mobile page, no dev badge),
`pixel/oracle-1440.png`, `pixel/oracle-390.png` (revision-3 owner renders),
`pixel/diff-1440.png`, `pixel/diff-390.png` (pixelmatch output, red = mismatch).

## What the residual mismatch is (and is not)

The diff overlays show the residual is confined to three sources, none of them a
layout or structural drift:

1. Real idol photos. Every `.gh-face` is a real `/idols/*.jpg`, a different image
   from the placeholder crop the artboard used, so each face reads as ~100%
   different pixels. On mobile the faces are large relative to the column, so they
   carry most of the 12.50%.
2. Real data text. The band answers (Saki, UNFORGIVEN, THAT'S A NO NO, Motto), the
   live vote count (2,258), and the mode counts (53 groups, 4 modes, 14 boards, 20
   rankings) are the site's real values, not the artboard's sample strings.
3. Intentional data-honesty deviations (see `data-honesty.md`): the dropped
   "fans playing today" chip, the dropped "played today" note, the un-picked band
   answers, the anonymous (absent) streak, and the demo split labelled "live" with
   no number all show as ghosts of the oracle.

Structure, spacing, radii, colors, the dark band with its rose waveform, the eight
card grid, the filter row, and the ranking strip all land on the artboard grid at
both widths. The audit's visual defects (mobile Name Them All overflow, wrapping
foot stats, the outline-button "Coming soon", the non-wrapping mobile strip, the
right-aligned band artists, the untrimmed mobile sub) are all fixed and no longer
appear in the diff.
