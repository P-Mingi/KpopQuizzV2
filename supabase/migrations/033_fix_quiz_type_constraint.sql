-- ============================================
-- Fix quiz_type constraint on quizzes table
-- ============================================
-- Migration 027 added quizzes_quiz_type_check with the new types but
-- accidentally dropped the wrong constraint name. The original constraint
-- quiz_type_valid (from 001_schema.sql) was never removed, so image and
-- intruder types were still blocked by the old constraint.

ALTER TABLE public.quizzes DROP CONSTRAINT IF EXISTS quiz_type_valid;
