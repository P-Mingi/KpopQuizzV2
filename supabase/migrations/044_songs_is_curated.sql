-- Migration 044: add is_curated flag to songs and seed a tiered curation.
-- Run this manually via supabase db push or psql; not auto-applied.
--
-- Purpose:
--   General playlists (All K-pop, Girl groups, Boy groups, Solo, by-generation)
--   should pull from a canonical subset of songs so popular tracks dominate.
--   Group-specific playlists keep full-catalog access but still exclude
--   remixes / instrumentals via the API filter.
--
-- Strategy:
--   Tier 1: top 25 tracks per artist for 22 flagship groups (by deezer_rank)
--   Tier 2: top 15 tracks per artist for everyone else
--   Both tiers exclude remixes, instrumentals, and special-version reissues
--   via title ILIKE filters.
--
-- Idempotent: safe to re-run; resets the flag before recomputing.

-- Ensure deezer_rank column exists (may be missing if 029 was partially applied)
ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS deezer_rank INTEGER DEFAULT 0;

ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS is_curated BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_songs_is_curated
  ON public.songs (is_curated)
  WHERE is_curated = true;

UPDATE public.songs SET is_curated = false;

WITH eligible AS (
  SELECT id, artist_name, deezer_rank,
    ROW_NUMBER() OVER (
      PARTITION BY artist_name
      ORDER BY deezer_rank DESC NULLS LAST, play_count DESC NULLS LAST
    ) AS rn
  FROM public.songs
  WHERE status = 'active'
    AND preview_url IS NOT NULL
    AND title NOT ILIKE '%remix%'
    AND title NOT ILIKE '%instrumental%'
    AND title NOT ILIKE '%inst.%'
    AND title NOT ILIKE '%(inst)%'
    AND title NOT ILIKE '%acoustic ver%'
    AND title NOT ILIKE '%slow ver%'
    AND title NOT ILIKE '%fast ver%'
    AND title NOT ILIKE '%speed up%'
    AND title NOT ILIKE '%sped up%'
    AND title NOT ILIKE '%slowed%'
    AND title NOT ILIKE '%reverb%'
    AND title NOT ILIKE '%karaoke%'
    AND title NOT ILIKE '%MR removed%'
    AND title NOT ILIKE '%concert ver%'
    AND title NOT ILIKE '%live ver%'
    AND title NOT ILIKE '%demo ver%'
    AND title NOT ILIKE '%english ver%'
    AND title NOT ILIKE '%japanese ver%'
    AND title NOT ILIKE '%chinese ver%'
),
tier1 AS (
  -- Top 25 tracks for 22 flagship groups.
  SELECT id FROM eligible
  WHERE rn <= 25
    AND artist_name IN (
      'BTS', 'BLACKPINK', 'TWICE', 'Stray Kids', 'aespa', 'NewJeans',
      'SEVENTEEN', 'EXO', 'Red Velvet', '(G)I-DLE', 'IVE', 'LE SSERAFIM',
      'ITZY', 'NCT 127', 'SHINee', 'BIGBANG', 'Girls'' Generation', 'GOT7',
      'MONSTA X', 'TXT', 'ENHYPEN', 'ATEEZ'
    )
),
tier2 AS (
  -- Top 15 tracks for everyone else.
  SELECT id FROM eligible
  WHERE rn <= 15
    AND artist_name NOT IN (
      'BTS', 'BLACKPINK', 'TWICE', 'Stray Kids', 'aespa', 'NewJeans',
      'SEVENTEEN', 'EXO', 'Red Velvet', '(G)I-DLE', 'IVE', 'LE SSERAFIM',
      'ITZY', 'NCT 127', 'SHINee', 'BIGBANG', 'Girls'' Generation', 'GOT7',
      'MONSTA X', 'TXT', 'ENHYPEN', 'ATEEZ'
    )
)
UPDATE public.songs
SET is_curated = true
WHERE id IN (SELECT id FROM tier1)
   OR id IN (SELECT id FROM tier2);

COMMENT ON COLUMN public.songs.is_curated IS
  'True for the canonical subset used by general playlists. Group-specific playlists ignore this flag and use the API-side remix filter instead.';
