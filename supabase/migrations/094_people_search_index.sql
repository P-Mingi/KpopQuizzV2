-- 094 - People search index (Workstream M, M1.9). Trigram GIN indexes so the
-- account search (ILIKE on username + display_name) is index-backed and
-- NANO-cheap, never a sequential scan. pg_trgm is standard on Supabase.
create extension if not exists pg_trgm;

create index if not exists profiles_username_trgm
  on public.profiles using gin (username gin_trgm_ops);

create index if not exists profiles_display_name_trgm
  on public.profiles using gin (display_name gin_trgm_ops);
