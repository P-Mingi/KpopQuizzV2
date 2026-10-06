# V12 private test: the owner's five fixes (2026-10-06)

Branch `v12/private-fixes`, made from `main` (`d3328a0`), not merged and not pushed: every fix
goes to production together before the opening. All code is behind the flags
(`NEXT_PUBLIC_UX_V1`, `NEXT_PUBLIC_UX_V12`); the flags-off site is unchanged (parity below).

## What changed

| # | Ask | Done | Proof (captures, local, not in git) |
|---|-----|------|-------------------------------------|
| 1 | General K-pop is a category, not a group | `isCategoryGroup` (lib/ux-v1/p3/model.ts). `/general-kpop-quiz` keeps its URL and H1; lead, About and FAQ are category texts (quizzes about K-pop as a whole), no members row, no "is a K-pop group with N members", no members question, crumb Quizzes. Out of the home groups rail and its count (93), `/groups` and its counts, Which member, Name them all, This or that (no bonus after a General K-pop quiz) and Fans picked. Data: the six name-all games filed under General K-pop now belong to their groups (below). | `checks/private-fixes/{before,after}/p1-*.png` |
| 2 | A photo for every group and soloist | 59 Wikimedia Commons photos (CC BY or CC BY-SA, no NC/ND), each checked by eye, in Supabase Storage `images/group-photos/<slug>.jpg`, wired in `groupPhotoUrl` (the site's own `public/idols` photo first). Credits in `lib/ux-v1/a0/group-photo-credits.ts` and `run/group-photos.json`; the hub prints "Photo: author · license" on the photo, linked to the file page. Not found: none. | `p2-*.png` |
| 3 | Live like Kahoot | The host screen only shows the game: question, answers, timer, answer count, results, leaderboard. No phone frame, no "Play along here". Once the room is open it covers the page (no site bar, no intro) and asks the browser for full screen (a "Full screen / Exit full screen" control stays). The QR and code are big in the lobby, then small at the top right during the game. Players join only by phone (QR or code). | `p3-live-*.png` |
| 4 | Boxes on community post pages | The post (author, title, body, votes, likes, share) and the replies each sit in a rounded box: `--ux-raised`, white in light, the dark raised surface in dark. Debate, topic and blog share the same view. | `p4-*.png` |
| 5 | Rabbit instead of the "K" tiles | KpopQuiz live header; the KpopQuiz avatar of the daily debate on the post page, the feed card and the home "From the community" rows. | `p3-live-*.png`, `p4-*.png` |

## Database and storage writes (authorized by the owner)

- `games.group_id` of the six `name_all_members` games, from 30 (General K-pop) to their group:
  `name-all-mamamoo` 22, `name-all-treasure` 24, `name-all-nct-dream` 35, `name-all-nmixx` 18,
  `name-all-babymonster` 63, `name-all-got7` 21. General K-pop has no members game left.
  Rollback: `update games set group_id = 30 where slug in ('name-all-mamamoo', 'name-all-treasure', 'name-all-nct-dream', 'name-all-nmixx', 'name-all-babymonster', 'name-all-got7');`
- Storage: 59 objects `images/group-photos/<slug>.jpg` (public bucket). Rollback: delete that folder.
- `groups` is not changed: `logo_url` holds the logos the public (flags-off) site shows, and there is
  no photo column, so the photo URLs live in code. These two writes are visible on the public site
  too where it reads the same rows (the members row of `/general-kpop-quiz` and of the six groups).

## Photos

- Three first picks were wrong and replaced after the check by eye: Jay Park (a theatre sign),
  Jennie (a CC0 claim on a stage photo, doubtful), Taeyang (SF9's Taeyang, not BIGBANG's).
- Older photos, kept because nothing newer is free on Commons: KARA 2009, miss A 2013, AKMU 2014,
  WINNER 2014, BTOB 2015, DAY6 2015, PSY 2015, Apink 2016, SISTAR 2016, T-ARA 2017, Taeyang 2017,
  Zico 2017, fromis_9 2018, NCT 2018.

## Checks

- Whole-app `tsc`: 0 errors. `vitest`: 1961 / 1961 (the post view fixture updated for the box).
- Route allowlist: green. Docs secret gate: 2 findings, both already on `main`
  (`docs/pending-migrations/v12-bundle-c.sql`, `v12-g9-editorial-accounts.sql`, the
  `@fake.kpopquizz.com` pattern of the editorial accounts); not touched here.
- e2e updated for the new rules: g4 (no phone, game mode, small QR during the game; the room
  states are no longer measured against the prototype, which had the phone and the in-page
  screen), p1 (rail and count without General K-pop), p3 (A to Z without it, a new category hub
  test, Chungha's hub now has its photo), g9 (the editorial note is measured inside the post box).
- e2e run on a local flag-on dev server: g4 at 1440 and 390, light and dark: 44 passed, 4 skipped
  (tracking, by design). g9 at 1440 and 390: 15 passed, 2 skipped. p1, p8: passed. p3: passed except
  "Notify me" in the empty hub tests, which expect group alerts off while the v12 SQL turned them
  on in the database: not related to these fixes, left as is.
- Flags-off parity against `main` (production `kpopquiz.org`, 40 URLs, `docs/release/snapshot.mjs`,
  local production build): no code difference. The 14 differing fields are live data only (play
  counts, the 430+ quiz count, three URLs published after production cached its sitemap, a newer
  news feed) and the home's `/pt` link that a fresh build shows until its first regeneration.
  Snapshots: `checks/private-fixes-parity-{main,branch}.json`.

## Private version

- `vercel deploy --prod --skip-domain` from a clean export of `42ce99f` (the main checkout holds
  other worktrees and two files over Vercel's 10 MB upload limit), same flags and
  `NEXT_PUBLIC_SITE_URL` as before; deployment `dpl_CK3rrUng1unv9ANwu3cTSDSPLwZt`
  (`kpopquiz-mn3febq2q-p-mingis-projects.vercel.app`), aliased to https://kpopquiz-private.vercel.app.
  Previous private build, for a rollback of the alias: `kpopquiz-9ei2tuvkn-p-mingis-projects.vercel.app`.
- kpopquiz.org and www still serve `dpl_CPRDSnFf57KbPGDzXnc4TxGk8X53` (main, flags off). Do not promote
  the private build (it bakes the private address into `NEXT_PUBLIC_SITE_URL`).
