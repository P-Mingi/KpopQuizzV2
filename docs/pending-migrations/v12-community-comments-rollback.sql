-- Rollback of docs/pending-migrations/v12-community-comments.sql.
-- Shows again the vote comments the 3rd report hid, removes the vote-comment reports and
-- their log rows, the daily debate comments and their replies (community_replies rows of
-- target_type 'daily_debate', which also covers the replies to vote comments), the new
-- columns and checks, and puts back the trigger function of v12-community-posts.sql.
-- Nested replies on other posts stay (the one-level limit lived in the routes, not here).

begin;

-- the trigger function as v12-community-posts.sql left it
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

-- vote comment reports and their log
delete from public.community_autohidden where target_type = 'debate_vote';
alter table public.community_autohidden drop constraint if exists community_autohidden_target_type_check;
alter table public.community_autohidden add constraint community_autohidden_target_type_check
  check (target_type in ('comment', 'thread', 'essay', 'debate', 'challenge', 'reply'));
alter table public.community_autohidden drop column if exists target_ref;

drop index if exists public.verse_flags_one_vote_report_per_account;
delete from public.verse_flags where target_type = 'debate_vote';
alter table public.verse_flags drop constraint verse_flags_target_type_check;
alter table public.verse_flags add constraint verse_flags_target_type_check
  check (target_type = any (array['comment', 'revision', 'suggestion', 'thread', 'essay', 'debate', 'challenge', 'reply']));
alter table public.verse_flags drop column if exists target_ref;

-- vote comments shown again
alter table public.debate_votes drop column if exists comment_hidden_at;

-- the daily debate comments and every reply under them (and their reports)
delete from public.verse_flags f using public.community_replies r
 where f.target_type = 'reply' and f.target_id = r.id and r.target_type = 'daily_debate';
delete from public.community_autohidden a using public.community_replies r
 where a.target_type = 'reply' and a.target_id = r.id and r.target_type = 'daily_debate';
delete from public.community_replies where target_type = 'daily_debate';
drop index if exists public.community_replies_parent_vote_idx;
alter table public.community_replies drop constraint if exists community_replies_one_parent;
alter table public.community_replies drop column if exists parent_vote;
alter table public.community_replies drop constraint community_replies_target_type_check;
alter table public.community_replies add constraint community_replies_target_type_check
  check (target_type = any (array['debate', 'challenge', 'editorial']));

commit;
