# Reader proof: the `soundtrack` status is excluded everywhere but the KPDH playlist

Question (V12 prompt 5.3): would any reader of `songs`, on `origin/main` or on `feat/v12`, show or pick a row whose
status is `soundtrack` (the KPop Demon Hunters songs of v12-g2-07-kpdh.sql)?

Answer: no, on both. `origin/main` is a94d77c; `feat/v12` (836f276) adds two docs commits on top of it and
`git diff origin/main feat/v12 -- apps/quiz` is empty, so the two carry the same readers, line for line. The KPDH
file can therefore be applied before or after the merge.

Commands (outputs saved next to this file):

```
git grep -n -E "from\(['\"]songs['\"]\)" origin/main -- apps/quiz/src apps/quiz/scripts   # songs-readers-origin-main.txt, 17 lines
git grep -n -E "from\(['\"]songs['\"]\)" feat/v12    -- apps/quiz/src apps/quiz/scripts   # songs-readers-feat-v12.txt, 17 lines, same lines
git grep -n -i -w "songs" -- '*.sql'                                                       # SQL functions, policies, indexes
```

The soundtrack rows carry: `status = 'soundtrack'`, `group_id` NULL, `gender` NULL, `generation` NULL,
`is_curated = false`, `tier` NULL.

## Application code (17 call sites, identical on both refs)

| # | File:line | Surface | Filter on songs | Soundtrack row |
|---|---|---|---|---|
| 1 | `scripts/ingest-blindtest-songs.mts:56` | ingestion (not a site reader) | by `deezer_track_id` | not a reader of the site |
| 2 | `scripts/ingest-blindtest-songs.mts:75` | ingestion insert | writes `status: 'active'` | not a reader |
| 3 | `src/app/(site)/verse/[slug]/songs/[id]/page.tsx:33` | song page | `.eq('id', id).eq('group_id', groupId)` | excluded: no group, so no `/verse/<group>/songs/<id>` URL can match it |
| 4 | `src/app/api/blind-test/generate/route.ts:227` | generate, group playlist count | `.eq('status', 'active').eq('group_id', ...)` | excluded (status, and no group) |
| 5 | `src/app/api/blind-test/generate/route.ts:256` | generate, the pool (all-songs, gender, generation, hits, deep, group, multi-group) | `.eq('status', 'active')` | excluded |
| 6 | `src/app/api/daily/blindtest/route.ts:103` | daily, hydrate the ten ids | `.in('id', songIds)`, ids chosen by `ensure_daily_blindtest` (below: active + curated) | excluded: the function never picks one |
| 7 | `src/app/api/daily/blindtest/route.ts:117` | daily, wrong-answer pool | `.eq('status', 'active')` | excluded |
| 8 | `src/app/sitemap.ts:401` | sitemap song URLs | no status filter; a URL is pushed only `if (s)` where `s` is the group's slug | excluded: no group, no slug, no URL |
| 9 | `src/lib/blind-test-playlists.ts:42` | group playlists (sitemap, /blindtest links, picker) | `.eq('status', 'active').not('group_id', 'is', null)` | excluded |
| 10 | `src/lib/db/queries/blindtest.ts:43` | song count | `.eq('status', 'active')` | excluded |
| 11 | `src/lib/db/queries/stats.ts:27` | site stats song count | `.eq('status', 'active')` | excluded |
| 12 | `src/lib/db/queries/stats.ts:226` | stats, gender per group | `.in('group_id', groupIds)` | excluded: no group |
| 13 | `src/lib/ranked/db.ts:138` | ranked pool | `.eq('status', 'active')` (+ curated when the switch is on) | excluded |
| 14 | `src/lib/ux-v1/p11/search.ts:142` | search | `.eq('status', 'active')` | excluded |
| 15 | `src/lib/ux-v1/p6/challenge-server.ts:30` | challenge creation, validates the song ids | `.in('id', ids).eq('status', 'active')` | excluded (see the note below) |
| 16 | `src/lib/ux-v1/p6/challenge-server.ts:85` | challenge, fresh preview links | `.in('id', ids)`, ids of a stored challenge (validated by 15) | excluded: 15 never lets one in |
| 17 | `src/lib/ux-v1/p6/hub-data.ts:86` | hub song count | `.eq('status', 'active')` | excluded |

Readers of other tables that sit next to these and are not concerned: `blind_test_songs` (the older YouTube-based
table: modes API, admin, verse songs tab, group hub) is a different table and holds no KPDH row.

## SQL functions (every tracked `.sql` file)

| Object | Latest definition | Filter on songs | Soundtrack row |
|---|---|---|---|
| `ensure_daily_blindtest(p_date)` (the daily) | the daily blindtest fix migration (113), lines 55 to 88 | `status = 'active' AND is_curated = true AND tier = v_tier`, fill query `status = 'active' AND is_curated = true` | excluded three times over (status, curated, tier) |
| `generate_daily_challenges(...)` | migration 052 (written for the retired standalone blindtest project) | `status = 'active' AND is_title_track = true` + difficulty | excluded |
| curation update (one-off, not a function) | migration 044 | `status = 'active'` | excluded, and not re-run |
| `ranked_finalize_run(...)` | `docs/pending-migrations/v11-p7-ranked.sql` L173 | `EXISTS (SELECT 1 FROM public.songs s WHERE s.id = ...)`, a foreign-key guard on the ids of a ranked run | not a pick: a ranked run only holds ids from reader 13 |
| RLS `songs_read_all` | songs table migration (024) | `FOR SELECT USING (true)` | readable by the anon key, which is what lets generate read it for the KPDH playlist; no surface lists it |

No view, trigger, index predicate or cron reads `songs` (pg_cron is not installed; the nightly job is a route that uses reader 13).

## This branch (v12/g2-catalogue)

- `src/app/api/blind-test/generate/route.ts`: the pool query is `themed ? base.in('status', [...specStatuses(themed)]) : base.eq('status', 'active')`. `specStatuses` answers `['active']` for every playlist except `kpop-demon-hunters`, which answers `['active', 'soundtrack']` and is further limited to the twelve Deezer ids of `KPDH_SONGS`. `themed` is null whenever the v12 flag is off. Unit tests: "the KPDH status is excluded from every playlist but the KPDH one", "every other reader of generate asks for status = active (source check)".
- `src/lib/blind-test-playlists.ts` (themed availability count): same statuses per playlist as generate.
- The eight extra `from('songs')` lines in `songs-readers-g2.txt` are the read-only catalogue scripts under `apps/quiz/scripts/v12/catalogue/` (anon key, no site surface) and the count above.

## Note for P6 (request filed)

Reader 15 validates a challenge's songs with `status = 'active'`. A run of the KPDH playlist therefore cannot be
turned into a challenge link: the creation answers 400 `invalid_questions` when a soundtrack row is among the questions. That is the
safe side (nothing leaks), but the Challenge button on a KPDH result needs either hiding or `status in ('active',
'soundtrack')` in that one check. The file is P6's.
