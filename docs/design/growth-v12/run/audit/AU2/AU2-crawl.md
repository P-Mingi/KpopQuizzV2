# AU2 crawl: quiz pages, group hubs and profiles against the database (2026-10-04)

Progress: DONE. 581 URLs checked (433 quizzes, 93 hubs, 55 profiles), 0 real discrepancies; 1 normalized
group (play counters behind the cache), 1 low data note.

Target: ORCH's flag-on production build of feat/v12 on http://localhost:3071 (both flags on), production data.
Crawled by AU5 under AU2's paths. Method: plain HTTP GET of the server HTML (no browser, no write of any kind),
batches of 50, 3 requests at a time, every image probed with a GET (the `/_next/image` URL the page serves AND its
source file or remote URL: 200, `image/*`, non-empty). Expected values: read-only service-role selects taken at
21:37 UTC (`editorial_accounts`, `groups`, `quizzes` status published, `profiles`, and `plays` for the lag check).
Raw JSON (local, not committed): `run/audit/AU2/crawl/{quizzes,quizzes-pass2,quizzes-plays-lag,hubs,hubs-pass2,profiles,profiles-sample}.json`.

What each page is supposed to show (read from the code, then compared):
- `/q/<slug>` (`app/(site)/q/[slug]/ux-page.tsx`, `components/quiz/ux-v1/quiz-page.tsx`): cover =
  `quizzes.cover_image_url`, else the group photo (`groupPhotoUrl`), else the typographic cover; "N plays" =
  `quizzes.play_count` (via `getQuizBySlug`, 1 h `unstable_cache`, page ISR); author = the creator's
  `profiles.username`; level = `getLevelInfo(profiles.xp)`; Team badge and no level when the creator is in
  `editorial_accounts` (active).
- `/<slug>-quiz` (`components/group/ux-v1/hub.tsx`): photo = `groupPhotoUrl(slug)` else the typographic hero
  (`p3-hero is-solo`); "N quizzes" fact = published quizzes of the group (not `groups.quiz_count`); every quiz a
  card with `formatCount(quizzes.play_count)` plays (`getHubQuizzes`, 1 h cache). The hub shows no group plays total.
- `/u/<username>` (`components/profile/ux-v1/passport.tsx`): avatar image by the `PassportAvatar` rule, else
  initials; chip "Lv N · Title" from `profiles.xp`; editorial: team avatar, Team badge, "KpopQuiz team" chip,
  team note.

## Totals

| Kind | Checked | 200 | OK | Discrepancies | Normalized |
|---|---|---|---|---|---|
| Quiz pages `/q/<slug>` (every published quiz) | 433 | 433 | 433 | 0 | 31 play counts behind in pass 1, 2 in pass 2 |
| Group hubs `/<slug>-quiz` (every visible group: 94 rows minus `zzz-*`) | 93 | 93 | 93 | 0 | 13 card counts on 7 hubs in pass 1, 3 on 3 hubs in pass 2 |
| Profiles `/u/<username>` (50 random + the 5 editorial not drawn) | 55 | 55 | 55 | 0 | none |

Quiz pages in detail:
- Picture: 274 show an image (91 their own cover, 183 the group photo; 113 distinct images), each one equal to
  the expected source and answering 200 both through `/_next/image` and at the source. 159 show the typographic
  cover, all correct (no cover, no group photo file): general-kpop 143, nct 3, tuide 2, monsta-x 2, illit 2, and
  1 each for loona, team, xikers, akmu, astro, tws, dreamcatcher.
- Author line: 433 of 433 link the right creator.
- Badge or level: the 155 quizzes by the 9 editorial accounts show the Team badge (author line and "Made by"
  card) and no level anywhere on the page; the 278 others show the level that `profiles.xp` gives, no badge.
- Plays: see "Normalized" below; after normalization every shown count equals `quizzes.play_count`.

Group hubs in detail:
- Photo: 33 hubs show the group photo, all load (source and `/_next/image`); 60 show the typographic hero, all
  correct (no file in `public/idols/` named after any of these groups: checked by name against all 211 files).
- Quiz count: 93 of 93 equal the published count (45 hubs with quizzes; the 48 empty hubs show no count).
- Cards: all 433 published quizzes appear as a card on their own hub (server HTML); card plays as below.

Profiles in detail (sample: seeded shuffle, mulberry32 seed 20261004, of the 281 profiles sorted by id, first 50):
moa_fangirl233, wonmin, evaloveillityunah, kenji, hoonsjaeyunie, seungminindebuilding, ht16, haha, lizra, testtest,
val, newjeans, guizu, angelcoer, minminjiiy, strawbxrry, gllit_elisse, drunken_spillz, haodareyou, notyourbae,
jellytaengs, enji, multistan_143, catkitty, lune8, kenjii, twiceland, jennie, enr1k3, everestaxolotl,
yoongis_battery_life, caratland, illit_iroha, rebellecup, omgiamaeyekon, bbnexdo, ilovehyein08, telyugeulis, emma,
njeansstan, susu, niki1glazer, sweetrosegirl23, elevan67, joonified, ateez8makes1team, sheennaglitt, yeoni,
eomfreak, 1004hp. Four of them are editorial (twiceland, caratland, njeansstan, joonified); the other five
editorial accounts were added (skzrealm, soojinnie, kpophistory, pinkvelvet, exoplanet99).
- Avatar: 2 images (newjeans, strawbxrry), both 200; 44 initials placeholders where no image is set; 9 team avatars.
- Level: 46 of 46 fans show "Lv N · Title" equal to their XP (Lv 1 to Lv 6).
- Team: badge, "KpopQuiz team" chip and team note on 9 of 9 editorial accounts, on 0 of 46 fans.

## Discrepancies

None.

## Normalized (COMMON rule 12, live counters)

N1. Play counts behind the database by 1 to 3 (quiz page header and hub cards). Pass 1: 31 quiz pages and 13
hub cards on 7 hubs (twice, ive, red-velvet, le-sserafim, itzy, general-kpop, illit). Every gap is covered by
`plays` rows created in the last 5 hours (`quizzes-plays-lag.json`: gap <= recent rows on 31 of 31). The first GET
served the stale ISR copy and triggered a re-render: pass 2, one minute later, matched on 431 of 433 quiz pages and
on 90 of 93 hubs. The rest (`/q/skz-true-or-false-only-real-stays-pass` 1540 vs 1541,
`/q/which-k-pop-group-has-more-members` 9 vs 11, and the cards for `twice-members-once-test`,
`which-k-pop-group-has-more-members`, `only-a-real-gllit-can-pass-this` on /twice-quiz, /general-kpop-quiz,
/illit-quiz) have plays at 21:18 to 21:22 UTC, inside the 1 h `unstable_cache` of `getQuizBySlug` and
`getHubQuizzes`. Cause: caching by design, the column read is the right one. No action.

## Note (low, owner)

1. The 9 editorial accounts hold XP in `profiles.xp` (4,927 to 14,365). Nothing shows it (no level on their
   profile, author line or "Made by" card), but SYSTEM.md 5.6 says they have no XP. If the owner wants the stored
   value to match, that is a data change (pending SQL by its owner), not a display fix.
