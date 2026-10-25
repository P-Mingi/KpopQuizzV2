# H2a checks (worktree o1-H1, branch o1/H1)

- `pnpm -C apps/quiz exec tsc --noEmit`: 0 errors.
- `vitest run src` (259 files, 3854 tests): green; new: `app/sites/[site]/home-hub.test.ts` (28, every block signed out and signed in, aria, canonical links, JSON-LD, metadata, error fallback), `components/hub/home/home-client.test.ts` (7, the islands), `lib/site/hub/home-styles.test.ts` (tokens.css equals the registry, every class defined and used, AA contrast of the design colours in light and dark). Adapted, not weakened: `lib/site/hub/network-page.test.ts` (the new home's words name K-pop, the files it scans), `lib/site/hub/privacy-final.test.ts` (the shared block is read in `home-community.tsx`).
- `scripts/o1/check.sh`: twins ok.
- Builds, all offline (`scripts/o1/env.sh offline`): hub green, anime green, kpop green (head), kpop green (base: the five shared files at 37caf3e).
- `e2e/o1/P1/kpop-chunks.sh compare base head`: 164 kpop page manifests, 0 with other client modules (10 identical, 154 same graph with a content-hash change in 2 chunk files: ux-client-shell and brand changed).
- `e2e/o1/O2/kpop-chunk-count.sh compare base head`: 164 routes, same client modules, same number of chunk files in each.
- `apps/quiz/e2e/o1/H1/H2a/tailwind-delta.mts`: the Tailwind sheet built over src has 4436 rules at 37caf3e and 4436 now, 0 added.
- No en or em dash, no emoji in what the home prints (tested) nor in the files added.
