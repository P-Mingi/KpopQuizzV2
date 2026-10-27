# Anime quiz pages: handoff for the SEO work on /q/ (from run O1, 2026-10-27)

For the worker who does the quiz page SEO in the shared code after the A5 merge, for KpopQuiz and OtakuQuiz. Run O1 does not touch
/q/ until then. Everything below is on `o1/integration` (on `main` after A5).

## 1. Where the verified anime facts are

- Source of truth, in the repo: `docs/anime/data/` (50 series).
  - `series/<slug>.json`: the series, its arcs (`ord`, episode and chapter ranges, `manga_only`, `anime_only`), its characters
    (`slug`, `name`, `debut_arc_ord`, `spoiler_level`, `identity_spoiler`), its themes (openings and endings).
  - `facts/<slug>.json`: one array of facts. Fields: `id`, `entity` (`kind` series, arc, character or theme; `group_slug`; `ref`, the
    character slug, arc ord or theme key), `field`, `value`, `text` (our own words), `spoiler` (`arc`, `scope` anime or manga or
    both), `load_bearing` (dates, counts, creators), `sources` (Wikipedia with revision id, Wikidata, official, publisher; press for
    Oricon sales and ANN announcements), `excerpt` (a literal line of the cited page), `status` (only `verified` may be shown).
  - `quizzes/<slug>/*.json`: each question has `fact_ids` (the facts it rests on), `spoiler` (`arc`, `scope`) and sometimes
    `fun_fact` (103 of 2650 questions today).
  - `personality/<slug>.json`: the "Which character are you" sets (10 series).
- In the database (site_id `anime`), loaded by `scripts/anime/k1/load-fixtures.mjs` and, in production, by the launch files
  `docs/pending-migrations/multisite/launch/L04` to `L10`:
  - `trivia` (entity_kind, entity_id, the fact `text`, category, source, source_url, status `published` for verified facts only);
  - `entity_sources` (entity_type, entity_id, field, source, url): one row per source of a fact;
  - `series`, `arcs`, `characters` (with `spoiler_level`), `series_themes`; `quizzes.questions` (JSON, with `fact_ids` and
    `spoiler` kept per question), `quizzes.spoiler_arc_ord` and `quizzes.spoiler_scope` (the quiz level).
- Checks that guard them: `node scripts/anime/editorial/check.mjs docs/anime/data` (C1 to C14: C2 sourcing, C3 every cited fact
  exists and is verified, C5 spoilers), `node scripts/anime/k1/validate-data.mjs`. Every new or changed question was re-checked on
  its page (`docs/anime/data/verify/*.json`).

## 2. How to link a question to its series and characters

- Series: the quiz's `group_slug` (the series slug; `anime-mix` is the general group, its questions span several series: use each
  cited fact's `entity.group_slug`). Canonical series hub: `/{series}-quiz` on otakuquiz.org (registry route `/{series}-quiz`).
- Characters: a question's `fact_ids` lead to facts whose `entity.kind` is `character`; `entity.ref` is the character slug in
  `series/<slug>.json`. Character pages: the "Which character are you" page is `/which-{series}-character-are-you`.
- Sources: the facts' `sources` (or `entity_sources` in the database) give the citation for an explanation or a ClaimReview-like
  block; show the Wikipedia or official page, never a copy of its text (C7 copy guard).
- Never cite a fact whose `status` is not `verified`; never show `excerpt` as page text (it is the proof, not our wording).

## 3. What is special on the anime quiz pages: spoilers

- Each question carries `spoiler.arc` (0 = spoiler free) and `spoiler.scope`. The quiz level (`quizzes.spoiler_arc_ord`,
  `spoiler_scope`) is computed by `apps/quiz/src/lib/anime/spoilers/core.ts` (`computeSpoilerLevel`), never copied from a file.
- The /q/ page today (see `apps/quiz/src/lib/anime/quiz-page.test.ts`): a quiz above arc 0 shows a spoiler interstitial; the
  questions tagged above arc 0 are dropped from the lists and masked in the sample, so their text reaches neither the HTML nor the
  JSON-LD. Keep that: anything rendered for crawlers (FAQ, Quiz, ItemList JSON-LD, meta description, OG text, llms.txt) holds only
  arc 0 content unless the visitor has passed the interstitial on the client.
- The rule for every explanation, answer reveal, fun fact, "why" text or JSON-LD answer: it may not reveal more than the spoiler
  level of its own question. Concretely, an explanation for a question tagged arc N uses only facts whose `spoiler.arc` is N or
  lower and whose `scope` is covered by the question's scope; it never names a character whose `spoiler_level` is above N or whose
  `identity_spoiler` is true below that level. The editorial check C5 already enforces this for question texts and `fun_fact`:
  run it on any new text you generate.
- Quiz titles and descriptions say nothing beyond arc 0 (`title_gives_nothing_away`); hard quizzes that need late facts say
  "spoilers" in their description.
- The site is noindex until `NET_INDEXING=1` on launch day (`apps/quiz/src/lib/site/indexing.ts`): build the SEO so it is right on
  that day; check pages with the flag on in a local build.

## 4. Useful pointers

- Registry (routes, vocabulary series and character, origins): `apps/quiz/src/lib/site/registry.ts`.
- Series images (owner's admin images first, then the bundled photo, else a title card): `apps/quiz/src/lib/anime/entity-images-read.ts`;
  credits on `/credits`.
- Run O1 decisions: `docs/o1/LEDGER.md` (D-099 to D-126); SEO rules of the repo: the `kpopquiz-seo` skill.
