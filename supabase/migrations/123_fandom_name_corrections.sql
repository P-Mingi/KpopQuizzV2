-- Workstream G2 step 1 - fandom_name corrections.
--
-- NOTE: groups.fandom_name ALREADY EXISTS (added in 001_schema.sql, seeded in
-- 004_seed.sql) and every one of the 87 groups is already populated - so there
-- is NO ADD COLUMN here. Of the 20 owner-listed fandoms, 18 already match the
-- live data exactly. This migration only corrects the two that differ:
--   1. NMIXX: "NSWer" -> "NSWER" (the official all-caps stylization).
--   2. BABYMONSTER: "fan" (placeholder) -> "MONSTIEZ" (its official fandom).
--
-- Groups without a curated group-level fandom (solo acts, uncurated) keep the
-- literal "fan" placeholder, which the meta-description fallback relies on
-- ("...prove you are a real fan."). The G2 hero treats "fan" as "no fandom" and
-- hides the "Home of {fandom}" line, so no NULLing is needed.

UPDATE public.groups SET fandom_name = 'NSWER'    WHERE slug = 'nmixx'       AND fandom_name = 'NSWer';
UPDATE public.groups SET fandom_name = 'MONSTIEZ' WHERE slug = 'babymonster' AND fandom_name = 'fan';
