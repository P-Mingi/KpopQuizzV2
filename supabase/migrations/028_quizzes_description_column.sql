-- ============================================
-- Add missing description column to quizzes
-- This column existed in the old project but was
-- never included in the initial schema migration.
-- ============================================

ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS description TEXT;
