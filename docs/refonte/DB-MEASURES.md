# DB-MEASURES - real Supabase measures before the kill (READ ONLY, 19 Sep audit)

Project: live `rdkgouofytwfdpbxbzio`. Every number below was read by the auditor via the
Supabase read-only SQL runner on 19 Sep 2026, not estimated. The owner audit assumed the
connector could not reach the project; it can, so the byte sizes are MEASURED here, not left
as OWNER ACTION. Only the three dashboard-only numbers (plan, Settings/Usage size, egress)
remain for the owner. Query log with timestamps: `docs/proofs/refonte-audit/query-log.md`.

## Headline vs the Free tier (500 MB DB, 1 GB storage, 5 GB egress)

- Database: 107 MB total (112,159,891 bytes). Public schema tables: 82 MB across 135 tables.
  That is 21 percent of the 500 MB DB limit. The DB is NOT the problem and never was.
- Storage: 749 MB total across 10 buckets. That is 73 percent of the 1 GB limit and OVER the
  30 percent-margin target (700 MB). The Pinterest buckets alone are 666 MB. This is the ONLY
  number that blocks a clean Free downgrade, and killing Pinterest fixes it (see below).
- Egress this month: OWNER ACTION (Supabase dashboard, Settings then Usage). Placeholder.

## Storage by bucket (the real weight)

| Bucket | Files | Size | Verdict |
| --- | --- | --- | --- |
| pinterest-question-pins | 2963 | 455 MB | KILL (Pinterest pipeline) |
| pinterest-pins | 495 | 109 MB | KILL (Pinterest) |
| quiz-pinterest-cards | 217 | 74 MB | KILL (Pinterest) |
| quiz-images | 796 | 74 MB | KEEP (quiz covers) |
| pinterest-brand-pins | 112 | 18 MB | KILL (Pinterest) |
| game-images | 58 | 3.1 MB | KILL (mini games) |
| images | 17 | 1.2 MB | KEEP (general) |
| group-logos | 30 | 463 kB | KEEP |
| tier-list-assets | 17 | 189 kB | KILL (tier lists) |
| quiz-backgrounds | 1 | 185 kB | KILL candidate (bucket 065, frozen) |

Pinterest total: 666 MB (89 percent of all storage). After killing Pinterest + game-images +
tier-list-assets + quiz-backgrounds, storage drops to about 79 MB (quiz-images 74 MB + images
1.2 MB + group-logos 0.46 MB), i.e. 8 percent of the 1 GB limit.

## Top public tables by weight (top of 135)

| Table | Total size | Est. rows | Verdict |
| --- | --- | --- | --- |
| plays | 20 MB | 63,690 | KEEP (quiz plays) |
| duel_votes | 19 MB | 70,558 | KILL (This or That votes) |
| activity_events | 5.5 MB | 6,901 | KEEP (community feed) |
| songs | 5.0 MB | 4,111 | KEEP (blindtest) |
| battles | 4.8 MB | 2,496 | KILL (Duel) |
| tot_plays | 3.2 MB | 2,251 | KILL (This or That) |
| byeol_reward_history | 2.1 MB | 7,187 | KEEP (rewards/XP) |
| quizzes | 1.3 MB | 430 | KEEP (core) |
| battle_results | 1.0 MB | 2,959 | KILL (Duel) |
| name_all_member_results | 960 kB | 6,957 | KILL (Name Them All / name-all) |
| pinterest_scraped | 856 kB | 600 | KILL (Pinterest) |
| game_plays | 840 kB | 2,072 | KILL (mini games) |
| personality_results | 296 kB | 1,228 | KILL (Personality) |
| quiz_pinterest_cards | 288 kB | 195 | KILL (Pinterest) |
| games | 280 kB | 38 | KILL (mini-game rows) |
| tot_categories | 112 kB | 20 | KILL (This or That) |
| tier_lists | 96 kB | 4 | KILL (Tier Lists) |
| photocards | 80 kB | 7 | KILL candidate (unwired?) |
| collectibles | 64 kB | 5 | KILL candidate (unwired?) |
| tier_list_assets | 64 kB | 11 | KILL (Tier Lists) |

Total DB weight of the killed-feature tables above: about 34 MB. Since the DB is already at 107
MB (well under 500 MB), dropping these is OPTIONAL for the downgrade; it is space hygiene, and a
DROP returns nothing without VACUUM (see DB-CLEANUP-PLAN).

## Usage per feature: total and last 30 days (the freeze before the kill)

| Feature (table) | Total | Last 30d | Note |
| --- | --- | --- | --- |
| Quiz plays (plays) KEEP | 65,922 | 5,938 | the core |
| This or That votes (duel_votes) KILL | 75,120 | 13,958 | highest-volume killed table |
| Name Them All / name-all (name_all_member_results) KILL | 7,408 | 4,549 | still played internally |
| Duel results (battle_results) KILL | 3,043 | 1,788 | still active internally |
| Duels (battles) KILL | 2,569 | 1,017 | |
| This or That plays (tot_plays) KILL | 2,440 | 0 | dead recently (duel_votes is the live path) |
| Mini games (game_plays) KILL | 2,240 | 631 | |
| Personality (personality_results) KILL | 1,251 | 625 | |
| Blindtest solo (blind_test_plays) KEEP | 140 | 0 | KEPT but low; blindtest is a bet, not yet a habit |
| Daily blindtest (daily_blindtest_scores) KEEP | 80 | 29 | the daily loop works |
| Published mini-game rows (games) KILL | 56 | 0 | |
| Accounts (profiles) KEEP | 245 | 71 | |
| Tier Lists (tier_lists) KILL | 4 | 4 | shipped 10 days ago; all rows recent |
| tier_list_assets KILL | 11 | n/a | |
| Photocards KILL candidate | 7 | n/a | tiny; confirm wired or dead |
| Collectibles KILL candidate | 5 | n/a | tiny; confirm wired or dead |

Honest reading: the kill DOES remove real INTERNAL engagement (duel_votes 13,958 / 30d,
name-all 4,549, duel 2,805) even though GSC says those surfaces earn near-zero organic clicks
(48 in 3 months). That energy is nav- and cross-promo-driven, not acquisition. The refonte must
re-route it into quiz and blindtest journeys, not merely 301 the URLs. This is stated for the
record; it does not change the settled kill decision.

## The three numbers only the owner can read (dashboard)

1. Current plan and organisation (Pro at 25 USD/month, or Free already): OWNER ACTION.
2. Database size shown in Settings then Usage (may differ from pg_database_size): OWNER ACTION.
3. Egress this month in GB: OWNER ACTION. The verdict on the Free downgrade needs this one,
   because DB and storage already pass with margin after the Pinterest kill; egress is the last
   unknown. Given the ISR architecture (DB touched hourly on revalidation plus on writes), egress
   is expected to be low, but it must be read, not assumed.
