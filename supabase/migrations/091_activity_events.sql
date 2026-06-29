-- 091 - Activity stream (Workstream M, M1.7). A LIVE DISPLAY stream, not
-- analytics: a global "happening now" feed for the home ticker. 30-day retention
-- (nightly prune). display_name is resolved AT WRITE TIME to the user's chosen
-- username (public profiles) or 'someone' (anon / banned). NEVER a hash or IP.
create table if not exists public.activity_events (
  id           bigint generated always as identity primary key,
  event_type   text not null,
  user_id      uuid references auth.users(id) on delete set null,
  display_name text not null,
  group_slug   text,
  payload      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

-- Recent-read index (newest first) + the prune scan both ride this.
create index if not exists activity_events_created_idx on public.activity_events (created_at desc);

alter table public.activity_events enable row level security;
-- Public read (display_name is already baked, no PII). Writes happen ONLY through
-- the SECURITY DEFINER emit_activity below and the service-role prune, so there
-- are deliberately no insert / update / delete policies.
create policy activity_select_all on public.activity_events for select using (true);

-- One shared emit helper so the deposit points do not each duplicate the insert
-- or the name-resolution rule. Folded into record_play / record_bt_play /
-- cast_duel_vote / the battle trigger / handle_new_quiz (migration 092).
create or replace function public.emit_activity(
  p_event_type text,
  p_user_id    uuid,
  p_group_slug text,
  p_payload    jsonb
) returns void
language sql
security definer
set search_path = public
as $$
  insert into public.activity_events (event_type, user_id, display_name, group_slug, payload)
  values (
    p_event_type,
    p_user_id,
    coalesce((select username from public.profiles where id = p_user_id and banned_at is null), 'someone'),
    p_group_slug,
    coalesce(p_payload, '{}'::jsonb)
  );
$$;

-- Internal only (called from other SECURITY DEFINER functions); never a direct
-- client RPC. Revoke per the 081/082 lockdown pattern.
revoke execute on function public.emit_activity(text, uuid, text, jsonb) from anon, authenticated;
