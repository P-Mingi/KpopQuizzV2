-- Migration 071 (H6): persist the share-card customization on the quiz.
-- Run manually in the Supabase SQL editor (like 069/070); not auto-applied.
--
-- share_card = { overlay: 'dark-bottom'|'full-dark'|'brand'|'purple',
--                opacity: 0..100, hook: text, title: text }
-- The /api/og/[slug] endpoint reads these as defaults so the unfurl reflects
-- the creator's saved card for everyone. Null = use the computed defaults.

ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS share_card JSONB;
