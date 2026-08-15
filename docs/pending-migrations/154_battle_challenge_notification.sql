-- W2 - "your run was beaten" notification for the 1v1 battle loop.
-- OWNER APPLIES THIS BY HAND. The worker never runs DDL (mission: NO DDL, block
-- instead) and the app is written to fail soft until this lands: the notification
-- insert is wrapped and swallowed, so an un-migrated database simply drops the
-- notification and nothing else in the battle flow is affected.
--
-- Two changes, both required for the type to actually work:
--   1. the creator_notifications type CHECK must accept 'battle_beaten'
--   2. gate_notification_prefs() must map it to a category, otherwise the type
--      bypasses the user's mute preferences entirely and is undeliverable-by-mute
--      (this is exactly what happened to 'verse_watch', fixed here too).
--
-- Verified against the live schema on 2026-08-15: the CHECK currently lives in
-- 133_verse_discussions_watchlists.sql:45-51 and the CASE in
-- 122_notification_foundation.sql:83-95.

BEGIN;

-- 1. Swap the type CHECK, carrying the full current list forward and adding
--    'battle_beaten'. 'verse_watch' is already live in the DB CHECK and is kept.
ALTER TABLE public.creator_notifications
  DROP CONSTRAINT IF EXISTS creator_notifications_type_check;

ALTER TABLE public.creator_notifications
  ADD CONSTRAINT creator_notifications_type_check CHECK (type IN (
    'milestone',
    'rating',
    'comment',
    'admin_dm',
    'new_follower',
    'streak_milestone',
    'group_mastered',
    'followed_new_quiz',
    'badge_earned',
    'cheer',
    'verse_watch',
    'battle_beaten'
  ));

-- 2. Give the new type a preferences category so it is mutable like everything
--    else. 'social' is the right bucket: it is another person acting on you.
--    'verse_watch' is added at the same time; it has been unmutable since 133.
CREATE OR REPLACE FUNCTION public.gate_notification_prefs()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cat TEXT;
  prefs public.notification_prefs%ROWTYPE;
BEGIN
  cat := CASE NEW.type
    WHEN 'milestone' THEN 'your_quizzes'
    WHEN 'rating' THEN 'your_quizzes'
    WHEN 'comment' THEN 'your_quizzes'
    WHEN 'new_follower' THEN 'social'
    WHEN 'cheer' THEN 'social'
    WHEN 'battle_beaten' THEN 'social'
    WHEN 'verse_watch' THEN 'social'
    WHEN 'badge_earned' THEN 'achievements'
    WHEN 'group_mastered' THEN 'achievements'
    WHEN 'streak_milestone' THEN 'achievements'
    WHEN 'followed_new_quiz' THEN 'following'
    WHEN 'admin_dm' THEN 'announcements'
    ELSE NULL
  END;

  SELECT * INTO prefs FROM public.notification_prefs WHERE user_id = NEW.user_id;
  IF NOT FOUND THEN
    RETURN NEW; -- no prefs row: everything on
  END IF;

  IF cat IS NOT NULL AND (prefs.categories->>cat) = 'false' THEN
    RETURN NULL; -- category muted
  END IF;
  IF NEW.quiz_id IS NOT NULL AND NEW.quiz_id = ANY(prefs.quiz_mutes) THEN
    RETURN NULL; -- this quiz muted
  END IF;

  RETURN NEW;
END $$;

-- The trigger itself is unchanged; CREATE OR REPLACE keeps it bound.

COMMIT;

-- ROLLBACK NOTE: to undo, re-run the 133 CHECK (without 'battle_beaten') and the
-- 122 function body (without the two new WHEN lines). No data is written by this
-- migration, so nothing is lost either way.
