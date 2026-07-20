-- 103 - Custom avatars (Workstream M, M1.27 finalize). Adds the avatar_config
-- column and the public `avatars` storage bucket for flattened avatar PNGs.
-- avatar_ref + avatar_kind already exist (mig 100); avatar_kind already allows
-- 'custom'. The save API writes with the service role (bypasses RLS); the bucket
-- is public-read so every PersonCard renders the flattened image in one request.

-- The exact layer selection, kept so the editor can reopen + the avatar can be
-- re-flattened later if the art / transforms change.
alter table public.profiles
  add column if not exists avatar_config jsonb;

-- Public storage bucket for the flattened avatars.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- Public read for avatar objects (writes go through the service role only).
do $$ begin
  create policy "avatars public read"
    on storage.objects for select
    using (bucket_id = 'avatars');
exception when duplicate_object then null; end $$;
