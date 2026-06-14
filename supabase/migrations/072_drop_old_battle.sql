-- 072 - DROP the old live room-code / party battle (E-cleanup).
-- The old beta battle (rooms, lobby, live rounds, chat, question bank) is being
-- REPLACED by the new async-ghost battle (E4), so it is removed completely.
-- DESTRUCTIVE: all old battle + party beta data is permanently lost (intended).
-- Defined by migrations 051 (party_*) and 064 (battle_*). Nothing outside the
-- old battle code referenced these tables/functions (verified by grep).

-- 1. Storage policies for the old battle question-image bucket (064).
-- NOTE: the bucket itself ('battle-question-images') and its objects are removed
-- via the Storage API (direct DELETE on storage.objects is blocked by Supabase),
-- so this migration only drops the now-orphaned RLS policies.
drop policy if exists "battle_qimages_public_read" on storage.objects;
drop policy if exists "battle_qimages_auth_upload" on storage.objects;

-- 2. RPCs/functions (064). Drop every battle_* function regardless of signature.
do $$
declare r record;
begin
  for r in
    select oid::regprocedure as sig
    from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname like 'battle\_%'
  loop
    execute 'drop function if exists ' || r.sig || ' cascade';
  end loop;
end $$;

-- 3. Tables (CASCADE also drops their policies, indexes, triggers, FKs).
--    Old battle (064):
drop table if exists public.battle_round_answers   cascade;
drop table if exists public.battle_rounds          cascade;
drop table if exists public.battle_chat_messages   cascade;
drop table if exists public.battle_moderation_tokens cascade;
drop table if exists public.battle_question_reports cascade;
drop table if exists public.battle_questions        cascade;
drop table if exists public.battle_players          cascade;
drop table if exists public.battle_rooms            cascade;
--    Old party prototype (051):
drop table if exists public.party_players           cascade;
drop table if exists public.party_rooms             cascade;
