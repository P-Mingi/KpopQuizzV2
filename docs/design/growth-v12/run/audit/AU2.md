# AU2 audit: play modes on real data (2026-10-04)

Progress: DONE. 6 features ok, 1 issue (Fans picked empty), 0 not checked; 3 low notes.

Target: ORCH's flag-on production build of feat/v12 (a247dee code) on http://localhost:3071, production data.
Screenshots: `run/audit/AU2/` (local only), `d-` = 1440 light, `m-` = 390 light. Raw run data: `run/audit/AU2/*.json` (local).
Method: scratch Playwright scripts (Chromium headless shell 1234), every non-GET to `/api/**` or Supabase
answered locally (guardWrites semantics), except the two owner-approved writes under "Test writes". SEO fields
read with curl on the served HTML; data checked with read-only service-role selects.

## Table

| Feature | URL(s) | Visible | Works | What I did | Screenshots | Issue |
|---|---|---|---|---|---|---|
| Which member are you, 15 groups | `/which-<group>-member-are-you` for aespa, ateez, blackpink, bts, enhypen, g-i-dle, itzy, ive, le-sserafim, newjeans, nmixx, seventeen, stray-kids, twice, txt | yes | yes | All 15 in the sitemap, 200, one H1, own title, description, canonical, 6 JSON-LD blocks. Played the 8 questions on each at 1440 and 390 (30 runs): result card (name, role, 3 traits), "N% of <fandom> got X", "How everyone came out" with the total. aespa 92 / bts 137 / stray-kids 195 / twice 58 totals and the aespa split (61/35/4) equal `personality_results`. The result POST was stubbed (payload `{quiz:"wma",group,picks[8]}`). No broken image, no 4xx. | `d-`/`m-which-<group>-member-are-you-{intro,result}.png` | none |
| Which member, other groups | `/which-red-velvet-member-are-you`, `/which-shinee-member-are-you` | n/a | yes | 308 to the group hub as in v11 (no profile set). | - | none |
| KPop Demon Hunters quiz | `/kpop-demon-hunters-quiz` | yes | yes | 200, in sitemap, title "Loved HUNTR/X? Find your real K-pop girl group". 6 questions at 1440 (BLACKPINK) and 390 (LE SSERAFIM): group photo from `/idols/`, 3 traits, 3 songs with year, blindtest and hub links (`/blindtest/group-blackpink`, `/blackpink-quiz`) answer. No share line or distribution (too few results, hidden by rule). POST stubbed. | `d-`/`m-kpop-demon-hunters-quiz-{intro,result}.png` | none |
| Name them all, 17 groups | `/<group>-name-all-members` for bts, blackpink, stray-kids, twice, aespa, newjeans, seventeen, exo, g-i-dle, ive, le-sserafim, red-velvet, ateez, enhypen, txt, itzy, shinee | yes | yes | All 17 in sitemap, 200, `index, follow`, canonical to itself; internal `/name-all/bts` is `noindex` with the pretty canonical; `/nct-name-all-members` 404 (owner decision 12). Member count in each title equals the active `idols` rows (17 of 17). Played every group at 1440 and 390: lower case, Hangul birth names (김석진, 박채영, 이지훈, 수호, 허윤진...), one-letter typos (Seulgu, Wendi) accepted; transposed letters (Jenogyeon) and the Japanese or Chinese stored names (モモ, 宋雨琦, 直井怜) refused, matching `lib/name-all/match.ts` and the intro copy ("Hangul"); duplicate says "X is already in"; Give up reveals the rest; end screen score, time, Share, Again. No community line (fewer than 30 new-shape rounds, by rule). | `d-`/`m-nta-<group>-{intro,end}.png`, `d-nta-<group>-play.png` | none |
| Name them all, real round | `/aespa-name-all-members` | yes | yes | One guest round at 1440, 4 of 4 typed: POST `/api/name-all/result` answered 200 `{"ok":true}`, 4 rows in the new shape (`found_order` 1..4, `round_seconds` 1). | `d-nta-aespa-play.png` | none |
| This or that on quiz results | `/q/<quiz>` results | yes | yes | Pairs API for all 84 active song questions (fresh anon id each): 84 of 84 give 5 pairs, 840 options, 585 distinct Deezer covers all answer 200, 678 of 840 options carry a year. Played to the end (play POST stubbed) 6 quizzes at 1440 and 390: card on NewJeans, TWICE (true/false), KATSEYE, BTS; no card on the general company quiz and on `nct-127-basics` (group `nct`, see note 2). Covers load (264x264). One real vote (below): "Vote counted. This pair needs more votes before it shows a split." Skip before a vote removes the card (by design). | `d-`/`m-tot-<quiz>-{card,cardonly}.png`, `d-tot-newjeans-...-voted.png`, `*-nocard.png` | none |
| Fans picked data | `/api/duel/fans-picked?group=` bts, blackpink, stray-kids, twice, aespa (+ newjeans, seventeen, katseye, riize) | no | no | Every group answers `ranked:false, votes:null, updatedAt:null, songs:[]`, so the hub section is hidden. Bad slug answers 400. | - | AU2-001 |

## Issues

### AU2-001 Fans picked is empty although real votes exist (medium; owner G7, run by ORCH or the owner)
- Expected: SYSTEM.md 5.3, "<Fandom> picked" shows the top 10 songs once a group passes its threshold
  (owner decision 8: from 100 counted votes, or the question's `min_votes` if higher).
- Actual: `/api/duel/fans-picked` answers `ranked:false, updatedAt:null, songs:[]` for every group, and the hub
  section (`components/group/ux-v1/hub-fans-picked.tsx`) is not rendered.
- Evidence (read only): `duel_song_rankings` has 0 rows. Votes on the song questions: aespa 2,262, BLACKPINK 1,282,
  BTS 1,160 (each `min_votes` 500); Stray Kids and TWICE 0 (their questions are new, `min_votes` 100).
- Suspected cause: not a code defect seen so far. `duel_song_rankings` is only filled by the nightly cron
  `/api/cron/fans-picked` (`vercel.json`, 03:40), which never ran: the SQL was applied today and :3071 is a local
  build with no cron. Fix: run that cron once with the cron secret where the flag is on (owner or ORCH), then
  re-read this API. NOT verified: whether the cron's counting rules (voter hash, one vote per pair per day,
  editorial exclusion) keep aespa, BLACKPINK and BTS above 500 counted votes.

## Notes (low, no action needed unless the owner wants it)
1. KATSEYE pair titles are the raw catalogue titles, long on a phone card: "Flame (from the Netflix Series "Jentry
   Chau vs the Underworld")", "Touch (ft. YEONJUN of TOMORROW X TOGETHER)" (`m-tot-are-you-a-real-eyekon-cardonly.png`).
   Data, G2 catalogue.
2. Quizzes filed under the group `nct` (e.g. `nct-127-basics`, 288 plays) get no This or that card: the song
   question exists for `nct-127`, not for `nct`. Among the 200 most played quizzes this is the only group without a
   card (apart from `general-kpop`, by design). G7 data choice (owner decision 8).
3. Name them all: a transposition ("Jenogyeon") is not taken as a typo; one letter changed, missing or added is.
   Consistent with the code comment and the copy ("one typo is fine"); fans may expect the swap to count.
   Which member: the distribution spells "Hueningkai" (personality data) where Name them all spells "Huening Kai".

## Normalizations (not issues)
- Every page logs `SyntaxError: Unexpected token '<'`: the Vercel Analytics and Speed Insights scripts
  (`/_vercel/insights/script.js`, `/_vercel/speed-insights/script.js`) do not exist on a local build and the
  middleware 301s them to `/` (HTML). Served by the platform on Vercel. Seen on `/` too, so not a v12 page error.
- `/api/duel/pairs` is rate limited per voter (about 20 requests per window, in memory): my first probe of the 84
  groups with one anon id returned `pairs: []` after 20 groups. With a fresh anon id per group all 84 answer.
- Result members differ between runs (picks differ by viewport): expected.

## Test writes (owner-approved, for deletion)
- Name them all round (guest, `/aespa-name-all-members`, 2026-10-04 15:52:17 UTC): `name_all_member_results`
  ids 7735, 7736, 7737, 7738, `round_id` 22031bc9-ff29-4a7f-a35c-1ead98eafd14 (group_id 5). Count 7,524 to 7,528.
- This or that vote (guest, bonus card on `/q/newjeans-discography-deep-dive-quiz`, 15:55:57 UTC): `duel_votes`
  id eab35ec0-6bc9-48d9-a681-da3cdbf62900 (question b0c2359c-1da7-4804-af96-635a6b63eede, winner "Cookie"),
  plus its `duel_vote_guard` row (voter_hash af53ecb8700872c70ac74ea3f6f7e53a, vote_day 2026-10-04, the only row
  of that table). Count 75,191 to 75,192.
- Nothing else written: `personality_results` 1,255 before and after (every result POST stubbed); every quiz play
  POST and every other round POST stubbed.
