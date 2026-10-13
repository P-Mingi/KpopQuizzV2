-- SEO / moderation (2026-10-13). OWNER-GATED: not applied. Rollback: seo-report-autoflag-rollback.sql.
--
-- What it fixes. public.handle_new_report() flags a quiz (status 'flagged', which takes it
-- off the site: /q/<slug> 404s, it leaves lists and the sitemap) on its 5th report row of
-- ANY kind. The reports policy reports_insert_all lets anyone insert, signed in or not, so:
--   - 5 anonymous requests with the public anon key take any quiz offline;
--   - the moderation queue rows the app files itself ("[Auto] User-uploaded image(s) queued
--     for moderation review.", reporter_id null) count toward the 5;
--   - the retired Battle mode filed one anonymous "[Battle question]" report per question,
--     which flagged 7 popular quizzes (5,210 plays in total) with zero signed-in reporters.
--
-- The change. report_count still counts every row (the admin view is unchanged), but a
-- quiz is auto-flagged only when 5 DISTINCT signed-in users have reported it, and only
-- from 'published' (the old CASE could also turn a removed or draft quiz into 'flagged').
-- Anonymous reports still reach the admin queue; they just cannot take a quiz down alone.
-- The trigger (AFTER INSERT on public.reports) is unchanged and keeps calling this function.

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
