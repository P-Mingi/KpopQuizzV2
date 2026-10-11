-- Rollback of docs/pending-migrations/v12-community-posts.sql.
-- Gives back what the 3rd-report trigger hid, then removes the trigger, the log table,
-- the reports of the new types, the widened checks, the new columns and the banned
-- terms the migration inserted. Threads, blogs and replies posted from /community stay
-- (they become ordinary Verse rows, shown only where the Verse gates allow). A blog
-- still 'hidden' after the restore below (none expected) is set back to 'draft' so the
-- old status check can come back.

begin;

drop trigger if exists verse_flags_autohide on public.verse_flags;
drop function if exists public.community_autohide_on_report();

update public.verse_threads t set status = a.prev_status from public.community_autohidden a
 where a.target_type = 'thread' and a.target_id = t.id and a.restored_at is null and t.status = 'hidden';
update public.verse_essays e set status = a.prev_status from public.community_autohidden a
 where a.target_type = 'essay' and a.target_id = e.id and a.restored_at is null and e.status = 'hidden';
update public.verse_discussions d set status = a.prev_status from public.community_autohidden a
 where a.target_type = 'comment' and a.target_id = d.id and a.restored_at is null and d.status = 'hidden';
update public.community_debates x set status = a.prev_status from public.community_autohidden a
 where a.target_type = 'debate' and a.target_id = x.id and a.restored_at is null and x.status = 'hidden';
update public.community_challenges x set status = a.prev_status from public.community_autohidden a
 where a.target_type = 'challenge' and a.target_id = x.id and a.restored_at is null and x.status = 'hidden';
update public.community_replies x set status = a.prev_status from public.community_autohidden a
 where a.target_type = 'reply' and a.target_id = x.id and a.restored_at is null and x.status = 'hidden';
drop table if exists public.community_autohidden;

drop index if exists public.verse_flags_one_report_per_account;
delete from public.verse_flags where target_type in ('thread', 'essay', 'debate', 'challenge', 'reply');
alter table public.verse_flags drop constraint verse_flags_target_type_check;
alter table public.verse_flags add constraint verse_flags_target_type_check
  check (target_type = any (array['comment', 'revision', 'suggestion']));

update public.verse_essays set status = 'draft' where status = 'hidden';
alter table public.verse_essays drop constraint verse_essays_status_check;
alter table public.verse_essays add constraint verse_essays_status_check
  check (status = any (array['draft', 'submitted', 'featured', 'rejected']));

drop index if exists public.verse_threads_community_idx;
drop index if exists public.verse_essays_community_idx;
alter table public.verse_threads drop constraint if exists verse_threads_origin_check;
alter table public.verse_essays drop constraint if exists verse_essays_origin_check;
alter table public.verse_threads drop column if exists cover;
alter table public.verse_threads drop column if exists origin;
alter table public.verse_essays drop column if exists origin;

delete from public.verse_banned_terms where note like 'v12-community:%';

commit;
