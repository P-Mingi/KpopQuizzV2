-- Add review tracking columns for user-created groups
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS needs_review BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS created_by_user BOOLEAN NOT NULL DEFAULT FALSE;
