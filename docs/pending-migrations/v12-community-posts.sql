-- V12 community posts (owner request 2026-10-06): fans post Threads and Blogs from
-- /community for every group and General K-pop, banned terms block posts and replies,
-- photos are checked server side, and the 3rd report by 3 different accounts hides a
-- post or a reply for everyone (restorable from /admin/community-reports).
--
-- ADDITIVE ONLY: no existing row is changed or deleted. New nullable columns (existing
-- rows stay NULL), two CHECK constraints widened (their old values stay valid), one
-- partial unique index (verse_flags is empty today), one log table, one trigger, and
-- banned terms inserted (verse_banned_terms is empty today).
-- Rollback: docs/pending-migrations/v12-community-posts-rollback.sql

begin;

-- 1. Threads and blogs posted from /community: their origin (shown on /community for
--    any group, whatever the Verse gates) and a thread photo. NULL = a Verse post as today.
alter table public.verse_threads add column if not exists origin text;
alter table public.verse_threads add column if not exists cover jsonb;
alter table public.verse_essays add column if not exists origin text;
alter table public.verse_threads drop constraint if exists verse_threads_origin_check;
alter table public.verse_threads add constraint verse_threads_origin_check check (origin is null or origin = 'community');
alter table public.verse_essays drop constraint if exists verse_essays_origin_check;
alter table public.verse_essays add constraint verse_essays_origin_check check (origin is null or origin = 'community');
create index if not exists verse_threads_community_idx on public.verse_threads (created_at desc) where origin = 'community' and status = 'visible';
create index if not exists verse_essays_community_idx on public.verse_essays (featured_at desc) where origin = 'community' and status = 'featured';

-- 2. A blog can be hidden (3 reports). The old values stay valid.
alter table public.verse_essays drop constraint verse_essays_status_check;
alter table public.verse_essays add constraint verse_essays_status_check
  check (status = any (array['draft', 'submitted', 'featured', 'rejected', 'hidden']));

-- 3. Reports on community posts and replies reuse verse_flags: new target types, and one
--    report per account and content.
alter table public.verse_flags drop constraint verse_flags_target_type_check;
alter table public.verse_flags add constraint verse_flags_target_type_check
  check (target_type = any (array['comment', 'revision', 'suggestion', 'thread', 'essay', 'debate', 'challenge', 'reply']));
create unique index if not exists verse_flags_one_report_per_account
  on public.verse_flags (target_type, target_id, reporter)
  where reporter is not null and target_type in ('comment', 'thread', 'essay', 'debate', 'challenge', 'reply');

-- 4. What the 3rd report hid, with its status before, so the admin can restore it.
create table if not exists public.community_autohidden (
  id bigserial primary key,
  target_type text not null check (target_type in ('comment', 'thread', 'essay', 'debate', 'challenge', 'reply')),
  target_id integer not null,
  prev_status text not null,
  reports integer not null,
  hidden_at timestamptz not null default now(),
  restored_at timestamptz,
  restored_by uuid
);
create index if not exists community_autohidden_open_idx on public.community_autohidden (hidden_at desc) where restored_at is null;
alter table public.community_autohidden enable row level security; -- no policy: service role only

-- 5. The 3rd open report by 3 different accounts hides the content (never deletes it).
create or replace function public.community_autohide_on_report() returns trigger
language plpgsql set search_path = public as $$
declare
  n integer;
  prev text;
begin
  if new.reporter is null or new.status <> 'open'
     or new.target_type not in ('comment', 'thread', 'essay', 'debate', 'challenge', 'reply') then
    return new;
  end if;
  select count(distinct reporter) into n from verse_flags
   where target_type = new.target_type and target_id = new.target_id and status = 'open' and reporter is not null;
  if n < 3 then
    return new;
  end if;
  if new.target_type = 'thread' then
    update verse_threads set status = 'hidden', updated_at = now() where id = new.target_id and status = 'visible' returning 'visible' into prev;
  elsif new.target_type = 'essay' then
    update verse_essays set status = 'hidden', updated_at = now() where id = new.target_id and status = 'featured' returning 'featured' into prev;
  elsif new.target_type = 'comment' then
    update verse_discussions set status = 'hidden', updated_at = now() where id = new.target_id and status = 'visible' returning 'visible' into prev;
  elsif new.target_type = 'debate' then
    update community_debates set status = 'hidden' where id = new.target_id and status = 'visible' returning 'visible' into prev;
  elsif new.target_type = 'challenge' then
    update community_challenges set status = 'hidden' where id = new.target_id and status = 'visible' returning 'visible' into prev;
  elsif new.target_type = 'reply' then
    update community_replies set status = 'hidden' where id = new.target_id and status = 'visible' returning 'visible' into prev;
  end if;
  if prev is not null then
    insert into community_autohidden (target_type, target_id, prev_status, reports) values (new.target_type, new.target_id, prev, n);
  end if;
  return new;
end;
$$;
revoke all on function public.community_autohide_on_report() from public, anon, authenticated;
drop trigger if exists verse_flags_autohide on public.verse_flags;
create trigger verse_flags_autohide after insert on public.verse_flags
  for each row execute function public.community_autohide_on_report();

-- 6. Banned terms: NSFW, sexual and serious insults in English, French, Spanish,
--    Indonesian and Korean. Matching is done in lib/verse/banned-match.ts on whole words
--    (accents, leetspeak digits, spaced letters, repeated letters and common suffixes
--    normalised; Korean with an exception list), so a term inside a normal word never
--    blocks. Ambiguous words with an everyday meaning are left out on purpose
--    (e.g. "pd", "con", "bite", "pedo", "chink", "anjing", "babi", "새끼", "미친", "걸레",
--    "보지" and "자지", which are also everyday verb forms, and "spic", which the suffix rule
--    would read in "spices").
insert into public.verse_banned_terms (term, action, note) values
  -- English: sexual and NSFW
  ('porn', 'block', 'v12-community:en:sexual'), ('porno', 'block', 'v12-community:en:sexual'),
  ('pornography', 'block', 'v12-community:en:sexual'), ('pornhub', 'block', 'v12-community:en:sexual'),
  ('xvideos', 'block', 'v12-community:en:sexual'), ('xhamster', 'block', 'v12-community:en:sexual'),
  ('redtube', 'block', 'v12-community:en:sexual'), ('hentai', 'block', 'v12-community:en:sexual'),
  ('nsfw', 'block', 'v12-community:en:sexual'), ('nudes', 'block', 'v12-community:en:sexual'),
  ('send nudes', 'block', 'v12-community:en:sexual'), ('sex tape', 'block', 'v12-community:en:sexual'),
  ('sextape', 'block', 'v12-community:en:sexual'), ('blowjob', 'block', 'v12-community:en:sexual'),
  ('blow job', 'block', 'v12-community:en:sexual'), ('handjob', 'block', 'v12-community:en:sexual'),
  ('rimjob', 'block', 'v12-community:en:sexual'), ('deepthroat', 'block', 'v12-community:en:sexual'),
  ('cumshot', 'block', 'v12-community:en:sexual'), ('creampie', 'block', 'v12-community:en:sexual'),
  ('gangbang', 'block', 'v12-community:en:sexual'), ('bukkake', 'block', 'v12-community:en:sexual'),
  ('dildo', 'block', 'v12-community:en:sexual'), ('masturbate', 'block', 'v12-community:en:sexual'),
  ('masturbating', 'block', 'v12-community:en:sexual'), ('masturbation', 'block', 'v12-community:en:sexual'),
  ('jerk off', 'block', 'v12-community:en:sexual'), ('jack off', 'block', 'v12-community:en:sexual'),
  ('wank', 'block', 'v12-community:en:sexual'), ('wanker', 'block', 'v12-community:en:insult'),
  ('pussy', 'block', 'v12-community:en:sexual'), ('cunt', 'block', 'v12-community:en:insult'),
  ('twat', 'block', 'v12-community:en:insult'), ('tits', 'block', 'v12-community:en:sexual'),
  ('titties', 'block', 'v12-community:en:sexual'), ('cocksucker', 'block', 'v12-community:en:insult'),
  ('dickhead', 'block', 'v12-community:en:insult'), ('dick pic', 'block', 'v12-community:en:sexual'),
  ('suck my dick', 'block', 'v12-community:en:sexual'), ('horny', 'block', 'v12-community:en:sexual'),
  ('incest', 'block', 'v12-community:en:sexual'), ('rape', 'block', 'v12-community:en:violence'),
  ('rapist', 'block', 'v12-community:en:violence'),
  ('pedophile', 'block', 'v12-community:en:violence'),
  -- English: serious insults and slurs
  ('fuck', 'block', 'v12-community:en:insult'), ('fucking', 'block', 'v12-community:en:insult'),
  ('fucker', 'block', 'v12-community:en:insult'), ('motherfucker', 'block', 'v12-community:en:insult'),
  ('fck', 'block', 'v12-community:en:insult'), ('fuk', 'block', 'v12-community:en:insult'),
  ('fvck', 'block', 'v12-community:en:insult'), ('phuck', 'block', 'v12-community:en:insult'),
  ('stfu', 'block', 'v12-community:en:insult'), ('bitch', 'block', 'v12-community:en:insult'),
  ('slut', 'block', 'v12-community:en:insult'), ('whore', 'block', 'v12-community:en:insult'),
  ('skank', 'block', 'v12-community:en:insult'), ('asshole', 'block', 'v12-community:en:insult'),
  ('retard', 'block', 'v12-community:en:slur'), ('retarded', 'block', 'v12-community:en:slur'),
  ('nigger', 'block', 'v12-community:en:slur'), ('nigga', 'block', 'v12-community:en:slur'),
  ('faggot', 'block', 'v12-community:en:slur'), ('fag', 'block', 'v12-community:en:slur'),
  ('dyke', 'block', 'v12-community:en:slur'), ('tranny', 'block', 'v12-community:en:slur'),
  ('gook', 'block', 'v12-community:en:slur'),
  ('jap', 'block', 'v12-community:en:slur'),
  ('kike', 'block', 'v12-community:en:slur'), ('wetback', 'block', 'v12-community:en:slur'),
  ('kill yourself', 'block', 'v12-community:en:violence'), ('kys', 'block', 'v12-community:en:violence'),
  -- French
  ('pute', 'block', 'v12-community:fr:insult'), ('putain', 'block', 'v12-community:fr:insult'),
  ('salope', 'block', 'v12-community:fr:insult'), ('salaud', 'block', 'v12-community:fr:insult'),
  ('connard', 'block', 'v12-community:fr:insult'), ('connasse', 'block', 'v12-community:fr:insult'),
  ('enculé', 'block', 'v12-community:fr:insult'), ('enculer', 'block', 'v12-community:fr:insult'),
  ('enfoiré', 'block', 'v12-community:fr:insult'), ('bâtard', 'block', 'v12-community:fr:insult'),
  ('fils de pute', 'block', 'v12-community:fr:insult'), ('fdp', 'block', 'v12-community:fr:insult'),
  ('nique ta mère', 'block', 'v12-community:fr:insult'), ('ntm', 'block', 'v12-community:fr:insult'),
  ('pédé', 'block', 'v12-community:fr:slur'), ('tapette', 'block', 'v12-community:fr:slur'),
  ('gouine', 'block', 'v12-community:fr:slur'), ('nègre', 'block', 'v12-community:fr:slur'),
  ('bougnoule', 'block', 'v12-community:fr:slur'), ('youpin', 'block', 'v12-community:fr:slur'),
  ('bicot', 'block', 'v12-community:fr:slur'), ('branlette', 'block', 'v12-community:fr:sexual'),
  ('branleur', 'block', 'v12-community:fr:insult'), ('suceuse', 'block', 'v12-community:fr:sexual'),
  ('partouze', 'block', 'v12-community:fr:sexual'), ('levrette', 'block', 'v12-community:fr:sexual'),
  ('éjaculer', 'block', 'v12-community:fr:sexual'), ('violeur', 'block', 'v12-community:fr:violence'),
  ('pédophile', 'block', 'v12-community:fr:violence'), ('suicide toi', 'block', 'v12-community:fr:violence'),
  -- Spanish
  ('puta', 'block', 'v12-community:es:insult'), ('puto', 'block', 'v12-community:es:insult'),
  ('putita', 'block', 'v12-community:es:insult'), ('hijo de puta', 'block', 'v12-community:es:insult'),
  ('hdp', 'block', 'v12-community:es:insult'), ('zorra', 'block', 'v12-community:es:insult'),
  ('pendejo', 'block', 'v12-community:es:insult'), ('pendeja', 'block', 'v12-community:es:insult'),
  ('cabrón', 'block', 'v12-community:es:insult'), ('gilipollas', 'block', 'v12-community:es:insult'),
  ('culero', 'block', 'v12-community:es:insult'), ('chinga tu madre', 'block', 'v12-community:es:insult'),
  ('chingada', 'block', 'v12-community:es:insult'), ('coño', 'block', 'v12-community:es:insult'),
  ('verga', 'block', 'v12-community:es:sexual'), ('polla', 'block', 'v12-community:es:sexual'),
  ('follar', 'block', 'v12-community:es:sexual'), ('pajero', 'block', 'v12-community:es:insult'),
  ('maricón', 'block', 'v12-community:es:slur'), ('marica', 'block', 'v12-community:es:slur'),
  ('joto', 'block', 'v12-community:es:slur'), ('sudaca', 'block', 'v12-community:es:slur'),
  ('subnormal', 'block', 'v12-community:es:slur'), ('violador', 'block', 'v12-community:es:violence'),
  ('pedófilo', 'block', 'v12-community:es:violence'), ('mátate', 'block', 'v12-community:es:violence'),
  -- Indonesian
  ('kontol', 'block', 'v12-community:id:sexual'), ('memek', 'block', 'v12-community:id:sexual'),
  ('ngentot', 'block', 'v12-community:id:sexual'), ('entot', 'block', 'v12-community:id:sexual'),
  ('ngewe', 'block', 'v12-community:id:sexual'), ('jembut', 'block', 'v12-community:id:sexual'),
  ('peler', 'block', 'v12-community:id:sexual'), ('pepek', 'block', 'v12-community:id:sexual'),
  ('bokep', 'block', 'v12-community:id:sexual'), ('colmek', 'block', 'v12-community:id:sexual'),
  ('sange', 'block', 'v12-community:id:sexual'), ('lonte', 'block', 'v12-community:id:insult'),
  ('pelacur', 'block', 'v12-community:id:insult'), ('bangsat', 'block', 'v12-community:id:insult'),
  ('bajingan', 'block', 'v12-community:id:insult'), ('jancok', 'block', 'v12-community:id:insult'),
  ('jancuk', 'block', 'v12-community:id:insult'), ('pemerkosa', 'block', 'v12-community:id:violence'),
  -- Korean
  ('씨발', 'block', 'v12-community:ko:insult'), ('시발', 'block', 'v12-community:ko:insult'),
  ('씨팔', 'block', 'v12-community:ko:insult'), ('시팔', 'block', 'v12-community:ko:insult'),
  ('씨빨', 'block', 'v12-community:ko:insult'), ('ㅅㅂ', 'block', 'v12-community:ko:insult'),
  ('ㅆㅂ', 'block', 'v12-community:ko:insult'), ('병신', 'block', 'v12-community:ko:insult'),
  ('븅신', 'block', 'v12-community:ko:insult'), ('ㅂㅅ', 'block', 'v12-community:ko:insult'),
  ('개새끼', 'block', 'v12-community:ko:insult'), ('개새기', 'block', 'v12-community:ko:insult'),
  ('개색기', 'block', 'v12-community:ko:insult'), ('씹새끼', 'block', 'v12-community:ko:insult'),
  ('좆', 'block', 'v12-community:ko:sexual'), ('좆까', 'block', 'v12-community:ko:insult'),
  ('좆같은', 'block', 'v12-community:ko:insult'), ('미친년', 'block', 'v12-community:ko:insult'),
  ('미친놈', 'block', 'v12-community:ko:insult'), ('썅년', 'block', 'v12-community:ko:insult'),
  ('창녀', 'block', 'v12-community:ko:insult'), ('니애미', 'block', 'v12-community:ko:insult'),
  ('느금마', 'block', 'v12-community:ko:insult'), ('엠창', 'block', 'v12-community:ko:insult'),
  ('섹스', 'block', 'v12-community:ko:sexual'), ('야동', 'block', 'v12-community:ko:sexual'),
  ('포르노', 'block', 'v12-community:ko:sexual'), ('강간', 'block', 'v12-community:ko:violence'),
  ('김치녀', 'block', 'v12-community:ko:slur')
on conflict (term) do nothing;

commit;
