-- Rollback of seo-report-autoflag.sql: the function exactly as it was on 2026-10-13
-- (read from pg_get_functiondef before the change).

CREATE OR REPLACE FUNCTION public.handle_new_report()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.quizzes
  SET report_count = report_count + 1,
      status = CASE WHEN report_count + 1 >= 5 THEN 'flagged' ELSE status END
  WHERE id = NEW.quiz_id;
  RETURN NEW;
END;
$function$;

ALTER FUNCTION public.handle_new_report() RESET search_path;

ALTER POLICY reports_insert_all ON public.reports
  WITH CHECK (true);
