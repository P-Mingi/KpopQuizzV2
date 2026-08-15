# REPORT - W1 CTR SPRINT: convert earned impressions into clicks

Repo guard: `git remote -v` = `https://github.com/P-Mingi/KpopQuizzV2.git`. Correct repo.
Scope: `apps/quiz/src` metadata only. No DB schema. No push.

Gates: `npx tsc --noEmit` -> **0** · `npm run build` -> **0** · `check:routes` -> **0** ·
`check:indexability` -> **0** · NEW `check:metadata-dupes` -> see PART D.
Proofs: `docs/proofs/w1-ctr/`.

---

## The ruling that shaped this sprint (read first)

A CTR sprint already ran on 2026-07-27 (Workstream S, commits `f352812` + `41050ac`). It rewrote
10 pages and **recorded a GSC baseline whose re-check window is 2026-08-24 to 2026-08-31**
(`docs/ctr-sprint-baseline.md`). Rewriting those 10 pages again today would destroy the only
measurement we have of whether the last rewrite worked.

**So W1 deliberately does not touch them**: `/games`, `/quizzes`, `/seventeen-quiz`, `/bts-quiz`,
`/aespa-quiz`, `/blackpink-quiz`, `/twice-quiz`, `/stray-kids-quiz`, `/illit-quiz`,
`/articles/best-kpop-quiz-sites-2026`. In code that set is exactly `GROUP_SEO_OVERRIDES` (7 groups)
plus `/quizzes`, `/games` and one article. They are carried in the render proof as **CONTROLS** and
are byte-identical after this change (see PART D).

W1 therefore targets everything the July sprint did NOT: the page TYPES, the templates behind them,
and one systematic rendering bug that was corrupting titles site-wide.

---

## PART A - the target list (method + table)

**Method.** The owner holds GSC and Bing; Cowork cannot query them. So the target list is derived
from two sources that are available and checkable:

1. **Code**: every page type's title/description expression, extracted from source
   (`apps/quiz/src/app/**`), including which branch each route actually takes at render time.
2. **DB (read-only SELECT + head counts)**: URL supply per type, and `groups.total_plays` /
   `quiz_count` / `quizzes.play_count` as the reach proxy. Proof: `partA-reach.txt`,
   `partA-group-branches.txt`.

Cross-check this against the real GSC/Bing export before trusting the ranking.

### A1. URL supply and reach (DB-measured, 2026-08-15)

| Page type | URLs it mints | Reach proxy |
|---|---|---|
| `/q/{slug}` | 400 published quizzes | top quiz 2,106 plays; top 25 all >= 443 |
| `/{slug}-quiz` | 37 groups with quizzes (88 groups total) | 58,766 plays across them, **top 10 = 82%** |
| `/{slug}-trivia` | 37 eligible (>= 12 facts) | same group reach |
| sitemap total | **3,022 URLs** | the full indexable set |

Top group pages by plays: general-kpop 15,370 · bts 8,962 · stray-kids 6,386 · blackpink 4,400 ·
seventeen 2,900 · newjeans 2,307 · twice 2,273 · enhypen 2,240 · aespa 1,742 · ive 1,582.

### A2. Metadata pattern per page type, and what breaks

Full verbatim inventory of ~60 routes is in the proofs. The rule-breaking findings:

| # | Finding | Where | Severity |
|---|---|---|---|
| 1 | **Title renders `X \| KpopQuiz \| KpopQuiz`.** The route hardcodes the suffix AND inherits the root `template: '%s \| KpopQuiz'`. | 20 title expressions across 19 files | **HIGH.** Every affected snippet burns 11 characters and reads broken |
| 2 | `/leaderboard` title is `'Community'` -> renders `Community \| KpopQuiz` | `app/leaderboard/page.tsx:11` | **HIGH.** Zero keyword on an indexed page |
| 3 | 30 of 37 group pages share one generic title `'<name> Quiz - Test Your Knowledge'`: no number, no reason to click | `group-quiz-page.tsx:60` | **HIGH.** Biggest programmatic surface |
| 4 | All 37 trivia pages share `'<name> Trivia - Facts Only Fans Know'` + one description shape | `group-trivia-page.tsx:96` | MEDIUM |
| 5 | `seo_intro` description branch is **dead**: 0 of 37 groups have one >= 110 chars, so every non-override group falls to the formula | measured, `partA-group-branches.txt` | MEDIUM (informational) |
| 6 | 4 game routes return `{ title: 'Game Not Found' }` with **no description and no noindex** | `games/{sort-it,match-up,name-them-all,name-all}/[slug]` | MEDIUM |
| 7 | 8 routes return `{}` on a miss, inheriting the root default title AND description | rankings detail, pulse month, blindtest mode, `/g/{slug}`, `[slug]` | LOW (they 404 after) |
| 8 | `/search` renders no description | `app/search/page.tsx` | LOW (noindex) |
| 9 | 4 descriptions run 160 to 194 chars, past the ~150 target | `/blindtest`, `/trivia`, `/pt/games`, `/pt/blindtest` | MEDIUM |

Finding 1 was proven at render time BEFORE any edit:
`<title>K-pop Trivia and Fun Facts | KpopQuiz | KpopQuiz</title>` and
`<title>Most Played K-pop Quizzes Today | KpopQuiz | KpopQuiz</title>`.

---

## PART C - what was rewritten

Every number below is interpolated from the DB at render time, so it cannot go stale or lie.

### C1. The doubled-suffix sweep (20 title expressions, 19 files)

Removed the hardcoded ` | KpopQuiz` from the top-level `title` only. `openGraph.title` keeps its
suffix on purpose (Open Graph has no template to apply one). Routes: `/trivia`,
`/quizzes/popular-{today,this-week,this-month}`, `/blindtest`, `/blindtest/leaderboard`,
`/personality`, `/which-{group}-member-are-you` (+ its 2 miss fallbacks), `/rankings`,
`/rankings/{group}/{type}`, `/games/name-all`, `/games/name-all/{slug}`, `/games/this-or-that`,
`/games/this-or-that/all`, `/g/{slug}` (fallback branch), `/search`, and the 4 pt pages
`/pt/{games,quizzes,blindtest,leaderboard}`.

### C2. Template rewrites

| Route type | Old | New |
|---|---|---|
| `/{slug}-quiz` (30 non-override groups) | `<name> Quiz - Test Your Knowledge` | `<name> Quiz: <n> Free Fan-Made Tests` (live `quiz_count`), singular variant `<name> Quiz: Free Fan-Made Trivia Test` for the 8 one-quiz groups |
| `/{slug}-quiz` description | `Play <n>+ free ... prove you are a real <fandom>.` | exact count, no `+`, and a singular variant |
| `/{slug}-trivia` (37) | `<name> Trivia - Facts Only Fans Know` | `<name> Trivia: <n> Facts Only Real Fans Know` (the real fact count, already resolved by the eligibility gate, so no extra query) |
| `/leaderboard` | `Community` | `K-pop Fandom Leaderboard: Who Wins This Week` |

### C3. `/q/{slug}` (400 URLs, the biggest page type)

Both changes were driven by real collisions the new gate found, not by taste.

- **Description** now leads with the quiz's own title:
  `"<title>: a <difficulty> <n>-question K-pop quiz on <group>, made by <creator>. <plays> fans have
  played it, scoring <avg>% on average. Can you beat them?"`. The old wording never named the quiz,
  so two different quizzes could render byte-identical text. The creator-note override still wins
  when a creator wrote one.
- **Title truncation** is now a middle-ellipsis. Quiz titles here are routinely distinguished by
  their last words (`... girl groups` vs `... boy groups`), which head-truncation deleted.

### C4. Hygiene

- The 4 `Game Not Found` fallbacks now emit `robots: { index: false, follow: true }`.
- 4 over-length descriptions trimmed to 138 to 151 chars.

**Deliberately NOT changed:** the 10 pages in the July measurement window; the `seo_intro` branch
(kept as an editorial escape hatch, but it is dead today and would silently bypass the new
description if an admin filled it); noindex app-shell titles (`/settings`, `/admin`, `/banned`,
quiz edit) which also carry the doubled suffix but earn zero impressions.

---

## PART D - proof

### D1. `check:indexability` still green

`INDEX_EXIT=0`. 3,022 sitemap URLs, 42 sampled, every one index-consistent with a title and a
self-canonical. 2 pre-existing soft warnings on deep-ISR verse pages (covered by the prod monitor,
unrelated to this change). Proof: `check-indexability.log`.

### D2. NEW gate: `check:metadata-dupes`

`apps/quiz/scripts/check-metadata-dupes.mts`, wired as `pnpm --filter quiz check:metadata-dupes`.
It pulls the sitemap, fetches **every** URL in it, and fails if two indexable URLs render an
identical `<title>` or an identical `<meta name="description">`, or if an indexable URL renders no
description at all. Skipped (non-200) URLs are listed, never silently dropped.

**It is RED, and that is the honest result.** Run against the production build:

```
Duplicate-metadata gate FAILED (8 collision group(s)) across 973 checked URLs
Skipped 2049 URL(s) that did not return 200   <- 2049 of 2049 are /verse
```

Coverage: **zero non-verse URLs were skipped**, so the entire quiz surface (973 URLs) was checked.
The skipped set is the documented deep on-demand ISR behaviour that `check:indexability` already
treats as a soft status locally.

The gate paid for itself on its first run. It found **11 collision groups**, 4 of them on the quiz
side, and this sprint closed 3 of the 4:

| Collision | Cause | Status |
|---|---|---|
| 2 `/q/*` pairs with an IDENTICAL description | the template named the GROUP but never the quiz, so same group + difficulty + question count + creator + plays + average collided | **FIXED** by leading the description with the quiz's own title |
| `/q/guess-the-common-song-title...` vs `...-2` | both titles exceed the budget and share a 48-char prefix, so head-truncation erased the difference | **FIXED** by middle-ellipsis (`Guess the common so...artists (2)`) |
| `/q/...lightstick-girl-groups` vs `...-boy-groups` | a regression I introduced mid-sprint (see deviation 7) | **FIXED** by the same middle-ellipsis |
| `/q/seventeen-true-or-false` vs `...-65` | two published quizzes with a byte-identical title and the same question count | **NOT FIXED. Owner decision** (see BLOCKED.md) |
| 7 groups in `/verse/*` (incl. 228 URLs sharing one space description) | pre-existing, out of scope, Verse is paused | **NOT TOUCHED** |

Proofs: `partD-dupes.txt` (full run), `partD-q-collisions.txt` (the DB rows behind the `/q` pairs).

### D3. Before/after (rendered, not asserted)

Rendered from a **production build** (`next build` + `next start`), not the dev server, because the
dev server was caching stale server components. Old values are the pre-edit source string plus the
root template; that method was validated against the two genuine pre-edit renders quoted in PART A.
Full capture: `partD-render-AFTER.txt`.

| Route | Old title (rendered) | Len | New title (rendered) | Len |
|---|---|---|---|---|
| `/trivia` | K-pop Trivia and Fun Facts \| KpopQuiz \| KpopQuiz | 48 | K-pop Trivia and Fun Facts \| KpopQuiz | 37 |
| `/quizzes/popular-today` | Most Played K-pop Quizzes Today \| KpopQuiz \| KpopQuiz | 53 | Most Played K-pop Quizzes Today \| KpopQuiz | 42 |
| `/quizzes/popular-this-week` | ... This Week \| KpopQuiz \| KpopQuiz | 57 | Most Played K-pop Quizzes This Week \| KpopQuiz | 46 |
| `/quizzes/popular-this-month` | ... This Month \| KpopQuiz \| KpopQuiz | 58 | Most Played K-pop Quizzes This Month \| KpopQuiz | 47 |
| `/blindtest` | K-pop Blind Test - Guess the Song from a Clip \| KpopQuiz \| KpopQuiz | 67 | K-pop Blind Test - Guess the Song from a Clip \| KpopQuiz | 56 |
| `/personality` | Which K-pop Member Are You? Personality Quizzes \| KpopQuiz \| KpopQuiz | 69 | Which K-pop Member Are You? Personality Quizzes \| KpopQuiz | 58 |
| `/which-ateez-member-are-you` | Which ATEEZ Member Are You? \| KpopQuiz \| KpopQuiz | 49 | Which ATEEZ Member Are You? \| KpopQuiz | 38 |
| `/rankings` | K-pop Fan Rankings \| KpopQuiz \| KpopQuiz | 40 | K-pop Fan Rankings \| KpopQuiz | 29 |
| `/games/name-all` | Name All Members - K-pop Typing Game \| KpopQuiz \| KpopQuiz | 58 | Name All Members - K-pop Typing Game \| KpopQuiz | 47 |
| `/games/this-or-that` | This or That - K-pop Fan Rankings \| KpopQuiz \| KpopQuiz | 55 | This or That - K-pop Fan Rankings \| KpopQuiz | 44 |
| `/games/this-or-that/all` | All This or That Matchups \| KpopQuiz \| KpopQuiz | 47 | All This or That Matchups \| KpopQuiz | 36 |
| `/leaderboard` | Community \| KpopQuiz | 20 | K-pop Fandom Leaderboard: Who Wins This Week \| KpopQuiz | 55 |
| `/enhypen-quiz` | ENHYPEN Quiz - Test Your Knowledge \| KpopQuiz | 45 | ENHYPEN Quiz: 7 Free Fan-Made Tests \| KpopQuiz | 46 |
| `/ive-quiz` | IVE Quiz - Test Your Knowledge \| KpopQuiz | 41 | IVE Quiz: 8 Free Fan-Made Tests \| KpopQuiz | 42 |
| `/tws-quiz` | TWS Quiz - Test Your Knowledge \| KpopQuiz | 41 | TWS Quiz: Free Fan-Made Trivia Test \| KpopQuiz | 46 |
| `/enhypen-trivia` | ENHYPEN Trivia - Facts Only Fans Know \| KpopQuiz | 48 | ENHYPEN Trivia: 26 Facts Only Real Fans Know \| KpopQuiz | 55 |
| `/got7-trivia` | GOT7 Trivia - Facts Only Fans Know \| KpopQuiz | 45 | GOT7 Trivia: 19 Facts Only Real Fans Know \| KpopQuiz | 52 |
| `/pt/games` | Jogos de K-pop Gratis - This or That, Membros e Mais \| KpopQuiz \| KpopQuiz | 74 | Jogos de K-pop Gratis: Bias, Membros e Blind Test \| KpopQuiz | 60 |
| `/pt/quizzes` | Quiz de K-pop - Todos os Quizzes \| KpopQuiz \| KpopQuiz | 54 | Quiz de K-pop - Todos os Quizzes \| KpopQuiz | 43 |
| `/pt/blindtest` | Blind Test de K-pop - Adivinhe a Musica pelo Clipe \| KpopQuiz \| KpopQuiz | 72 | Blind Test de K-pop: Adivinhe a Musica pelo Clipe \| KpopQuiz | 60 |
| `/pt/leaderboard` | Ranking de K-pop - Top Fas e Criadores \| KpopQuiz \| KpopQuiz | 60 | Ranking de K-pop - Top Fas e Criadores \| KpopQuiz | 49 |

Descriptions changed (chars): `/blindtest` 194 -> 138 · `/trivia` 164 -> 151 · `/pt/games` 164 ->
147 · `/pt/blindtest` 161 -> 143 · `/leaderboard` 166 -> 138 · every `/{slug}-quiz` and
`/{slug}-trivia` description now carries a live count (examples: ENHYPEN 143, IVE 133, TWS 137,
ENHYPEN trivia 156, GOT7 trivia 153).

**CONTROLS, unchanged as required:** `/bts-quiz` 57 · `/games` 62 · `/quizzes` 63 ·
`/seventeen-quiz` 62 · `/illit-quiz` 59, all identical to their pre-sprint values.

---

## Deviations and flags (loud)

1. **The July 10 pages were excluded on purpose.** Rewriting them now would void the 2026-08-24
   re-check. If the owner wants them in scope anyway, that is a deliberate trade and needs saying.
2. **Two titles still sit at exactly 60 chars** (`/pt/games`, `/pt/blindtest`) and `/personality`
   at 58. Under the ~60 rule but with no slack. Portuguese is simply longer.
3. **`seo_intro` is a live trap.** It is empty on all 37 groups today, so it changes nothing now,
   but filling it in the admin would silently replace the new CTR description. Either delete the
   branch or make it additive. Owner call, so it was left alone.
4. **The dev server serves stale server components**, so the first two render captures were wrong
   and were discarded; every number in PART D comes from a clean production build. Same trap as the
   recorded `.next` cache issue.
5. **No GSC/Bing query was possible.** The ranking in PART A is a code + DB proxy. It needs the
   owner's real export to confirm which of these types actually sit at positions 5 to 15.
6. `/{slug}-quiz` titles got slightly LONGER for some groups (45 -> 46 chars) because a real number
   replaced a generic phrase. That is the intended trade: specificity over brevity, still under 60.
7. **I introduced a regression and the new gate caught it.** My first `/q` title fix kept the
   question count by truncating the title harder, which made `...lightstick-girl-groups` and
   `...-boy-groups` render one identical title. The gate went 11 groups -> 10 with a NEW one in it.
   Middle-ellipsis fixed it properly. Recording it because it is the clearest evidence the gate
   works: without it this ships silently.
8. **The gate ships RED.** One quiz-side collision (a genuine duplicate quiz) and 7 in `/verse` are
   left. I did not scope `/verse` out of the gate to make it green: hiding a real duplicate-metadata
   problem behind a narrowed gate is exactly the failure the gate exists to prevent. It goes green
   when the owner rules on BLOCKED.md and Verse comes off pause.

## Next

Measurement, not more edits. Record today as the W1 baseline, then re-check CTR at 3 to 4 weeks on
the rewritten types. The July 10 come out of their freeze on 2026-08-24 and can be re-read then.

---

STOP. **Nothing was pushed** - W1 is a local commit on `main`. report pret.
