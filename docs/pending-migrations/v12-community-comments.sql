-- V12 community comments (owner request 2026-10-06): every signed-in fan comments on
-- every post, the daily debate included (open or closed, voted or not), and replies
-- nest like on Reddit (any comment, any reply, depth 10 at most; the routes check it).
--
-- ADDITIVE ONLY: no existing row is changed or deleted. Two CHECK constraints widened
-- (their old values stay valid), new nullable columns (existing rows stay NULL), one new
-- CHECK that every existing row already meets, two partial indexes, and the 3rd-report
-- trigger function taught one more target (it changes no row by itself).
-- Rollback: docs/pending-migrations/v12-community-comments-rollback.sql

begin;

-- 1. The daily debate's own comments live in community_replies, independent of the vote:
--    target_type 'daily_debate', target_id = the debate day as YYYYMMDD (20261006).
alter table public.community_replies drop constraint community_replies_target_type_check;
alter table public.community_replies add constraint community_replies_target_type_check
  check (target_type = any (array['debate', 'challenge', 'editorial', 'daily_debate']));

-- 2. A reply to a vote comment of the daily debate (debate_votes.comment): its parent is
--    the vote, not a community_replies row. One parent kind at most.
alter table public.community_replies add column if not exists parent_vote uuid references public.debate_votes (id) on delete cascade;
alter table public.community_replies drop constraint if exists community_replies_one_parent;
alter table public.community_replies add constraint community_replies_one_parent check (parent_id is null or parent_vote is null);
create index if not exists community_replies_parent_vote_idx on public.community_replies (parent_vote) where parent_vote is not null;

-- 3. A vote comment can be hidden by 3 reports (the vote itself always counts).
--    NULL = shown, as every existing vote today.
alter table public.debate_votes add column if not exists comment_hidden_at timestamptz;

-- 4. Reports on a vote comment: verse_flags.target_id is an integer and a vote id is a
--    uuid, so the vote id rides in target_ref (target_id 0). One report per account.
alter table public.verse_flags add column if not exists target_ref text;
alter table public.verse_flags drop constraint verse_flags_target_type_check;
alter table public.verse_flags add constraint verse_flags_target_type_check
  check (target_type = any (array['comment', 'revision', 'suggestion', 'thread', 'essay', 'debate', 'challenge', 'reply', 'debate_vote']));
create unique index if not exists verse_flags_one_vote_report_per_account
  on public.verse_flags (target_ref, reporter)
  where reporter is not null and target_type = 'debate_vote';

alter table public.community_autohidden add column if not exists target_ref text;
alter table public.community_autohidden drop constraint if exists community_autohidden_target_type_check;
alter table public.community_autohidden add constraint community_autohidden_target_type_check
  check (target_type in ('comment', 'thread', 'essay', 'debate', 'challenge', 'reply', 'debate_vote'));

-- 5. The 3rd open report by 3 different accounts hides the content (never deletes it).
--    Same as v12-community-posts.sql, plus the vote comment (by target_ref).
create or replace function public.community_autohide_on_report() returns trigger
language plpgsql set search_path = public as $$
declare
  n integer;
  prev text;
begin
  if new.reporter is null or new.status <> 'open'
     or new.target_type not in ('comment', 'thread', 'essay', 'debate', 'challenge', 'reply', 'debate_vote') then
    return new;
  end if;
  if new.target_type = 'debate_vote' then
    if new.target_ref is null or new.target_ref !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      return new;
    end if;
    select count(distinct reporter) into n from verse_flags
     where target_type = 'debate_vote' and target_ref = new.target_ref and status = 'open' and reporter is not null;
    if n < 3 then
      return new;
    end if;
    update debate_votes set comment_hidden_at = now()
     where id = new.target_ref::uuid and comment_hidden_at is null and comment is not null
     returning 'visible' into prev;
    if prev is not null then
      insert into community_autohidden (target_type, target_id, target_ref, prev_status, reports)
      values ('debate_vote', 0, new.target_ref, prev, n);
    end if;
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

commit;
