-- Rollback of quiz-corrections-schema.sql. OWNER-GATED, like the file it undoes.
-- It drops public.quiz_correction_requests, deletes the quiz_correction notifications (the CHECK of
-- 2026-10-27 does not allow them), and restores the CHECK and gate_notification_prefs() exactly as they
-- were read in production on 2026-10-27. Quizzes are not touched.
--
-- Guard: it refuses while a quiz is still in draft because of a correction (a request 'drafted' whose quiz
-- is still 'draft'): dropping the table would lose which quizzes the job moved to draft. List them first:
--   select r.quiz_id, z.slug, r.q_index, r.drafted_at from public.quiz_correction_requests r
--   join public.quizzes z on z.id = r.quiz_id where r.status = 'drafted' and z.status = 'draft';
-- then republish them (admin quiz editor) or decide to keep them in draft and delete those request rows,
-- and run this file again.

begin;

do $$
declare held int;
begin
  if to_regclass('public.quiz_correction_requests') is not null then
    execute $q$select count(*) from public.quiz_correction_requests r join public.quizzes z on z.id = r.quiz_id
             where r.status = 'drafted' and z.status = 'draft'$q$ into held;
    if held > 0 then
      raise exception 'quiz corrections rollback: % quiz(zes) still in draft because of a correction, nothing rolled back (see the header)', held;
    end if;
  end if;
end $$;

drop table if exists public.quiz_correction_requests;

-- the gate function as it was on 2026-10-27 (v12-community-notifications.sql)
create or replace function public.gate_notification_prefs() returns trigger
language plpgsql security definer set search_path = public as $$
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
    WHEN 'community_reply' THEN 'social'
    WHEN 'community_comment' THEN 'social'
    WHEN 'badge_earned' THEN 'achievements'
    WHEN 'group_mastered' THEN 'achievements'
    WHEN 'streak_milestone' THEN 'achievements'
    WHEN 'followed_new_quiz' THEN 'following'
    WHEN 'admin_dm' THEN 'announcements'
    ELSE NULL
  END;

  SELECT * INTO prefs FROM public.notification_prefs WHERE user_id = NEW.user_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF cat IS NOT NULL AND (prefs.categories->>cat) = 'false' THEN
    RETURN NULL;
  END IF;
  IF NEW.quiz_id IS NOT NULL AND NEW.quiz_id = ANY(prefs.quiz_mutes) THEN
    RETURN NULL;
  END IF;

  RETURN NEW;
END $$;

-- the correction notices, then the CHECK of 2026-10-27
delete from public.creator_notifications where type = 'quiz_correction';
alter table public.creator_notifications drop constraint creator_notifications_type_check;
alter table public.creator_notifications add constraint creator_notifications_type_check
  check (type = any (array['milestone', 'rating', 'comment', 'admin_dm', 'new_follower', 'streak_milestone', 'group_mastered', 'followed_new_quiz', 'badge_earned', 'cheer', 'verse_watch', 'battle_beaten', 'community_reply', 'community_comment']));

do $$
begin
  if (select md5(prosrc) from pg_proc where oid = 'public.gate_notification_prefs()'::regprocedure)
     is distinct from 'ec61d1465cb4016fdb26765b5ab7c88c'
  then
    raise exception 'quiz corrections rollback: gate_notification_prefs() did not come back byte for byte, nothing rolled back';
  end if;
end $$;

commit;
