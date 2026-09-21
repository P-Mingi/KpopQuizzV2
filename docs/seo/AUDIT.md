# SEO AUDIT - kpopquiz.org (post-refonte) - 2026-09-21

READ-ONLY audit. Nothing in `src/` changed (proof: `docs/proofs/seo-audit/`, `git status`). This feeds
the full strategy Cowork writes next; every finding is grounded in the real GSC data and the codebase.

## Sources (measured, not guessed)
- FRESH GSC 6-month export (owner-supplied 2026-09-21, `Performance-on-Search-2026-09-21.zip`): 3.46k
  clicks, 46.5k impressions, 7.5% CTR, avg pos 7.8. Query/page/country CSVs transcribed in
  `docs/proofs/seo-audit/gsc-evidence.txt`.
- Committed 3-month GSC + Vercel (`docs/refonte/DATA-19SEP.md`, `docs/refonte/gsc/*.csv`): hubs = 54% of
  organic, Bing is the #1 referrer (4.6k vs Google 2.9k).
- Live site: robots.txt, sitemap (646 URLs), served-HTML sizes. Local `next build` (795 static pages,
  exit 0, ZERO 522 - DB now Supabase Pro/micro, stable). Route-mode table + technical facts in proofs.
- Codebase file-level sweep (`docs/proofs/seo-audit/codebase-sweep.txt`).
- claude-seo v2.3.1 checklist methodology (install status: `docs/proofs/seo-audit/claude-seo-status.txt`).

## Health framing (honest)
The refonte left a SOUND technical base: no broken canonicals, no important page wrongly noindexed
(one to confirm), sitemap is clean post-kill (no killed-feature URLs), the SEO-winning templates all
render CACHED (`/[slug]` hubs and `/q/[slug]` are SSG/ISR, `/blindtest` and home are Static), page HTML
is well under Googlebot's 2MB fetch cap, images are next/image-optimized, and there is an `/llms.txt`
plus AI-bot access for GEO. So there is NO hard P0 that breaks indexation. The gains are in
CTR/ranking of the pages that already rank, capturing the freshness intent the data proves converts,
and stopping small equity leaks. One item (P0.1) is an indexation RISK to confirm.

---

## P0 - indexation risk (confirm now)

### P0.1 `/news` is `robots: { index: false }`
- File: `src/app/(site)/news/page.tsx:13`.
- Evidence: the page self-suppresses from the index. If /news is meant to draw search traffic this is
  accidental deindexation of a whole surface; if it is an RSS/aggregation surface it is intentional.
- Fix: confirm intent. If it should rank, remove `index:false`; if not, leave it (and drop it from any
  internal nav that implies it ranks). It also carries a dead `/games` link (see P1.4).
- Impact: unknown until intent is confirmed - which is exactly why it is P0 (a whole surface's
  indexability is ambiguous). Cheap to settle.

---

## P1 - big opportunities (ranked)

### P1.1 Home `<title>` doubles the brand and under-targets the head term
- File: `src/app/(site)/page.tsx:31` (title string `KpopQuiz - K-pop Quizzes Made by Fans`) + root
  template `%s | KpopQuiz` (`src/app/layout.tsx:53`). Rendered `<title>` = `KpopQuiz - K-pop Quizzes
  Made by Fans | KpopQuiz` - brand twice.
- Evidence: the home is the #1 page (1,068 clicks, pos 6.16) and it is what ranks for the head term
  `kpop quiz` (5,127 impressions, pos 9.14, CTR only 4.21% - the lowest-CTR high-impression query on
  the site). The doubled brand wastes the pixel budget that should carry the "kpop quiz" keyword and a
  reason to click.
- Fix: give the home its own non-templated title (e.g. `K-pop Quiz - 380+ Free Fan-Made Quizzes` via a
  title that does not re-append the brand) and a benefit-driven meta description. See the
  `quiz-metadata-title-template` gotcha (never hardcode the ` | KpopQuiz` suffix on a page title).
- Impact: highest single-page lever. Moving `kpop quiz` CTR from 4.21% toward the ~9% the group hubs
  already get, on 5,127 impressions, is on the order of +200 clicks/quarter before any rank gain.

### P1.2 `/quizzes` ranks page 2 (pos 18.22) for the "kpop quizzes" head intent
- Route: `/quizzes` - the only SEO-critical template that is `f` Dynamic (reads `searchParams` for
  browse filters; `src/app/(site)/quizzes/page.tsx`). Reads are cached (#28) so speed is fine.
- Evidence: `/quizzes` = 71 clicks but pos 18.22 (page 2) on 1,873 impressions; the query `kpop
  quizzes` is pos 12.79 and `kpop quiz` pos 9.14. The catalog page is the natural target for the plural
  head term but ranks far below the hubs.
- Fix (content/authority, not render mode): harden internal links INTO /quizzes from the home + hubs
  with the "kpop quizzes" anchor, add an ItemList JSON-LD of the grid (P2.3), and give it a stronger
  above-the-filters intro block. Render mode is a red herring here (Google renders it; it is cached).
- Impact: a key head-term page climbing from page 2 to page 1 is a multi-hundred-impression-to-click
  conversion; the intent volume is proven (1,873 impressions already).

### P1.3 Missing hubs for FRESH groups the data proves convert (freshness = the #1 weapon)
- Evidence: the top pages are all fresh-group hubs - `cortis-quiz` 635 clicks, `illit-quiz` 422,
  `seventeen-quiz` 259, `babymonster-quiz` (hub 27 + quiz 93). DATA-19SEP already called freshness "the
  #1 SEO weapon". But `/coer-quiz` is a **404** while COER pulls 32 clicks at pos 4.81 (CTR 15.38%) via
  the single quiz `/q/are-you-a-real-coer`. The hub that would own "coer quiz" does not exist.
- File/mechanism: hubs are generated from the `groups` table with `quiz_count > 0` (`sitemap.ts:236`,
  `group-quiz-page.tsx`). A group with a hot quiz but no group row / not enough quizzes gets no hub.
- Fix: a comeback/debut watch that seeds a group hub (a few quizzes) the moment a group starts pulling
  impressions - operational, not a code change. Name the trigger: any `/q/*` slug for a group without a
  live `/{slug}-quiz` and > N impressions in GSC.
- Impact: this is the site's proven growth engine. Each fresh hub that lands early (cortis, illit) is
  worth hundreds of clicks; a missed one (coer) is leaving pos-4.81 15%-CTR intent on one thin page.

### P1.4 Dead `/games/*` links leak equity from INDEXABLE pages
- Files (indexable, priority): `src/lib/articles/content/hardest-kpop-quizzes.tsx:132`,
  `src/lib/articles/content/hardest-kpop-groups-to-memorize.tsx:116` (both article bodies that rank:
  `/articles/hardest-kpop-quizzes` = 29 clicks pos 6.75), `src/components/quiz/popular-page.tsx:155`
  (renders on the indexable `/quizzes/popular-*`). Then the non-article ones:
  `blindtest/page.tsx:227,245`, `pt/blindtest/page.tsx:159,177`, `news/page.tsx:516`,
  `pt/stats/page.tsx:168`, `components/game/blind-test-player.tsx:493`, `components/verse/verse-teaser.tsx:36`.
- Evidence: `/games` was killed in #26 and now 301s to `/quizzes`. Live internal links to it are
  redirect hops (not 404s) but each leaks a hop of equity and sends users through a redirect; `/games`
  still shows 17 clicks in the 6-month window (pre-kill tail).
- Fix: repoint to live destinations (`/blindtest`, a `/{group}-quiz` hub, or `/quizzes`). Owner already
  flagged this for a content/broken-links pass.
- Impact: small but pure - stops equity leaking off pages that already rank, and removes a broken-UX
  redirect from crawlable article bodies.

### P1.5 Hub vs quiz-page cannibalization on `/{group}-quiz` slugs
- Evidence: both `/{group}-quiz` (the hub) AND `/q/{group}-quiz` (a user quiz slugged the same) return
  200 and both rank: `/illit-quiz` 422 clicks pos 6.03 vs `/q/illit-quiz` 29 clicks pos 6.79; same for
  cortis. Two pages compete for "illit quiz" / "cortis quiz".
- Mechanism: quiz slugs are user/seed derived and can collide with the hub slug pattern; the quiz page
  self-canonicals to `/q/{slug}` (correct), so Google indexes both.
- Fix: make the HUB the unambiguous winner - ensure the hub out-links and out-ranks (it already leads),
  and consider a slug guard so new quizzes cannot take the bare `{group}-quiz` slug (dedupe already
  exists in the sitemap at `:276`; extend the intent to slug creation). Do NOT canonical the quiz to the
  hub (different content).
- Impact: consolidating the "X quiz" query onto the hub reclaims the split impressions; on illit that
  split is ~29 clicks + the impressions behind them.

### P1.6 Evergreen big-group hubs under-perform their fresh cousins
- Evidence: `blackpink-quiz` pos 10.64, CTR 3.02% (761 impressions); `twice-quiz` pos 9.31 CTR 3.52%;
  `stray-kids-quiz` pos 8.42 CTR 4.11% - all well below cortis/illit (~6-7% CTR). These are the biggest
  fandoms (highest latent volume) ranking worst.
- File: titles come from `GROUP_SEO_OVERRIDES` (`group-quiz-page.tsx:36-44`, only 7 groups) else the
  generic formula. BLACKPINK/TWICE/Stray Kids ARE in the override map, so the gap is rank/authority, not
  title.
- Fix: internal-link boost to the top-fandom hubs (they are the ones worth linking hard from the home
  and cross-hub "fans also play"), and a freshness angle on evergreen hubs (a dated "2026" content line
  they already support via `getGroupContentDate`).
- Impact: BLACKPINK at pos 10.64 -> page 1 on the biggest fandom query is a large impression pool; even
  a CTR fix from 3% to 6% roughly doubles its clicks.

### P1.7 Query-intent coverage: trivia / test / "guess the idol" / "name all X"
- Evidence (GSC): the same group draws `X quiz` + `X trivia` (`cortis trivia` 42, `illit trivia` 20) +
  `X test` (`cortis test` 35, `illit test` 28) + `quiz X`. Plus type intents: `guess the kpop idol by
  picture` (7, pos 5.85), `illit game online` (8), and the killed-but-searched `name all X`.
- Coverage today: `/{slug}-quiz` + `/{slug}-trivia` cover quiz+trivia; the article
  `/articles/guess-the-kpop-idol-guide` already ranks (53 clicks pos 6.51). "test" is only implicitly
  covered; "name all / guess by picture" are quiz-TYPE gaps (DATA-19SEP: capture "name all X" as a quiz
  TYPE in the quiz house, no dedicated product).
- Fix: ensure hub titles/descriptions name "trivia" and "test" as synonyms (the trivia hub exists;
  surface "test" in the quiz-hub description), and treat "guess by picture / name all" as quiz TYPES to
  seed. Content-strategy input, not a code fix.
- Impact: broadens each hub's query surface without new pages - captures the trivia/test long tail that
  is already landing (cortis trivia CTR 48%).

---

## P2 - polish

- P2.1 Blindtest count inconsistency: desc + WebApplication JSON-LD say "300+ songs / 60+ groups"
  (`blindtest/page.tsx:14,111`) but the OG image URL hardcodes "4000+ songs across 87+ groups"
  (`:28`). Pick the true number; conflicting counts weaken trust and the OG snippet.
- P2.2 robots.txt: the generic `User-Agent: *` does NOT Disallow `/admin/ /settings/ /onboarding/`
  (only the AI-bot blocks do). Those routes are `noindex` so they will not be indexed, but Googlebot
  can still spend crawl budget on them. Add the three Disallows under `*`.
- P2.3 Missing ItemList JSON-LD on the home (`page.tsx:214` has WebSite only) and `/quizzes` (grid has
  no ItemList). Adding an ItemList of the featured/browse quizzes is a low-effort rich-result upgrade
  for the two highest-traffic non-hub pages.
- P2.4 Group-hub member faces use `alt=""` (`components/group/group-hub-sections.tsx:132`). The name is
  in an adjacent span so it is not an a11y break, but these content images on an indexable hub then
  contribute nothing to image search. Give them `alt="{member} of {group}"`.
- P2.5 `/blindtest` H1 is "Name that K-pop song" (`blindtest-game.tsx`), missing the "blind test"
  keyword the title + URL + query (`kpop blind test` pos 3.97) rank for. Minor; add "blind test" to the
  hub H1 or an eyebrow.
- P2.6 Portuguese `/pt` under-performs: Brazil = 91 clicks but CTR 3.77% (pos 8.57), `/pt` home CTR
  8.05%. The mirror exists and hreflang is reciprocal (good), but PT titles/descriptions read as
  translations, not localized hooks. Localize the PT metadata (content task).
- P2.7 Brand confusion / competitor: `kpopquiz.io`, `kpop quiz io`, `kpopquiz.oi` pull 160+ combined
  clicks at very high CTR (34-58%) and near pos 1 - users are searching for a `.io` variant (a
  competitor or a mistype of `.org`). Not on-site fixable, but a brand-defense note: reinforce
  "kpopquiz.org" in the title/OG and consider the `.io` domain.
- P2.8 Bing is the #1 referrer (DATA-19SEP: Bing 4.6k vs Google 2.9k). Google is UNDER-indexed relative
  to Bing, so the Google-side headroom is large - the P1 items above target exactly that gap. IndexNow
  (claude-seo checklist) is worth confirming for Bing freshness.

---

## Top-10 quick wins (impact / effort)

1. Fix the home `<title>` brand-doubling + head-keyword targeting - `page.tsx:31`. (P1.1) 1 line, top page.
2. Repoint the 3 dead `/games` links on indexable pages (2 article bodies + popular-page). (P1.4) minutes.
3. Confirm/settle `/news` `index:false` intent - `news/page.tsx:13`. (P0.1) 1 decision.
4. Fix the blindtest 300+/60+ vs 4000+/87+ count conflict - `blindtest/page.tsx:28`. (P2.1) 1 line.
5. Add `/admin /settings /onboarding` Disallow under `User-Agent: *` in robots. (P2.2) small.
6. Add ItemList JSON-LD to home + `/quizzes`. (P2.3) small, rich-result upside on the 2 busiest pages.
7. Give evergreen big hubs (BLACKPINK/TWICE) a harder internal-link boost + dated content line. (P1.6)
8. Add "blind test" to the `/blindtest` H1/eyebrow. (P2.5) 1 line, ranks pos 3.97 already.
9. Repoint the remaining `/games` links (blindtest, pt, news, verse-teaser). (P1.4 tail) minutes.
10. Seed the missing `/coer-quiz` hub + define the fresh-group-hub trigger. (P1.3) content pipeline.

Bigger plays for Cowork's strategy (not quick wins): the fresh-group-hub pipeline (P1.3), lifting
`/quizzes` off page 2 (P1.2), consolidating hub-vs-quiz cannibalization (P1.5), and localizing `/pt`
(P2.6). The through-line the data screams: FRESHNESS converts, the head terms are within reach on page
1, and Bing outranks Google so the Google upside is the whole game.

## What claude-seo added beyond the codebase sweep
claude-seo (v2.3.1) was cloned and read but NOT formally installed (needs the interactive `/plugin`
command + a Playwright-Chromium/Python runtime the owner asked to avoid; details in
`docs/proofs/seo-audit/claude-seo-status.txt`). Its checklist methodology still contributed, folded in
above: the Googlebot 2MB-HTML / 64MB-PDF fetch cap (checked - all key pages 101-355KB, safe), the
crawl-depth <=3-clicks-from-home lens (hubs pass via home rail + /groups), the GEO/AI-crawler +
`/llms.txt` citability check (site passes), IndexNow for Bing freshness (P2.8), and the security-header
/ URL-structure categories of its seo-technical skill (no issues surfaced beyond robots P2.2). The
plugin's live-crawl scripts (Chromium) were substituted with direct curl + the local build + the
committed GSC exports, so the numbers here are measured, not simulated.
