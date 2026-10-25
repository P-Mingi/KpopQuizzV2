# H2a checks (worktree o1-H1, branch o1/H1)

- `pnpm -C apps/quiz exec tsc --noEmit`: 0 errors.
- `vitest run src` (259 files, 3854 tests): green; new: `app/sites/[site]/home-hub.test.ts` (28, every block signed out and signed in, aria, canonical links, JSON-LD, metadata, error fallback), `components/hub/home/home-client.test.ts` (7, the islands), `lib/site/hub/home-styles.test.ts` (tokens.css equals the registry, every class defined and used, AA contrast of the design colours in light and dark). Adapted, not weakened: `lib/site/hub/network-page.test.ts` (the new home's words name K-pop, the files it scans), `lib/site/hub/privacy-final.test.ts` (the shared block is read in `home-community.tsx`).
- `scripts/o1/check.sh`: twins ok.
- Builds, all offline (`scripts/o1/env.sh offline`): hub green, anime green, kpop green (head), kpop green (base: the five shared files at 37caf3e).
- `e2e/o1/P1/kpop-chunks.sh compare base head`: 164 kpop page manifests, 0 with other client modules (10 identical, 154 same graph with a content-hash change in 2 chunk files: ux-client-shell and brand changed).
- `e2e/o1/O2/kpop-chunk-count.sh compare base head`: 164 routes, same client modules, same number of chunk files in each.
- `apps/quiz/e2e/o1/H1/H2a/tailwind-delta.mts`: the Tailwind sheet built over src has 4436 rules at 37caf3e and 4436 now, 0 added.
- No en or em dash, no emoji in what the home prints (tested) nor in the files added.

# H2c checks (worktree o1-h2c, branch o1/h2c)

- `pnpm -C apps/quiz exec tsc --noEmit`: 0 errors.
- `vitest run src` (272 files, 4036 tests): green. The machine was loaded (load average 60 to 70, other lanes building), so 18 files timed out at 5 s in the one full run; the same 18 files rerun alone with a long timeout: 18 files, 268 tests, green. New or changed: `lib/site/hub/home-loaders.test.ts` (24: each loader maps its module, the missing block, the error, links), `home-viewer.test.ts` (8: progress, streaks live or stale, banned or unjoined, signed out on every error), `home-no-samples.test.ts` (5: no design sample name, no test import, no site address in a render path), `app/sites/[site]/home-hub.test.ts` (40: every block on the data modules, each block missing, every module null, a module that throws, the search link, canonical links), `components/hub/home/home-client.test.ts` (countdown to 00:05 UTC in summer and winter, the player loads no sound before the press, Surprise me with `pickSurprise`, the search link), `lib/passport/email/render.test.ts` (the rabbit before the name for anime and hub only, kpop bytes unchanged). Adapted, not weakened: `network-page.test.ts` (the design samples file of the tests is not scanned for site names).
- `scripts/o1/check.sh`: twins ok.
- Builds, all offline (`scripts/o1/env.sh offline`): hub green, anime green, kpop green (head), kpop green (base o1/integration a0ae91a, built in this worktree so module ids match).
- `e2e/o1/P1/kpop-chunks.sh compare base head`: 164 kpop page manifests, every page reaches the same client modules as base. `e2e/o1/O2/kpop-chunk-count.sh compare base head`: 164 routes, equal, same number of chunk files. (The base is o1/integration, without H2a: the few chunk files whose content hash changes are the two of H2a, `ux-client-shell` and `brand`.)
- Real data (o1-dev, `scripts/o1-tools/dev-up.sh`, fixture `dual` through `signin-link.sh`): `real-1440-out.png`, `real-1440-in.png`, `real-390-out.png`, `real-390-in.png`, `real-compare-blocks.txt`; `interact-real.mjs` 11 of 11: the search link follows the filter, Surprise me never repeats a site, the blind test makes no sound before the press and plays the Deezer preview of the first song for ten seconds, the countdown prints 1:05 (winter).
- No en or em dash, no emoji in what the home prints (tested) nor in the files added.
