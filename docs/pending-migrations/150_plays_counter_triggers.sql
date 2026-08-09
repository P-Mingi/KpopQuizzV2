-- Migration 150: keep quizzes.{play_count,total_completions,total_score_sum}
-- in sync with the plays table on DELETE and UPDATE.
--
-- WHY: record_play() maintains these three denormalized counters on INSERT
-- (INSERT plays + counter += 1 / += score, atomically). Nothing maintained
-- them when a plays row was later DELETED or its score EDITED, so admin
-- cleanups, account-deletion cascades and score corrections silently drifted
-- the counters (found 2026-08-09: got7 / red-velvet had deleted plays,
-- ateez had an edited score). INSERT stays owned by record_play; this
-- migration adds ONLY the missing DELETE and UPDATE maintenance, so there is
-- no double-count with record_play's existing INSERT increment.
--
-- Safe to apply after the one-off reconcile that zeroed all drift.

CREATE OR REPLACE FUNCTION public.fn_plays_counter_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.quizzes
       SET play_count        = GREATEST(play_count - 1, 0),
           total_completions = GREATEST(total_completions - 1, 0),
           total_score_sum   = GREATEST(total_score_sum - COALESCE(OLD.score, 0), 0),
           updated_at        = NOW()
     WHERE id = OLD.quiz_id;
    RETURN OLD;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Row moved to another quiz (defensive; quiz_id is expected immutable).
    IF NEW.quiz_id IS DISTINCT FROM OLD.quiz_id THEN
      UPDATE public.quizzes
         SET play_count        = GREATEST(play_count - 1, 0),
             total_completions = GREATEST(total_completions - 1, 0),
             total_score_sum   = GREATEST(total_score_sum - COALESCE(OLD.score, 0), 0),
             updated_at        = NOW()
       WHERE id = OLD.quiz_id;
      UPDATE public.quizzes
         SET play_count        = play_count + 1,
             total_completions = total_completions + 1,
             total_score_sum   = total_score_sum + COALESCE(NEW.score, 0),
             updated_at        = NOW()
       WHERE id = NEW.quiz_id;
    ELSIF NEW.score IS DISTINCT FROM OLD.score THEN
      UPDATE public.quizzes
         SET total_score_sum = GREATEST(total_score_sum + COALESCE(NEW.score, 0) - COALESCE(OLD.score, 0), 0),
             updated_at      = NOW()
       WHERE id = NEW.quiz_id;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

-- DELETE + UPDATE only. INSERT is deliberately excluded (record_play owns it).
DROP TRIGGER IF EXISTS trg_plays_counter_sync_del ON public.plays;
CREATE TRIGGER trg_plays_counter_sync_del
  AFTER DELETE ON public.plays
  FOR EACH ROW EXECUTE FUNCTION public.fn_plays_counter_sync();

DROP TRIGGER IF EXISTS trg_plays_counter_sync_upd ON public.plays;
CREATE TRIGGER trg_plays_counter_sync_upd
  AFTER UPDATE ON public.plays
  FOR EACH ROW EXECUTE FUNCTION public.fn_plays_counter_sync();

-- Set-based reconcile for the nightly cron safety net. Recomputes the three
-- counters from the plays table for every quiz. Idempotent.
CREATE OR REPLACE FUNCTION public.reconcile_quiz_counters()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fixed integer;
BEGIN
  WITH agg AS (
    SELECT q.id AS quiz_id,
           COUNT(p.id)                   AS rp,
           COALESCE(SUM(p.score), 0)     AS rs
      FROM public.quizzes q
      LEFT JOIN public.plays p ON p.quiz_id = q.id
     GROUP BY q.id
  ),
  upd AS (
    UPDATE public.quizzes q
       SET play_count        = a.rp,
           total_completions = a.rp,
           total_score_sum   = a.rs
      FROM agg a
     WHERE a.quiz_id = q.id
       AND (q.play_count <> a.rp OR q.total_completions <> a.rp OR q.total_score_sum <> a.rs)
    RETURNING q.id
  )
  SELECT COUNT(*) INTO fixed FROM upd;
  RETURN fixed;
END;
$$;
