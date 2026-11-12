-- 100-bucket-cards.sql (Bunnyverse Cards, lane DATA, 2026-11-12; the public bucket of the card files)
--
-- What:   makes sure the public storage bucket 'cards' exists: WebP only, 2 MB a file. The owner's script (out/cards-tool/publish.mjs)
--         uploads the cropped card photos there (<slug>-<fx>-<fy>-1x.webp 320 x 495 and -2x.webp 640 x 989).
-- Why:    amendment 1 (docs/o1/briefs/CARDS-AMEND-1.md, point 7): the cards show a WebP cut at the focal point once the file exists.
--         003-rls.sql already creates the bucket at 1 MB; this file sets the limit of the brief (2 MB) and is safe to run before or after it.
-- Rows:   1 bucket row (inserted or updated). Nothing else is touched.
-- Needs:  storage.buckets (always there in Supabase).
-- Verify: select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'cards';   expect cards, t, 2097152, {image/webp}
-- Undo:   100-bucket-cards.rollback.sql (puts the limit back to the 1 MB of 003; the bucket and its files stay).
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $c100$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  if to_regclass('storage.buckets') is null then
    raise exception '100-bucket-cards: storage.buckets is missing';
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('cards', 'cards', true, 2097152, array['image/webp'])
  on conflict (id) do update
    set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/webp'];

  if (select file_size_limit from storage.buckets where id = 'cards') is distinct from 2097152 then
    raise exception '100-bucket-cards: the bucket cards does not hold the 2 MB limit';
  end if;
end $c100$;
