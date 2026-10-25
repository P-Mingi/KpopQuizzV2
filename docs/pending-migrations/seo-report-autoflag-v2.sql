-- Auto-unpublish rule v2 (owner go 2026-10-15; proposed in PR #100). Applied by Claude via the
-- connector after the merge of #100. Rollback: seo-report-autoflag-v2-rollback.sql (restores v1,
-- the function of seo-report-autoflag.sql applied on 2026-10-14).
--
-- report_count still counts every report row (the admin view is unchanged). A published quiz is
-- auto-hidden (status 'flagged') only when ALL of these hold:
--   - the new report comes from a signed-in user (anonymous rows and the app's "[Auto]"
--     moderation rows have reporter_id null: they never flag a quiz);
--   - the quiz has fewer than 100 completions (a popular quiz is never auto-hidden: its reports
--     wait in the admin queue);
--   - 5 or more different signed-in users reported it in the last 90 days (older reports expire;
--     reports an admin resolved or dismissed do not count);
--   - those reporters are at least 10% of the quiz's signed-in players in the last 30 days.
-- The reports_insert_all policy (anonymous, or in the name of the signed-in user only) is
-- unchanged.
--
-- APPLIED 2026-10-15 (pg_get_functiondef matches this file). Checked the same day in one
-- transaction rolled back at the end, on a published quiz: a signed-in report in the user's own
-- name and an anonymous report are both accepted (report_count +2, status stays published), a
-- report in another user's name is refused by RLS (42501); nothing was left behind.

CREATE OR REPLACE FUNCTION public.handle_new_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_completions integer;
  v_reporters integer;
  v_players integer;
BEGIN
  UPDATE public.quizzes SET report_count = report_count + 1 WHERE id = NEW.quiz_id;

  IF NEW.reporter_id IS NULL OR NEW.quiz_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT total_completions INTO v_completions
  FROM public.quizzes WHERE id = NEW.quiz_id AND status = 'published';
  IF NOT FOUND OR coalesce(v_completions, 0) >= 100 THEN
    RETURN NEW;
  END IF;

  SELECT count(DISTINCT r.reporter_id) INTO v_reporters
  FROM public.reports r
  WHERE r.quiz_id = NEW.quiz_id
    AND r.reporter_id IS NOT NULL
    AND coalesce(r.status, 'pending') NOT IN ('resolved', 'dismissed')
    AND r.created_at > now() - interval '90 days';
  IF v_reporters < 5 THEN
    RETURN NEW;
  END IF;

  SELECT count(DISTINCT p.player_id) INTO v_players
  FROM public.plays p
  WHERE p.quiz_id = NEW.quiz_id
    AND p.player_id IS NOT NULL
    AND p.created_at > now() - interval '30 days';
  IF v_reporters * 10 >= v_players THEN
    UPDATE public.quizzes SET status = 'flagged' WHERE id = NEW.quiz_id AND status = 'published';
  END IF;

  RETURN NEW;
END;
$function$;
