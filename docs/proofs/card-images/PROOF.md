# Proof: card images (PR #201, o1/card-images 033b149)

Change under proof (owner, 2026-11-04): the "Surprise me" pick tile on the kpopquiz.org home shows the group photo instead of the initials, and a General K-pop quiz card with no cover of its own shows one fixed cover (the cover of "K-pop company quiz - match the group to the label") instead of the typographic cover.

Base: origin/main 2a9fc0bfeb0e. Head: 033b1491b83d3a738b6d3ba54c446b060df2e5ba. Harness: scripts/o1/parity.sh, URL list apps/quiz/e2e/o1/parity/urls.txt (60 URLs), harness version cb12ed53. Run on 2026-11-05 between 01:20 and 02:40 UTC.

## Verdict

Differences are expected for this PR, and every one that is not noise is the intended change or a direct consequence of it. Across three runs, 19 distinct pages differ in at least one run; on the 17 that are not noise no head, meta, title, canonical, JSON-LD, heading or link changed, and no content changed other than the three kinds below. The head build passed in all three runs. Refused writes: none failing (only the `ensure_daily_debate` build write that the base build makes too).

The one page that could not be compared page against page is `/trending` (see below): the base build timed out on its trending read in all three runs. Its head render was checked by another route.

## Differing pages and their kind

Kinds, as measured by `judge201.mjs` (reads both sides of every differing page, removes from each side only the three kinds below, and then requires the rest of the HTML and the multiset of page-data rows to be equal):

1. COVER: on a General K-pop card with no cover, the base `div.ux-qcov-fb` (typographic cover) is replaced by one `<img class="ux-qcov-img">` with the fixed cover, `object-position: center`, `alt=""`. The head cover URL is always the same Supabase Storage file 230d8943-2746-4839-b04a-0181541fad1b.jpg. Every changed card is a General K-pop card.
2. POOL PHOTO: on `/` only, the Surprise pool in the page data gains one `"photo"` key per pick (`/idols/<GROUP>.jpg`, a Storage photo, or the fixed cover for General K-pop). The server HTML of `/` is identical, because the pick tile only exists after a click.
3. CHUNK GRAPH (consequence of the code change, not content): one more client chunk in the module lists of the page data and one more `<script src="static/chunks/....js" async>` tag in the HTML. No stylesheet link changes anywhere.

| page | kind | detail |
| --- | --- | --- |
| `/` | POOL PHOTO | page data only, HTML byte equal |
| `/quizzes` | COVER | 3 cards |
| `/kpop-true-or-false` | COVER | 11 cards |
| `/kpop-quiz-2026` | COVER | 7 cards |
| `/easy-kpop-quizzes` | COVER + CHUNK GRAPH | 1 card |
| `/hard-kpop-quizzes` | COVER + CHUNK GRAPH | 2 cards |
| `/bts-quiz`, `/blackpink-quiz`, `/stray-kids-quiz`, `/seventeen-quiz`, `/cortis-quiz`, `/twice-quiz`, `/newjeans-quiz`, `/bts-trivia`, `/blackpink-trivia`, `/kpop-demon-hunters-quiz` | CHUNK GRAPH | HTML equal outside the extra script tag |
| `/trending` | COVER + CHUNK GRAPH (head side) | see below |
| `/blindtest/group-bts` | noise | run 2 and run 3 only: the same page-data rows with other reference numbers (`$L1d` against `$L2f`). Identical in run 1. Not related to the change |
| `/leaderboard` | noise | run 3 only: "11h ago" against "12h ago" between the two recordings. Not related to the change |

Run 2 also showed on `/` a swap of two page-data row numbers (the HomeSurprise module row and the ItemList JSON-LD text row), the known reference-number noise; the intended POOL PHOTO change is there as in the other runs.

Per run: run 1 had 17 differing pages (all the pages above except `/blindtest/group-bts` and `/leaderboard`), run 2 (`--recheck`, same stored data state) 18 (adds `/blindtest/group-bts`), run 3 (fresh run) 19 (adds `/leaderboard`). The judge passed 16 of 17, 17 of 18 and 17 of 19 pages in the three runs; the failures are `/trending` in every run and `/leaderboard` in run 3 (relative time, above).

## /trending

`/trending` has `revalidate = 600` and falls back to an empty list when its read exceeds 5000 ms. In all three runs `build-base.log` holds `[trending] getTrendingQuizzes timed out after 5000ms - using fallback` and the base page says "No quizzes yet."; the head build had no such timeout and shows 10 cards. The page can therefore not be compared base against head in these runs. Instead the head page of run 3 was compared with the `/trending` page of a base-against-identical-twin control run (main on both sides, 2026-11-04 23:36 UTC, 10 cards, no timeout): with the card list and the JSON-LD list removed, the rest of the HTML is byte equal. In the head list, the 3 General K-pop cards show the fixed cover and no card is typographic. The two lists hold different quizzes because the query is time based, so the cards themselves are not comparable. Output: `judge-trending-structure-output.txt` in the run 3 evidence folder.

## Stylesheet

`styles/kpop/home-surprise.css` gains one rule (`.kpop-h2-th-img`). The harness compares stylesheet contents only for pages it judges identical. `/` is already different, and no page judged identical reported a stylesheet difference. The rule is covered by the screenshots below.

## Screenshots

"Before" is https://kpopquiz.org (live, 2026-11-05 00:13 local). "After" is the kept head build (033b149) served with the frozen production data of the parity run (`parity.sh --serve-kept`, port 4012, GET only: Playwright aborts every other method). All taken with the repo's Playwright (Chromium, 1280 px wide, device scale 2); the script is `shots.mjs` in the evidence folder. The Surprise pick is random, so the group differs between shots.

- `home-surprise-before.png`: Surprise me pick on production, initials "AT" in the tile (ATEEZ).
- `home-surprise-after-group-photo.png`: the same block on the head build, SEVENTEEN pick with the group photo in the tile.
- `home-surprise-after-general-kpop.png`: a General K-pop pick on the head build, with the fixed cover in the tile (it is a white logo image, so the tile shows the logo without a visible frame).
- `quizzes-grid-before.png` and `quizzes-grid-after.png`: `/quizzes` scrolled to the same row (resized to 1600 px on the long side). Third card of the second visible row: General K-pop "K-pop fandom names true or false", grey typographic cover before, fixed cover after.
- `quizzes-card-1-before.png` and `quizzes-card-1-after.png`, `-2-`, `-3-`: the three General K-pop cards without a cover on `/quizzes` (`/q/k-pop-fandom-names-true-or-false`, `/q/k-pop-numbers-quiz-how-many-members`, `/q/which-group-is-this-member-from-boy-groups`), before and after.

## Evidence (outside the repo, in ~/kpq-o1)

- `evidence/parity-201/`: run 1 (verdict files, `diff-run1/` with both sides of the 17 pages, `judge201.mjs`, `judge201-output.txt`, `before-shots/`, `after-shots/`, `shots.mjs`, `shots-group-photo.mjs`).
- `evidence/parity-201-run2/`: run 2 (`--recheck`), with `diff-run2/`, the judge output and both build logs.
- `evidence/parity-201-run3/`: run 3, with `diff-run3/`, the judge output, both build logs and the trending structure check.
- `evidence/parity-197-control/`: the control run (main against a tree-identical twin commit), 60 of 60 identical.
