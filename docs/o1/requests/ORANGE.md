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
   - line 176 (`/opening-of-the-day`): it redirects to `/{series}-openings-quiz` of the series of today's opening (`daily_openings`, site anime, UTC
     date), else to `/series`; no longer to `/blindtest` (D-048 is superseded).
3. `docs/o1/contracts/TWINS.md` and `twins.json`: row 11 (`/blindtest`, anime) is withdrawn as a route. Its page file stays but answers 404 (it calls
   `notFound()` when `SITE.features.blindTest` is off) and nothing reaches it: deleting it moved the client chunk grouping of kpopquiz.org's `/blindtest`
   and `/pt/blindtest` (7 to 6 and 8 to 7 chunk files, `e2e/o1/O2/kpop-chunk-count.sh`), because those chunks were grouped by the routes that share a module.
   Delete the file, and drop the row, when the kpop chunk baseline is re-cut. Row 12 keeps its file (the internal file the openings quiz rewrite reaches);
   row 13 note: "redirects to the openings quiz of the day, else /series". The O6 lane card (`briefs/O6.md`) loses the blind test hub, the Deezer playlist hub
   and the daily band.
4. `docs/o1/contracts/tokens.md` section 4.2: the anime values are not Option A "Persimmon and Sumi" but the owner's order: only the accent family
   (`pink`, `pink-fill`, `pink-fill-h`, `pink-ink`, `pink-soft`, `pink-soft-ink`, `pink-line`) plus `qotd-bg`, `qotd-edge`, `bt-bg` and `hl` are orange;
   grounds, lines, feedback and the other names are kpop's. The table of the values is `ANIME_LIGHT` and `ANIME_DARK` of `lib/site/registry.ts`
   and `styles/sites/anime/tokens.css`; the contrast test is `lib/site/anime-orange.test.ts`.
5. `docs/o1/contracts/copy-keys.md`: anime keys `hub.openingsBlindTest` became `hub.openingsQuiz` ("Play the {name} openings quiz"); the texts of
   `hub.faq.openings.q` and `.a` say "openings quiz"; `signin.statB` and `signin.statBLabel` read "Spoiler" and "shield".
6. `PLACEHOLDERS.anime` no longer lists the theme (`theme.light and theme.dark`); the entry in `docs/o1/contracts/registry.md` section on placeholders
   should drop it too.

## Left as it is (not anime-only code, so out of ORANGE's reach)

- `styles/ux-v1/*.css` (shared with kpop) keep a few pink literals in rules of features the anime site does not have (`.p1-pulse`, `.p1-eqv i`,
  `.p6-bars i`, `.p6-eq i`, `.p7-t-legend`, the fallback of `.p10-band`); `lib/site/anime-orange.test.ts` pins that exact list, so a new one fails.
- The legacy `globals.css` tokens (`--brand` and the others, used by the old non-UX pages and a few admin or create screens) are not themed per site
  (tokens.md 3.1): a site sheet may declare only `--ux-*` names.
- `lib/passport-themes.ts`: the passport theme presets keep their kpop swatches, the first one is labelled "Pink" in the settings picker. On anime the
  default theme (no choice made) is orange (`themeColours`); the "Pink" preset stays a choice a fan can make.
- `--ux-acc-pink` (the "pink" name colour a fan can pick for their name) is unchanged.
- The default logo, favicon and share image of otakuquiz.org are the kpopquiz files (owner decision D-099).
- `apps/quiz/e2e/o1/**` and `scripts/o1/parity-urls.seed.txt` still list anime `/blindtest` URLs; they are not run by the unit suite.
