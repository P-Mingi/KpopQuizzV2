# Games hub redesign, proofs

The rebuilt `/games` against the owner-validated artboards in `docs/design/games/`.

- `pixel-fidelity.md` + `pixel/` : screenshots at 1440 and 390, pixelmatch diffs vs
  the owner renders, and the mismatch numbers.
- `deviations.md` : every difference from the artboard, with reason.
- `data-honesty.md` : the SAMPLE-to-real (or absent) table; no dead buttons.
- `cost-fence.md` + `route-table.txt` : the render-mode proof (both routes stay
  `Static`, 1h ISR), and where the new reads live (inside `getGamesData`).
- `seo.md` : canonical, hreflang, title unchanged; JSON-LD gains Tier Lists after
  Duel; all eight cards crawlable in the static HTML.
- `test-output.md` : unit (80 passed) and e2e (17 passed, desktop + mobile) tallies.
- `harness/` : the capture and diff scripts used for the pixel proofs.

## Headline

- Pixel: 1440 diff 4.52% (structurally aligned; residual is real photos, real data,
  and the intentional honesty deviations). 390 diff 15.71% full column / 14.08%
  header+band (real photos dominate the mobile column).
- Cost fence: `/games` and `/pt/games` both build `Static, 1h`; no `force-dynamic`,
  no new API, no new per-request read. The two new song reads ride the existing
  `getGamesData` cache.
- Tests: unit 80 passed, e2e 17 passed (1 skipped = the desktop skip of the
  mobile-only overflow guard), tsc 0 source errors, `next build` green.
- SEO: 5 gates green (canonical, hreflang, title, JSON-LD Tier Lists at position 8,
  eight crawlable cards).
