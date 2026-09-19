# refonte P0 audit - query log (every read, 2026-09-19 15:41 UTC, all READ ONLY)

All SQL ran against the LIVE project rdkgouofytwfdpbxbzio via the Supabase read-only SQL runner.
No write, no DDL. All results are in DB-MEASURES.md.

## SQL reads (Supabase MCP execute_sql, 2026-09-19 15:41 UTC)
1. pg_database_size(current_database()) + pg_size_pretty  -> DB size 107 MB (112,159,891 bytes).
2. pg_total_relation_size / pg_relation_size over pg_class where nspname='public', top 30 by size,
   with reltuples est_rows  -> the top-tables table in DB-MEASURES.
3. sum(pg_total_relation_size) over public tables + count(*)  -> 82 MB across 135 public tables.
4. storage.objects grouped by bucket_id, count(*) + sum((metadata->>'size')::bigint)  -> 10 buckets,
   749 MB total, Pinterest 666 MB.
5. pg_total_relation_size for the small killed tables (tier_lists, tier_list_assets, tot_categories,
   photocards, collectibles, daily_blindtest_scores, and probes for battle_rooms/rankings/etc that
   returned nothing = do not exist).
6. information_schema.columns to confirm created_at exists on every usage table before the 30-day
   filter (avoids a blind guess).
7. UNION ALL of count(*) over 20 feature tables  -> usage totals (freeze before the kill).
8. UNION ALL of count(*) filter (created_at > now()-interval '30 days') over 13 tables  -> 30-day
   activity.

## HTTP reads (curl, 2026-09-19 15:41 UTC)
- https://kpopquiz.org/sitemap.xml  -> 738 <loc>; per-pattern killed-URL counts (grep -c) for
  /games, /rankings, /tier-list, /which-, /pt/games, sort-it, match-up, name-them-all, name-all,
  this-or-that.

## Code reads (grep/glob/read, no build)
- Render-mode exports (export const dynamic / revalidate) on the killed route page.tsx files.
- package.json check:* gate scripts; scripts/check-*.mts existence.
- Root and apps/quiz .env.local project refs (URL only, no keys read out): root = dead
  fvyuznnyugznzfskgcvy, app = live rdkgouofytwfdpbxbzio.
- fvyuznnyugznzfskgcvy references across the repo (root .env.local, scripts/apply-bt-migrations.ts,
  apps/blindtest/docs/import-to-supabase.mjs, docs).
- Three read-only Explore sweeps for the per-feature file inventory and the shared inbound-ref map
  (results consolidated into KILL-MAP.md).
