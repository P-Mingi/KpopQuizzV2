# DB-CLEANUP-PLAN - the Supabase zero plan, costed (READ ONLY audit, 19 Sep 2026)

Built from KILL-MAP (what dies) + DB-MEASURES (what it weighs). NOTHING is executed here. Every
DROP and every bucket purge is individually owner-gated in the execution mission, and every one is
preceded by a full pg_dump. Hard rules restated at the end.

## The one-line verdict

The database was never the problem (107 MB of 500 MB, 21 percent). The blocker is STORAGE: 749 MB
of 1 GB (73 percent), and the Pinterest buckets are 666 MB of that. Delete the Pinterest buckets
(a killed feature) and storage drops to about 79 MB (8 percent). After that single required action,
both DB and storage pass the Free tier with a wide margin. The only unknown left is egress, which
only the owner can read. Provisional verdict: GO for the Free downgrade, contingent on egress
being under 3.5 GB this month.

## Projected footprint after cleanup, against Free (30 percent-margin targets: 350 MB DB / 700 MB storage)

| | Now | After cleanup | Free limit | Margin target | Pass |
| --- | --- | --- | --- | --- | --- |
| Database | 107 MB | about 73 MB (drop ~34 MB of killed tables) | 500 MB | 350 MB | YES, huge |
| Storage | 749 MB | about 79 MB (delete Pinterest + game + tier buckets, 670 MB) | 1 GB | 700 MB | YES, huge |
| Egress / month | UNKNOWN | UNKNOWN | 5 GB | 3.5 GB | OWNER must read |

Note on reclaim: a whole-table DROP frees its bytes immediately (the table's files are removed), so
the ~34 MB of killed tables comes back without VACUUM. VACUUM FULL is only needed when you DELETE
rows from a KEPT table (not the case here - the kill drops whole tables, it does not delete rows
from quizzes/plays/songs). Storage object deletes free their bytes immediately too (object store,
not Postgres MVCC). So the space math is honest: DROP the killed tables and delete the killed
buckets, and the reclaim is real and immediate. Even if the owner drops NO table, the DB already
passes; the storage delete is the only strictly required action.

## Table-by-table plan (killed features only; kept tables are never touched)

| Table | Rows | Weight | Referenced after code kill | Plan | Reclaim |
| --- | --- | --- | --- | --- | --- |
| duel_votes | 70,558 | 19 MB | nobody (rankings/this-or-that gone) | DROP | immediate |
| battles | 2,496 | 4.8 MB | nobody (battle gone) | DROP | immediate |
| tot_plays | 2,251 | 3.2 MB | nobody | DROP | immediate |
| battle_results | 2,959 | 1.0 MB | nobody | DROP | immediate |
| name_all_member_results | 6,957 | 960 kB | nobody (name-all gone) | DROP | immediate |
| pinterest_scraped | 600 | 856 kB | nobody | DROP | immediate |
| game_plays | 2,072 | 840 kB | nobody | DROP | immediate |
| personality_results | 1,228 | 296 kB | Verse idol stats read it (FROZEN) | KEEP DORMANT until Verse thaw decision, or DROP if the owner accepts losing the Verse personalityRank | immediate if drop |
| quiz_pinterest_cards | 195 | 288 kB | nobody (pinterest gone) | DROP | immediate |
| games | 38 | 280 kB | nobody | DROP | immediate |
| tot_categories | 20 | 112 kB | nobody | DROP | immediate |
| pinterest_pins | 217 | 360 kB | nobody | DROP | immediate |
| tier_lists | 4 | 96 kB | nobody | DROP | immediate |
| tier_list_assets | 11 | 64 kB | nobody | DROP | immediate |
| pinterest_auth / pinterest_boards / pinterest_originals / pinterest_scrape_jobs | small | small | nobody | DROP | immediate |
| photocards / collectibles | 7 / 5 | 80 / 64 kB | WIRED in Verse (kept) | KEEP - not killed | n/a |

Shared-column edits (ALTER, not DROP TABLE) - these DO leave dead space, so VACUUM the table after:
- `quizzes.pinterest_background_image_url`, `pinterest_status`, `pinterest_posted_at`,
  `pinterest_pin_id` (Pinterest columns on the kept quizzes table). Dropping the columns needs a
  VACUUM of `quizzes` (1.3 MB, trivial) to reclaim.
- `profiles.avatar_ref` / `avatar_config` / `avatar_kind` (avatar studio). Same: ALTER then VACUUM
  `profiles` (344 kB). `profiles.show_personality_flair` stays if the flair reading stays.

## Bucket-by-bucket plan (storage is the real lever)

| Bucket | Files | Size | Plan | Reclaim |
| --- | --- | --- | --- | --- |
| pinterest-question-pins | 2,963 | 455 MB | DELETE (Pinterest killed) | immediate |
| pinterest-pins | 495 | 109 MB | DELETE | immediate |
| quiz-pinterest-cards | 217 | 74 MB | DELETE | immediate |
| pinterest-brand-pins | 112 | 18 MB | DELETE | immediate |
| game-images | 58 | 3.1 MB | DELETE (mini games killed) | immediate |
| tier-list-assets | 17 | 189 kB | DELETE (tier lists killed) | immediate |
| quiz-backgrounds | 1 | 185 kB | DELETE (frozen, bucket 065) | immediate |
| avatars | 0 | 0 | DROP the empty bucket (avatar studio) | n/a |
| quiz-images | 796 | 74 MB | KEEP (quiz covers) | - |
| images | 17 | 1.2 MB | KEEP | - |
| group-logos | 30 | 463 kB | KEEP | - |

Deleting the seven killed buckets removes about 670 MB; storage lands at about 79 MB.

## The dead project and the dead root .env.local

- Dead Supabase project `fvyuznnyugznzfskgcvy`: it is the OLD standalone blindtest database. The
  blindtest was migrated INTO the live project (`docs/blindtest-migration-map.md`; the live project
  now holds `blind_test_plays`, `blind_test_songs`, `daily_blindtest_scores`). It is NOT fully
  unreferenced: the root `/.env.local` points at it (project URL), and
  `scripts/apply-bt-migrations.ts` (2 refs) plus `apps/blindtest/docs/import-to-supabase.mjs` (1
  ref) still target it. Those are the migration-source artifacts. Plan: once the owner confirms the
  blindtest migration is complete (it appears shipped), delete the dead project in the Supabase
  dashboard AND delete the root `/.env.local` and the two migration scripts. If the dead project is
  in the SAME organisation as the live one and the org is Pro, the second active project is part of
  what the plan bills; removing it is also a Free-tier prerequisite (Free allows two active
  projects, so it is not blocking, but it is dead weight).
- Root `/.env.local`: the Next app loads `apps/quiz/.env.local` (live project), never the repo-root
  file. The root file is an orphan pointing at the dead project. Delete it. (Note: it holds keys
  for a dead project, so it is low-risk, but it should still go and its keys be rotated/void.)

## Backups (what the Free tier does not give you)

Free has no automatic backups. Replace them with a weekly GitHub Actions pg_dump, encrypted,
retained as an artifact. Free (Actions minutes). Draft workflow content (NOT committed here - the
execution mission adds it under `.github/workflows/db-backup.yml` after the owner adds the secrets):

```
name: Weekly DB backup
on:
  schedule:
    - cron: '0 3 * * 0'   # Sundays 03:00 UTC
  workflow_dispatch: {}
jobs:
  dump:
    runs-on: ubuntu-latest
    timeout-minutes: 25
    steps:
      - name: Install pg client 15 (match the Supabase server major)
        run: |
          sudo sh -c 'echo "deb https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
          curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg --dearmor -o /usr/share/keyrings/pgdg.gpg
          sudo apt-get update && sudo apt-get install -y postgresql-client-15
      - name: pg_dump (custom format, compressed)
        env:
          SUPABASE_DB_URL: ${{ secrets.SUPABASE_DB_URL }}
        run: /usr/lib/postgresql/15/bin/pg_dump "$SUPABASE_DB_URL" -Fc -Z6 -f backup.dump
      - name: Encrypt (GPG symmetric, AES-256)
        env:
          BACKUP_PASSPHRASE: ${{ secrets.BACKUP_PASSPHRASE }}
        run: gpg --batch --yes --cipher-algo AES256 --passphrase "$BACKUP_PASSPHRASE" -c backup.dump
      - name: Upload encrypted artifact
        uses: actions/upload-artifact@v4
        with:
          name: db-backup-${{ github.run_id }}
          path: backup.dump.gpg
          retention-days: 90
```

Secrets the workflow needs (none exist today; the owner adds them in GitHub repo settings):
- `SUPABASE_DB_URL`: the direct Postgres connection string (Supabase dashboard, Connect, Session or
  Direct connection; use the read-friendly pooler or direct URI). The env files hold only the anon
  and service-role keys plus the REST URL, no connection string, so this is a new secret.
- `BACKUP_PASSPHRASE`: a strong passphrase the owner keeps offline. Restore: `gpg -d backup.dump.gpg
  > backup.dump` then `pg_restore -d "$URL" backup.dump`.

## Hard rules restated for the execution mission

- Dump before any deletion. A full pg_dump (the workflow above, run once manually first) is the
  precondition to the first DROP.
- Never touch quizzes, songs, plays, profiles, groups, articles/news/pulse tables, or the blindtest
  tables. The kill only drops the killed-feature tables listed above.
- Every DROP is individually owner-gated (one confirmation per table, per bucket).
- VACUUM strategy: whole-table DROPs need no VACUUM (immediate reclaim). Column drops on kept tables
  (quizzes Pinterest columns, profiles avatar columns) need a plain `VACUUM <table>` after the
  ALTER. No VACUUM FULL is required anywhere in this plan, because nothing DELETEs rows from a kept
  table; if the owner later chooses to prune rows instead of dropping a table, THEN a VACUUM FULL in
  a quiet window is required and must be stated per table.
- Downgrade to Free only after egress is read and confirmed under 3.5 GB, and after the Pinterest
  storage delete. If egress fails, re-measure the source before downgrading.
