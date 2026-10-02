-- G9 exclusions check for C2. READ ONLY (SELECT only). Not a migration.
-- Run after v12-g9-editorial.sql and v12-g9-editorial-accounts.sql are applied.
-- Not run by G9: the tables do not exist yet and no editorial account exists.
--
-- SYSTEM.md 5.6: an editorial account creates topics, debates and blogs and does
-- nothing else. Query 1 must show 0 in every column except the three "made" ones.
-- Query 2 must return no row. Query 3 lists what they published.

-- 1. One row per editorial account: everything a fan can do, counted.
SELECT
  a.display_name,
  a.beat,
  a.active,
  p.username,
  coalesce(p.xp, 0)                                                                   AS xp,                 -- expect 0
  (SELECT count(*) FROM public.plays x WHERE x.player_id = a.user_id)                 AS quiz_plays,         -- expect 0
  (SELECT count(*) FROM public.quizzes x WHERE x.creator_id = a.user_id)              AS quizzes_made,       -- expect 0
  (SELECT count(*) FROM public.user_badges x WHERE x.user_id = a.user_id)             AS badges,             -- expect 0 (see note)
  (SELECT count(*) FROM public.activity_events x WHERE x.user_id = a.user_id)         AS activity_events,    -- expect 0
  (SELECT count(*) FROM public.debate_votes x WHERE x.user_id = a.user_id)            AS daily_debate_votes, -- expect 0
  (SELECT count(*) FROM public.community_debate_votes x WHERE x.user_id = a.user_id)  AS fan_debate_votes,   -- expect 0
  (SELECT count(*) FROM public.community_likes x WHERE x.user_id = a.user_id)         AS hearts,             -- expect 0
  (SELECT count(*) FROM public.community_replies x WHERE x.author = a.user_id)        AS replies,            -- expect 0
  (SELECT count(*) FROM public.community_challenges x WHERE x.author = a.user_id)     AS challenges,         -- expect 0
  (SELECT count(*) FROM public.verse_discussions x WHERE x.author = a.user_id)        AS verse_comments,     -- expect 0
  (SELECT count(*) FROM public.daily_blindtest_scores x WHERE x.user_id = a.user_id)  AS daily_bt_scores,    -- expect 0
  (SELECT count(*) FROM public.community_debates x WHERE x.author = a.user_id)        AS debates_made,       -- their work
  (SELECT count(*) FROM public.editorial_posts x WHERE x.author = a.user_id)          AS posts_made,         -- their work
  (SELECT count(*) FROM public.editorial_drafts x WHERE x.account_id = a.user_id)     AS drafts              -- their work
FROM public.editorial_accounts a
LEFT JOIN public.profiles p ON p.id = a.user_id
ORDER BY a.created_at;
-- Note on badges: migration 104 stamped founding_fan on every account that existed
-- then. An account created after it has none; one created before shows 1.

-- 2. Nothing published without an admin review, never more than 3 a UTC day,
--    never two in a row from one account. Expect NO ROW from each.
SELECT id, status, reviewed_by, reviewed_at FROM public.editorial_drafts
 WHERE status IN ('approved', 'published') AND (reviewed_by IS NULL OR reviewed_at IS NULL);

SELECT (published_at AT TIME ZONE 'UTC')::date AS utc_day, count(*) AS items
  FROM public.editorial_drafts WHERE status = 'published'
 GROUP BY 1 HAVING count(*) > 3;

SELECT id, account_id, published_at FROM (
  SELECT id, account_id, published_at,
         lag(account_id) OVER (ORDER BY published_at, id) AS previous_account
    FROM public.editorial_drafts WHERE status = 'published'
) t WHERE account_id = previous_account;

-- 3. What they published, newest first (compare reviewed_by with ADMIN_USER_IDS).
SELECT d.id, a.display_name, d.kind, d.title, d.reviewed_by, d.scheduled_at, d.published_at, d.published_ref
  FROM public.editorial_drafts d JOIN public.editorial_accounts a ON a.user_id = d.account_id
 WHERE d.status = 'published' ORDER BY d.published_at DESC LIMIT 50;
