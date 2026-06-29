-- 086 - K-pop Passport spine (Workstream M, step M0.1).
-- Additive plumbing only. The passport is ONE spine that EXTENDS the existing
-- profiles record plus the existing player_group_mastery table. It does NOT
-- create a parallel identity record. No backfill needed beyond column defaults.
--
-- REUSED (already present, not touched here):
--   profiles.xp                      - global XP pool
--   profiles.total_quizzes_created   - quizzes authored
--   profiles.total_plays_received    - creator side plays on your quizzes
--   profiles.total_likes_received    - likes across your quizzes
--   profiles.avatar_url              - avatar
--   profiles.daily_streak / last_daily_date          - quiz daily streak (mig 076)
--   players.current_streak / longest_streak / last_played_date - blindtest streak (mig 020)
--   player_group_mastery (songs_played, songs_correct, best_score, mastery_level) - per group substrate (mig 020)

-- ----------------------------------------------------------------------------
-- 1. Spine counters on profiles (the account level passport record).
--    These are the genuinely missing per account totals. Quiz, blindtest, duel
--    and battle activity is currently either derived by COUNT() or held only as
--    anon hash keyed rows (duel_votes.voter_hash, battle runs player_hash), so a
--    cheap account level cache does not exist yet.
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists quizzes_played    int not null default 0,
  add column if not exists blindtests_played int not null default 0,
  add column if not exists duels_voted       int not null default 0,
  add column if not exists battles_played    int not null default 0,
  add column if not exists battles_won        int not null default 0;

-- ----------------------------------------------------------------------------
-- 2. Identity fields on profiles (used later in Phase 1, defaulted now).
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists ult_groups    jsonb not null default '[]'::jsonb,
  add column if not exists bias          text,
  add column if not exists profile_theme text  not null default 'default';

-- ----------------------------------------------------------------------------
-- 3. Extend the EXISTING per group store rather than adding a second one.
--    player_group_mastery already holds songs_played / songs_correct / best_score
--    / mastery_level per (player_id, group_id). Accuracy is derived
--    (songs_correct / NULLIF(songs_played, 0)). The only field the passport adds
--    is an explicit mastered flag so the badge state is a single read, not a
--    threshold recompute.
-- ----------------------------------------------------------------------------
alter table public.player_group_mastery
  add column if not exists mastered boolean not null default false;
