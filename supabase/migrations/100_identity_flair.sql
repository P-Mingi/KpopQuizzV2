-- 100 - Identity flair foundation (Workstream M, M1.26). Additive flair fields on
-- profiles, validated against CURATED sets (server-side in lib/passport-flair.ts;
-- no arbitrary colors/fonts -> readable in both modes, no abuse surface). Reuses
-- the existing bias / ult_groups / profile_theme (mig 086, M1.6). avatar_kind +
-- avatar_ref are forward-compatible with the M1.27 custom-avatar builder: the same
-- slot accepts a photo url, a preset key, or (later) a composited-avatar config.
alter table public.profiles
  add column if not exists name_accent     text not null default 'default',  -- curated palette key
  add column if not exists name_font        text not null default 'default',  -- curated type key
  add column if not exists pinned_badge_id  text references public.badge_definitions(id) on delete set null,
  add column if not exists avatar_kind      text not null default 'photo',
  add column if not exists avatar_ref       text;                              -- url | preset key | avatar config json

-- avatar_kind is a tiny fixed set, so a DB CHECK is safe. name_accent / name_font
-- evolve with the curated TS set, so they are validated in the update path, not here.
do $$ begin
  alter table public.profiles
    add constraint profiles_avatar_kind_check check (avatar_kind in ('photo', 'preset', 'custom'));
exception when duplicate_object then null; end $$;
