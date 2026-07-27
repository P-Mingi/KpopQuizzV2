-- Migration 122: notification foundation (Workstream O0). Run in the prod SQL
-- editor; not auto-applied.
--
-- Fixes the creator_notifications system: RLS hardening, a real duplicate guard,
-- a per-user preferences table with a single enforcement gate, a DELETE policy,
-- and removal of the 3 never-inserted types. Verified against prod: 118 rows,
-- 10 live types, 0 rows use the dead types, 0 non-null-quiz duplicate rows.

-- 1. RLS UPDATE hardening. The mig-047 policy had USING but no WITH CHECK, so a
--    user's own client could rewrite any column (user_id, type, title, ...).
--    Add WITH CHECK, and restrict the updatable columns to is_read via a
--    column-level GRANT. Column grant (not a BEFORE UPDATE trigger) is the clean
--    choice: it applies only to the `authenticated` role, so the service-role
--    system writes (coalescing, which must change title/body/created_at) are
--    naturally exempt, whereas a trigger would fire for those too and need a
--    carve-out.
DROP POLICY IF EXISTS "Users update own notifications" ON public.creator_notifications;
CREATE POLICY "Users update own notifications" ON public.creator_notifications
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

REVOKE UPDATE ON public.creator_notifications FROM authenticated;
GRANT UPDATE (is_read) ON public.creator_notifications TO authenticated;

-- 2. DELETE policy so users can dismiss their own notifications (O1 item 6).
GRANT DELETE ON public.creator_notifications TO authenticated;
DROP POLICY IF EXISTS "Users delete own notifications" ON public.creator_notifications;
CREATE POLICY "Users delete own notifications" ON public.creator_notifications
  FOR DELETE USING (auth.uid() = user_id);

-- 3. Duplicate guard. A real UNIQUE index so concurrent inserts of the same
--    (user, quiz, type, title) collapse via ON CONFLICT DO NOTHING at the insert
--    site (the milestone double-notify race). NOTE: the fan-out RPC uses a
--    NOT EXISTS anti-join, NOT ON CONFLICT, so there was no pattern to mirror;
--    a unique index is the concurrency-robust fix. NULLs are distinct, so
--    quiz-less types (new_follower, streak) are unaffected and get their own
--    coalescing in code.
CREATE UNIQUE INDEX IF NOT EXISTS creator_notifications_dedup_idx
  ON public.creator_notifications (user_id, quiz_id, type, title);

-- 4. Type CHECK cleanup: drop the 3 never-inserted types (trending, like,
--    achievement_unlocked). 0 rows use them, so this is data-safe; they can
--    return via a future migration when actually wired. Same swap pattern as 111.
ALTER TABLE public.creator_notifications DROP CONSTRAINT IF EXISTS creator_notifications_type_check;
ALTER TABLE public.creator_notifications ADD CONSTRAINT creator_notifications_type_check
  CHECK (type IN (
    'milestone', 'rating', 'comment', 'admin_dm', 'new_follower',
    'streak_milestone', 'group_mastered', 'followed_new_quiz',
    'badge_earned', 'cheer'
  ));

-- 5. Preferences table: one row per user. categories is a jsonb map where an
--    ABSENT category means ON (so the default is everything on) and only
--    {"cat": false} disables one. quiz_mutes is a per-quiz mute list. Designed
--    once to serve every future channel.
CREATE TABLE IF NOT EXISTS public.notification_prefs (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  categories JSONB NOT NULL DEFAULT '{}'::jsonb,
  quiz_mutes UUID[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS np_own_read ON public.notification_prefs;
CREATE POLICY np_own_read ON public.notification_prefs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS np_own_insert ON public.notification_prefs;
CREATE POLICY np_own_insert ON public.notification_prefs FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS np_own_update ON public.notification_prefs;
CREATE POLICY np_own_update ON public.notification_prefs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. The ONE enforcement gate. A BEFORE INSERT trigger on creator_notifications
--    is the only point that catches EVERY insert path: the TS helper, the direct
--    cheer/admin_dm inserts, the followed_new_quiz fan-out RPC, and the
--    group_mastered/badge_earned triggers (3 types are inserted in SQL and can
--    never funnel through one TS function). It maps each type to a category and
--    skips the insert (RETURN NULL) when that category is off or the quiz is
--    muted. SECURITY DEFINER so it can read notification_prefs regardless of RLS.
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

DROP TRIGGER IF EXISTS trg_gate_notification_prefs ON public.creator_notifications;
CREATE TRIGGER trg_gate_notification_prefs
  BEFORE INSERT ON public.creator_notifications
  FOR EACH ROW EXECUTE FUNCTION public.gate_notification_prefs();

NOTIFY pgrst, 'reload schema';
