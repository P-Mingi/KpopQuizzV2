# Lot (b), lane LB: the anime blocks of the series hub (otakuquiz.org)
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-LB, branch o1/LB. Read this brief, the code you change and the
files named here; nothing else (no BACKLOG, no other brief). Q = apps/quiz/src, P = Q/app/sites/[site]/(anime), C = docs/o1/contracts.
## Rules
- Never push, never touch production, never use a connector or the supabase, vercel or gh commands. Never open ~/kpq-o1/secrets.
- Never write outside this worktree. Never edit tests, gates or anything under scripts/o1, docs/o1/contracts, next.config, Q/middleware.ts.
- Rule 18: reuse the kpop component; never copy it. A difference is an optional prop or slot on the kpop component whose default keeps
  the kpop output byte for byte (kpopquiz.org parity is checked on 60 pages). No `if (SITE.id === ...)` inside kpop components: the
  anime page passes the prop. Page files under P stay codemod copies; change them only to pass props and load anime data.
- Copy: no "K-pop", no en or em dash, no emoji. Series, character and oshi words come from SITE.vocabulary, not from copy.
- No Tailwind utility word in a new file. New CSS only in Q/styles/sites/anime/o2.css and o3.css, every selector starts
  `html.ux-v1[data-site="anime"]`, classes anime-o2-* and anime-o3-*, locals --anime-*, no @import or @font-face, no rule on a shared class.
- No SQL in this lot (011 to 015 come in lot (e), after the passport SQL). The loader must not crash when the tables are missing.
## Data
- Loader Q/lib/anime/series.ts: `getSeriesHub(slug)` reads public.series (by group), arcs, characters, series_themes, trivia
  (entity_kind 'series'), entity_sources, and the series' published quizzes, through the existing server Supabase client and forSite.
  Each series is a groups row of site anime (series.group_id). Any error or missing row returns null; the page then calls notFound().
- Row types and constants already frozen: Q/lib/db/contract.types.ts (SeriesRow, ArcRow, CharacterRow, SeriesThemeRow) and
  Q/lib/anime/types.ts (MIN_PLAYABLE_THEMES=15, MIN_OSHI_PICKS=30, SPOILER_SHOW_ALL=32767, ANIME_SPOILER_STORE_KEY, ANIME_MIX_SLUG).
  If one is missing, add it there with exactly that name.
- Fixtures for unit tests: C/fixtures/series/death-note.json, one-piece.json, spy-x-family.json (keys group, series, arcs, characters,
  themes, 5 quizzes fx-* with expected_level). Schema C/fixtures/series-fixture.schema.json.

## Blocks (all on P/[slug]/page.tsx, /{series}-quiz, through slots of GroupHubV11 Q/components/group/ux-v1/hub.tsx)
- A1 header facts: title_en, native and romaji titles, studios, years, status, episodes or chapters, "Sources (i)" from entity_sources,
  "Now airing" only when series.airing holds a record. Reuse the hub hero and Q/components/ux-v1/panel.tsx.
- A2 arcs: story map plus quizzes grouped by arc (quizzes.spoiler_arc_ord). Reuse HubQuizzes Q/components/group/ux-v1/hub-quizzes.tsx
  with an optional grouping prop; "Safe for you" or "Covers {arc}" on each card.
- A3 characters: monogram and role tiles (never an image), oshi star (write favourite_characters through RLS), counts shown only
  from 30 picks (view favourite_character_counts). Reuse the members tile list of hub.tsx and Q/components/ux-v1/person-name.tsx.
  A character whose spoiler_level is above the reader's progress shows as a locked tile without name.
- A4 openings and endings table (kind op, ed, insert; number, title, artist, season); link to /blindtest/series-{series} only at 15
  playable themes or more. Reuse the songs band of Q/components/group/ux-v1/hub-growth.tsx. Empty credit slot for a later lot.
- A5 spoiler shield: Q/components/spoilers/spoiler-shield.tsx, props {seriesSlug, groupId, arcs: {ord, name, mangaOnly, animeOnly}[],
  signedIn, onChange?}. Core Q/lib/anime/spoilers/: computeSpoilerLevel(questions, mangaOnlyArcs?) and isSafeFor(level, progress):
  tag {arc, scope 'anime'|'manga'|'both'}, arc 0 is spoiler-free; level arcOrd = max tag, scope null at 0, 'manga' if any tagged
  question is manga or in a manga-only arc, else 'anime' if all tagged are anime, else 'both'. isSafeFor = arcOrd 0, or
  progress.arc >= arcOrd and not (scope 'manga' with progress.scope 'anime'). No stored value = spoiler-free view. Guest store:
  localStorage `anime.spoiler.v1` = {[seriesSlug]: {arc, scope}}, every access in try/catch. Signed in: series_progress (RLS own rows).
  No cookie. Tagged question text never appears in HTML or JSON-LD. Also on P/q/[slug]/page.tsx for a quiz with a level above 0.
- A7 title card: a deterministic SVG from the title and an accent token, as an optional replacement of GroupAvatar
  (Q/components/group/ux-v1/group-avatar.tsx) on the hub.
- Facts: /{series}-trivia (P/[slug]/page.tsx) renders GroupTriviaPage from app/(site)/[slug]/group-trivia-page: move it to a shared
  component first (kpop imports the moved file, output unchanged), then feed it series trivia; 404 under 9 facts. The hub shows up to 9.

## Frozen names
- Copy in Q/copy/anime/o2.ts and o3.ts, shape `export const COPY = { 'hub.start': '...' }`, keys: o2 hub.start, hub.sources,
  hub.quizzesByArc, hub.characters, hub.openings, hub.storyMap, hub.facts, hub.related, hub.faq, hub.nowAiring, hub.community,
  series.h1, series.lede, series.filter, mix.h1, mix.lede, trivia.h1, trivia.sourcesTitle, oshi.button, oshi.count; o3
  spoiler.safeForYou, spoiler.covers, spoiler.gatedQuestion, spoiler.interstitialTitle, spoiler.interstitialBody, spoiler.showAnyway,
  spoiler.setProgress, shield.title, shield.progressLabel, shield.spoilerFree, shield.showEverything, report.action, report.sent, report.covered.
- Routes: ?arc ?q ?role ?progress are never indexable (canonical is the clean URL). Hub noindex,follow under 3 published quizzes.
- Out of scope: Deezer and audio, the report RPC (SQL 015), character and arc pages, the crossover credit, settings oshi picker.

## Checks before you hand back (all must pass; never weaken a test)
1. `pnpm -C apps/quiz exec tsc --noEmit` : 0 errors.  2. Unit tests next to the code (vitest) for spoilers core, the loader
   (missing tables return null) and each block rendered from the 3 fixtures; `pnpm -C apps/quiz exec vitest run <your tests>` green.
3. `scripts/o1/check.sh $PWD` from O1 (absolute path /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1/scripts/o1/check.sh): ok.
4. Commit on o1/LB (message "o1: LB ..."; end with the line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`).
Hand back at most 10 lines: last sha, files changed (count), kpop components given a prop, what each block shows, checks and results, open issues.
