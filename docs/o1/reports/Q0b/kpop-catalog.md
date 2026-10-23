# Q0b: public K-pop catalog copied to o1-dev

Tool: `scripts/o1-tools/copy-kpop-catalog.sh [--dry-run] [--refresh]` (wrapper) around `scripts/o1-tools/copy-kpop-catalog.mjs`.

## How it works

- Reads production only through the read-only proxy (`scripts/o1/prod-proxy.mjs`, started and stopped by the wrapper as `parity-prod.sh` does):
  GET only, stand-in anon key `o1-proxy-anon`, so row level security limits it to what a visitor sees. The proxy refused 0 calls.
- Writes only o1-dev: the wrapper runs the script through `scripts/o1/env.sh dev`, and the script checks again (env O1_ENV=dev,
  O1_BRANCH=o1-dev, URL equal to the branch ref, no production ref, key project = branch) and refuses any other target.
- Idempotent: a row whose primary key is already on o1-dev is left alone (`on_conflict` do nothing), so a second run writes nothing.
  `--refresh` upserts everything instead. site_id is set to `kpop` wherever the column exists. Inserts follow foreign key order.
- Prints counts per table only.

## Rules applied

- No personal data: no profiles, plays, scores, comments, likes, follows, reports, notifications, sessions or accounts are read for copying.
  Every creator, author or reviewer column (quizzes.creator_id, games.creator_id, trivia.created_by, idols/photocards/collectibles/pages
  created_by, verse_essays.author and reviewed_by, verse_pages.created_by) becomes the kpop system account
  `00000000-0000-0000-0000-000000000001` (it has a profile on o1-dev). Lock owners and review pointers into tables that are not copied
  (verse_content.locked_by and current_revision_id, verse_essays.series_id) are emptied. Aggregate counters stay.
- Guards that abort before any write: a uuid column the script does not map, a production profile id (kept in memory only) anywhere in an
  outgoing row, an email-like string in an outgoing row. All three were at 0 on the real run (13370 outgoing rows).
- Only published content: quizzes, games, trivia and essays are read with `status=eq.published`; the other tables hold what the visitor's
  read policy shows.
- Image URLs are kept as they are.

## Group ids

o1-dev already holds the anime groups under small integers (2 to 117), the same range as the production kpop groups (1 to 96). A production
group id P therefore becomes P + 1000 on o1-dev (BTS 1 becomes 1001), except `general-kpop`, which already exists on o1-dev for site kpop
(id 1) and keeps it. Every column holding a group id is remapped (group_id, parent_group_id, space_id, and the entity id of rows whose
entity type is `group`). Nothing in apps/quiz hard-codes a group id. The group id sequence of o1-dev was not touched (no SQL channel); the
next group created on o1-dev takes a small number, far below 1001.

`entity_sources` is shared with the anime lane (ids 1 to 11168 are anime rows), so its production ids are not kept: o1-dev assigns the ids
and rows are matched by (entity_type, entity_id, field, source, source_ref).

## Tables read by the pages but not copied

`quiz_bank` and the empty or hidden ones (`osts`, `shows`, `tours`, `page_links`, `entity_overrides`, `verse_page_aliases`,
`verse_essay_series`) show nothing to a visitor. `verse_revisions`, `verse_discussions`, `verse_threads`, space members and every user
table are personal or contributed and stay out.

## Counts per table (first run on o1-dev)

`read` = rows the visitor's read returned; `dropped` = rows whose required foreign key target is not public (page_tags pointing at two
unpublished pages); `written` = rows inserted by the first run; `second run` = rows written by the second run; `on o1-dev` = rows now on
o1-dev for site kpop (all rows for tables without site_id; entity_sources counts the group, idol and album entities).

| table | read | dropped | written | second run | on o1-dev |
|---|---|---|---|---|---|
| groups | 96 | 0 | 95 | 0 | 96 |
| group_units | 5 | 0 | 5 | 0 | 5 |
| idols | 118 | 0 | 118 | 0 | 118 |
| eras | 320 | 0 | 320 | 0 | 320 |
| albums | 358 | 0 | 358 | 0 | 358 |
| songs | 4291 | 0 | 4291 | 0 | 4291 |
| album_tracks | 2739 | 0 | 2739 | 0 | 2739 |
| awards | 45 | 0 | 45 | 0 | 45 |
| photocards | 7 | 0 | 7 | 0 | 7 |
| collectibles | 5 | 0 | 5 | 0 | 5 |
| entity_sources | 1477 | 0 | 1477 | 0 | 1477 |
| verse_aliases | 21 | 0 | 21 | 0 | 21 |
| space_tags | 16 | 0 | 16 | 0 | 16 |
| pages | 260 | 0 | 260 | 0 | 260 |
| page_tags | 41 | 2 | 39 | 0 | 39 |
| nav_menus | 1 | 0 | 1 | 0 | 1 |
| verse_pages | 5 | 0 | 5 | 0 | 5 |
| verse_content | 9 | 0 | 9 | 0 | 9 |
| verse_spaces | 4 | 0 | 4 | 0 | 4 |
| verse_essays | 0 | 0 | 0 | 0 | 0 |
| quizzes | 474 | 0 | 474 | 0 | 474 |
| qotd_log | 104 | 0 | 104 | 0 | 104 |
| games | 56 | 0 | 56 | 0 | 56 |
| blind_test_songs | 349 | 0 | 349 | 0 | 349 |
| daily_blindtests | 94 | 0 | 94 | 0 | 94 |
| trivia | 14 | 0 | 14 | 0 | 14 |
| tot_categories | 20 | 0 | 20 | 0 | 20 |
| tot_items | 360 | 0 | 360 | 0 | 360 |
| personality_profiles | 97 | 0 | 97 | 0 | 97 |
| personality_questions | 10 | 0 | 10 | 0 | 10 |
| debate_questions | 60 | 0 | 60 | 0 | 60 |
| daily_debates | 94 | 0 | 94 | 0 | 94 |
| badge_definitions | 82 | 0 | 82 | 0 | 82 |
| mv_tracking | 20 | 0 | 20 | 0 | 20 |
| mv_snapshots | 1720 | 0 | 1720 | 0 | 1720 |
| comebacks | 0 | 0 | 0 | 0 | 0 |
| total | 13372 | 2 | 13369 | 0 | |

The first run wrote 13369 rows (the dry run, which writes nothing, listed the same counts); the second run wrote 0 (same read counts, every
row present).

## Proof on the built sites (scripts/o1-tools/dev-up.sh --rebuild from this worktree, o1/Q0b at 317a935)

Servers: kpop on 3180, anime on 3181, hub on 3182 (stopped afterwards, `dev-up.sh --status` says stopped).

- kpop `/` 200 and lists 24 kpop quizzes; `/new`, `/trending`, `/most-liked`, `/quizzes`, `/groups`, `/blindtest`, `/trivia`: 200 with content.
- Group hub `/bts-quiz` 200 (33 kpop quizzes linked), `/blackpink-quiz` 200. The Verse hub `/verse/<group>` redirects anonymous visitors to the
  `/verse` teaser by design (VERSE_PUBLIC off, middleware gate), so the group hubs a visitor sees are the `/<group>-quiz` pages.
- Quiz page `/q/katseye` 200 (and `/q/exo-funfacts`, the daily quiz target of `/daily`).
- APIs `/api/quizzes`, `?limit=50`, `?sort=new`, `?sort=trending`: 200, every returned id is a kpop quiz (0 foreign ids).
- Leak check: the 165 anime quizzes (id, slug, title), the 31 anime groups (slug, name) and the 30 series titles of o1-dev were searched in the
  17 kpop responses above and the sitemap: 0 hits. The 474 kpop quizzes and 96 kpop groups were searched in the anime home, /new, /trending,
  /most-liked, /quizzes, /series, /api/quizzes and sitemap: 0 hits; the anime API returns only anime quizzes. The same check sees 474 kpop quizzes
  in the kpop sitemap and 165 anime quizzes in the anime sitemap, so it can detect a leak.
- `/name-all` answers 500 on kpop: not a route of the kpop build (a path no route knows answers 500 on 127.0.0.1, see the header of dev-up.sh),
  unrelated to the data.

## Rerun

    /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-Q0b/scripts/o1-tools/copy-kpop-catalog.sh            # copy (prints counts only)
    /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-Q0b/scripts/o1-tools/copy-kpop-catalog.sh --dry-run  # counts, writes nothing

Note: `dev-up.sh --rebuild` stopped kpop/anime/hub servers that were already running on ports 3180 to 3182 (its state file is shared in
~/kpq-o1/logs/dev-up); it restarted them from this worktree and then stopped them.
