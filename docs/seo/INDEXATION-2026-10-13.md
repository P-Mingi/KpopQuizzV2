# Indexation sprint, 2026-10-13

Branch `seo/indexation-max` (from `main` dce3a0f). Not pushed: owner-gated.
Input: the Google Search Console exports of 2026-10-13 (Coverage, Performance), a crawl of
the 721 sitemap URLs on a flags-on dev server, and a read of the published catalogue.

## Where Google stood (GSC Coverage, 2026-10-09)

| | Pages |
|---|---|
| Indexed | 607 |
| Not indexed | 518 |
| Crawled, currently not indexed | 241 |
| Discovered, currently not indexed | 154 |
| Alternate page with proper canonical | 46 (intended) |
| Excluded by noindex | 41 (intended) |
| Page with redirect | 25 (intended) |
| Blocked by robots.txt | 6 |
| Not found (404) | 3 |
| Redirect error | 2 |

The not-indexed quizzes were not worse quizzes: median 74 plays and 7 questions, some with
more than 1,500 plays and zero impressions. Google crawled them and left them out because
of how the pages were served, not because of what fans wrote.

## Root causes found, and the fix for each

| Cause | Effect on Google | Fix | Commit |
|---|---|---|---|
| `loading.tsx` on /q, /new, /trending, easy/hard, /u, /g | The HTML Google receives has a spinner in `<main>`; the content arrives later in a hidden streamed block. A `notFound()` after the shell is a soft 404 | Removed: content is in the server HTML, missing slugs are real 404s | d426cef, 2aa4816 |
| robots.txt blocked `/api/` | The v11 stylesheet `/api/ux-v1/a0/styles` was unreadable: Google rendered unstyled pages | `/api/og/` and the stylesheet path allowed | 2aa4816 |
| /blindtest/group-* (about 90 URLs) at about 22 words | Thin, template | Real page: songs, albums, years, group links; made-up groups 404 | d426cef |
| Made-up /q, /g, /blindtest/group slugs answered 200 | Soft 404 | True 404 | d426cef, 2aa4816 |
| Quiz titles cut mid-word, template descriptions, "Played by 0 fans" | Weak snippets, near-duplicate meta | `lib/seo/quiz-meta.ts`, tested | 2aa4816 |
| Related quizzes: the same top 6 everywhere | Weak internal linking of new quizzes | Popular and newest of the group, interleaved | 2aa4816 |
| Sitemap lastmod = `updated_at`, bumped by every play | Google learns to ignore lastmod site-wide | `created_at` | 2aa4816, d183b9e |
| Sitemap built only at deploy | A new quiz waited for the next deploy to be listed | `revalidate = 3600` | d183b9e |
| Sitemap quiz read `.limit()` | Silent stop at 1000 quizzes | `fetchAllRows` | d183b9e |
| Hub "29+ quizzes" from `groups.quiz_count` (counts drafts) | Untrue title, description, ItemList | Published count; empty hub is noindex | d183b9e |
| Nothing refreshed on publish; IndexNow ping as a bare `void` | New quiz absent from /new and its hub for up to 6 h; ping could be dropped | `lib/seo/quiz-freshness.ts` | 74e63a3 |
| Slugs: trailing hyphen, accents dropped, mid-word cut, `quiz-<timestamp>` | Ugly or meaningless URLs | `generateSlug` rewritten, tested; existing slugs untouched | 74e63a3 |
| Name them all (58 words) and Which member are you (73 words) | Thin, same template on every group | Server-rendered real content below the game | b66e4dc |
| 18 blindtest mode pages at about 32 words; 5 of them play the classic pool | Thin and near copies | Real pool listed; the 5 copies canonical to /blindtest/classic and out of the sitemap | fca6d24, 0fe50cf |
| /quizzes facets: `lang`, unknown params, `?page=999` indexable | Unbounded duplicate URL space | Pure index rule: only /quizzes, pages 2..N and the sole group facet index; the rest noindex,follow | 016ec26 |
| /news: 20 `NewsArticle` entities for Soompi, Koreaboo and allkpop URLs; one bad feed date 500s the page | Structured data claiming third-party articles; crash risk | `ItemList` of links; feed dates that cannot throw | 016ec26 |
| Trivia facts: emoji walls, notes to the player, answer restatements, other languages | Low-quality text on 25 pages | `isUsableFact` before the count; floor 9 clean facts (was 12 with junk); /cortis-trivia and /illit-trivia kept | 36af251 |
| `UserAvatar` handed `next/image` any avatar host | A profile with a `share.google` avatar 500s /pt/leaderboard on its next render | Unregistered host shows initials | 95020ac |

## Every new quiz, from publish to index

1. The creator publishes: `/api/quiz/create`.
2. Slug from the title: readable, no stray hyphen, accents folded.
3. In the same request, `onQuizChanged('published')`:
   - the `quizzes` and `groups` caches expire now;
   - /q/slug, the group hub, /new, / and /sitemap.xml re-render on their next hit.
4. Once the response is sent, `after()` pings IndexNow (Bing, Yandex, Seznam) with the quiz,
   its hub and /new.
5. The page itself:
   - server-rendered, no spinner, 404 if it does not exist;
   - a title that is never cut inside a word;
   - a real description;
   - Quiz and Breadcrumb JSON-LD with `dateModified` = `created_at`;
   - links to its group's popular and newest quizzes.
6. The hub lists it in "Newest", with the true published count in its title. The sitemap
   lists it within the hour with its real creation date.

Edits and removals use the same path. A removed quiz 404s at once, not after its hour of
ISR.

## Pages before and after (words in `<main>`, flags-on dev server)

| Page | Before | After |
|---|---|---|
| /q/ultimate-bts-era-quiz-only-real-armys-survive | spinner, content streamed | 697 in the HTML |
| /blindtest/group-bts | 22 | 213 |
| /stray-kids-name-all-members | 58 | 294 |
| /which-stray-kids-member-are-you | 73 | 451 |
| /blindtest/girl-groups (and 12 other modes) | 31 to 36 | about 300 |

## Checks

- **Tests and types:** `vitest` 2175 tests pass (117 files plus the new ones), and `tsc --noEmit` is clean.
- **Static gates:**
  - `check:routes` passes (382 routes);
  - `check:docs-secrets` passes;
  - `check:sitemap-hygiene` passes (720 URLs, all 15 priority hubs).
- **`check:indexability`** on the flags-on dev server, 724 URLs:
  - 713 pass;
  - 6 answered 500 under the gate's own load: 4 quiz pages hit the deliberate 8 s read timeout, /blindtest/classic hit a transient dev cache read, and /pt/leaderboard was the avatar bug, now fixed in 95020ac. All 6 answer 200 when fetched alone;
  - 5 timed out on dev: /data/pulse months and /verse.
- **`check:metadata-dupes`:** passes on the 494 URLs the dev server answered in time.
- **Live checks on the dev server:**
  - a made-up /q, /g, /blindtest/group or hub slug is a 404;
  - hub titles show published counts (BLACKPINK 24+, BTS 27+);
  - /cortis-trivia and /illit-trivia answer 200.

## Decisions to review

- **Duplicate blindtest modes:** intro-challenge, verse-only, bridge-or-break, speed-round
  and random-all now canonical to /blindtest/classic. Under v12 they play the same pool,
  because generate has no clip point and no clip length.
- **Trivia floor:** 12 facts with junk became 9 usable facts. The filter alone would have
  made /cortis-trivia (93 clicks) and /illit-trivia 404. MONSTA X and ASTRO trivia open,
  with 10 clean facts each.
- **`/quizzes?page=999`:** noindex,follow with a canonical to /quizzes, not a 404, because
  `e2e/ux-v1/p2.spec.ts` pins "a page past the end shows page 1".
- **Hubs with no published quiz:** noindex,follow, and the sitemap already left them out.

## Owner actions

- Push and merge, in order: `fix/community-feed-vote`, `seo/indexation-max`,
  `v12/launch-report`.
- After the deploy, in Search Console:
  - resubmit `https://kpopquiz.org/sitemap.xml`;
  - press "Validate fix" on "Crawled, currently not indexed" and on "Blocked by robots.txt".
- Optional: run the nightly `seo-gates.yml` with `NEXT_PUBLIC_UX_V1=1` and
  `NEXT_PUBLIC_UX_V12=1`. Production runs with them; the gates today check the flags-off
  site.
