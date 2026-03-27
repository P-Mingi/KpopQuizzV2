-- Add question_count column to avoid fetching the full questions JSON for card display
ALTER TABLE public.quizzes ADD COLUMN question_count INTEGER NOT NULL DEFAULT 0;

-- Backfill from existing data
UPDATE public.quizzes SET question_count = jsonb_array_length(questions::jsonb);
