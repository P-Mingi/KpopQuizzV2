-- Custom profile header / banner image. The passport shows this image behind
-- the identity (avatar overlaps it); NULL falls back to the holographic
-- gradient default rendered in the client. Covered by the existing profiles
-- RLS (owners update their own row), so no new policy is needed.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS header_url text;
