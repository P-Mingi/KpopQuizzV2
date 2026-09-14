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

## Headline (post-audit, all on next build + next start, vs revision-3 renders)

- Pixel: 1440 diff 4.47% (structurally aligned; residual is real photos, real data,
  and the intentional honesty deviations). 390 diff 12.49% full column (real photos
  dominate). No dev badge in any capture.
- Cost fence: `/games` and `/pt/games` both build `Static, 1h`; no `force-dynamic`,
  no new API, no new per-request read. The shared `readBandSongs` helper runs inside
  each page's own `unstable_cache`. The streak fetch is now gated on the auth cookie
  (zero calls for anon and crawlers).
- Tests: unit 80 passed, e2e 18 passed (2 skipped = desktop skips of the two
  mobile-only guards), tsc 0 source errors, `next build` green.
- SEO: 5 gates green (canonical, hreflang, title, JSON-LD Tier Lists at position 8,
  eight crawlable cards).
- Audit close-out: BLOCKER 1 (proofs re-taken on next start, no dev badge), BLOCKER 2
  (votes without "today", This or That split labelled "live" with no number,
  /pt/games band no longer empty), visual defects 4 to 10, and cost nit 11 all fixed.
