-- Add SEO intro column for group quiz landing pages
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS seo_intro TEXT;
