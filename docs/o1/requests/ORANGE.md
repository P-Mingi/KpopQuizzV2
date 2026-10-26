# Requests of ORANGE (OtakuQuiz turns orange and drops the blind test, owner 2026-10-26)

ORANGE changed only `apps/quiz/src/**` and this file. The contract files below still describe the old state; patches for ORCH.

1. `docs/o1/contracts/registry.md` line 51: the anime features lose `blindTest` (they are: quizzes, topicHubs, trivia, create, dailyQuiz,
   openingOfTheDay, nameAll, personality, thisOrThat, airingBanner, spoilers, community, challenges, leaderboards).
2. `docs/o1/contracts/routes.md`:
   - the anime allowlist loses `/blindtest/**` (the registry `routes.allow` of anime no longer holds it); line 172 (`/blindtest`,
     `/blindtest/series-{series}`) is no public route (the page `blindtest/page.tsx` answers 404, see 3); `/blindtest/**` joins the "Must 404" paths of anime
     (`KPOP_ONLY_SAMPLES` of `lib/site/routing.ts` now lists `/blindtest`, `/blindtest/ranked`, `/blindtest/series-naruto`, `/blindtest/group-bts`;
     `/blindtest/ranked` left `KPOP_DATA_SAMPLES`);
   - line 194: the internal file of the openings quiz (`blindtest/[mode]/page.tsx`) is no longer public at its own path. `rewritesFor('anime')`
     has two rules (`BLOCKED_PUBLIC` in `lib/site/routing.ts`) that send `/sites/anime/blindtest` and everything below it to `/sites/anime/gone`
     (the site's 404) before the pretty rule `/{series}-openings-quiz` rewrites to `/sites/anime/blindtest/series-{series}`;
   - line 176 (`/opening-of-the-day`): it redirects to `/series` (no redirect to `/blindtest`, D-048 superseded, and none to the openings quiz
     page, which does not render yet);
   - `/{series}-openings-quiz` stays in the allowlist and the rewrite stays, but no page of the site links to it (it answers 404 until O6 builds it).
3. `docs/o1/contracts/TWINS.md` and `twins.json`: row 11 (`/blindtest`, anime) is withdrawn as a route. Its page file stays but answers 404 (it calls
   `notFound()` when `SITE.features.blindTest` is off) and nothing reaches it: deleting it moved the client chunk grouping of kpopquiz.org's `/blindtest`
   and `/pt/blindtest` (7 to 6 and 8 to 7 chunk files, `e2e/o1/O2/kpop-chunk-count.sh`), because those chunks were grouped by the routes that share a module.
   Delete the file, and drop the row, when the kpop chunk baseline is re-cut. Row 12 keeps its file (the internal file the openings quiz rewrite reaches);
   row 13 note: "redirects to /series". Row 14 (which-character) keeps its `ways-tile` and `section-header` mustImports: its "Also on" block now holds two real doors (the series hub and /series). The O6 lane card (`briefs/O6.md`) loses the blind test hub, the Deezer playlist hub
   and the daily band.
4. `docs/o1/contracts/tokens.md` section 4.2: the anime values are not Option A "Persimmon and Sumi" but the owner's order: only the accent family
   (`pink`, `pink-fill`, `pink-fill-h`, `pink-ink`, `pink-soft`, `pink-soft-ink`, `pink-line`) plus `qotd-bg`, `qotd-edge`, `bt-bg` and `hl` are orange;
   grounds, lines, feedback and the other names are kpop's. The table of the values is `ANIME_LIGHT` and `ANIME_DARK` of `lib/site/registry.ts`
   and `styles/sites/anime/tokens.css`; the contrast test is `lib/site/anime-orange.test.ts`.
5. `docs/o1/contracts/copy-keys.md`: anime keys `hub.openingsBlindTest`, `hub.faq.openings.q` and `hub.faq.openings.a` are removed (the series hub has no
   openings quiz link and no such FAQ answer); `signin.statB` and `signin.statBLabel` read "Spoiler" and "shield".
6. `PLACEHOLDERS.anime` no longer lists the theme (`theme.light and theme.dark`); the entry in `docs/o1/contracts/registry.md` section on placeholders
   should drop it too.
7. `docs/o1/contracts/tokens.md` section 3.3, rule 6 (and the exemption list of `checkSiteSheet` in `lib/site/contract.test.ts`): a sheet of anime named
   `legacy.css` is allowed to repeat a shared selector under the anime scope, with colour properties only (colour, background, border, outline, shadow, fill,
   stroke, custom properties), and to set on the bare scope only the legacy custom properties of `LEGACY_VARS` in `lib/site/anime-legacy-pink.ts` (--brand and the
   others of `styles/globals.css`, which are not `--ux-*` names). Owner order of 2026-10-26 (no pink on otakuquiz.org). The file is generated from the shared
   sheets by that module and a test regenerates it and compares; planted cases in `contract.test.ts` prove that a layout property, an unscoped selector or a
   foreign custom property in it still fail. Every other sheet of every site keeps rule 6. Also `tokens.md` 1.1: the anime sheet now sets `acc-pink`, `lt-a`,
   `th-hits26`, `th-viral`, `th-kpdh` and `host-bg` (their kpop values carry a pink hue).

## Rendered check

`apps/quiz/e2e/o1/ORANGE/no-pink.mjs` reads the computed colours of a running anime build in a browser (output: `docs/o1/reports/ORANGE/no-pink.txt`): zero pink on
the home, series hub, quiz page, quizzes, trivia, community, leaderboard, login, about, create, search, and, signed in, settings and passport (`/me`), light and
dark. It is a script, not a unit test (it needs a built site and a database); `lib/site/anime-orange.test.ts` is the static half (the generated sheet
covers every pink of the shared sheets).

## Left as it is

- A fan's stored choice from kpop (the "pink" name colour, the "Blossom" avatar preset) is not offered on anime any more; a stored value still renders: the name
  colour as the orange of `--ux-acc-pink`, the Blossom avatar as its stored rose (an inline style).
- The default logo, favicon and share image of otakuquiz.org are the kpopquiz files (owner decision D-099).
- `apps/quiz/e2e/o1/**` and `scripts/o1/parity-urls.seed.txt` still list anime `/blindtest` URLs; they are not run by the unit suite.
