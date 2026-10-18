-- Rollback of seo-report-autoflag-v2.sql: back to v1 (applied 2026-10-14), auto-flag on 5
-- distinct signed-in reporters, only from published.

CREATE OR REPLACE FUNCTION public.handle_new_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.quizzes q
  SET report_count = q.report_count + 1,
      status = CASE
        WHEN q.status = 'published' AND (
          SELECT count(DISTINCT r.reporter_id)
          FROM public.reports r
          WHERE r.quiz_id = NEW.quiz_id AND r.reporter_id IS NOT NULL
        ) >= 5 THEN 'flagged'
        ELSE q.status
      END
  WHERE q.id = NEW.quiz_id;
  RETURN NEW;
END;
$function$;
