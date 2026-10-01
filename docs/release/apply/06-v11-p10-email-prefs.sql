-- R1 apply bundle 06 of 8: v11-p10-email-prefs.sql, verbatim, followed by a read-only verification.
-- Paste the whole text in the Supabase SQL editor (project rdkgouofytwfdpbxbzio) and Run.
-- The result grid is the verification: columns check / value / expected.
-- ============================================================================

-- v11 P10 - Settings > Notifications: the two email switches of the prototype
-- ("Streak reminder by email", "Weekly recap by email"). OWNER-RUN, not applied.
--
-- Note for the owner (one paragraph): notification_prefs (migration 122) stores
-- in-app categories only; there is no email channel and KpopQuiz sends no email
-- today (no sender, no job). The v11 settings page therefore shows these two rows
-- DISABLED and off, with the line "Not available yet: KpopQuiz does not send
-- emails yet", so the page never promises an email that nobody sends. Switching
-- them on needs three things, in this order: (1) this migration (opt-in columns,
-- default false, so nobody is subscribed by the change), (2) the existing
-- /api/notifications/prefs route accepting the two keys (a small change outside
-- P10's paths: GET returns them, POST validates booleans), (3) a sender (the
-- 8 pm streak-at-risk mail and the Monday recap, e.g. a Vercel cron + an email
-- provider), which is an owner decision (provider, sender domain, unsubscribe
-- link). Only then should the UI enable the switches. WIRING-MAP section 9 row
-- "Preferences: sound, email on replies" asked for email_weekly_recap; the
-- prototype adds the streak reminder next to it.

alter table public.notification_prefs
  add column if not exists email_streak_reminder boolean not null default false,
  add column if not exists email_weekly_recap boolean not null default false;

comment on column public.notification_prefs.email_streak_reminder is
  'v11 settings: opt-in, one email at 8 pm when the daily streak is at risk (no sender yet).';
comment on column public.notification_prefs.email_weekly_recap is
  'v11 settings: opt-in, weekly recap email every Monday (no sender yet).';

-- RLS: unchanged. The mig-122 policies already scope every read and write of
-- notification_prefs to the owner (user_id = auth.uid()); new columns inherit them.
-- Check after running (read only):
--   select column_name, data_type, column_default from information_schema.columns
--   where table_schema = 'public' and table_name = 'notification_prefs' and column_name like 'email_%';

-- Rollback (added by R1, 2026-10; run only to undo this file: the two columns hold
-- nothing until a sender exists and the switches are enabled):
--   alter table public.notification_prefs
--     drop column if exists email_streak_reminder,
--     drop column if exists email_weekly_recap;

-- ============================================================================
-- R1 verification (read only). Its rows are what the editor shows after Run.
-- ============================================================================
select 1 as n, 'notification_prefs columns' as "check", ((select coalesce(string_agg(column_name || ' ' || data_type || ' default ' || coalesce(column_default, 'none') || ' nullable ' || is_nullable, '; ' order by column_name), 'MISSING') from information_schema.columns where table_schema = 'public' and table_name = 'notification_prefs' and column_name in ('email_streak_reminder', 'email_weekly_recap')))::text as value, 'email_streak_reminder boolean default false nullable NO; email_weekly_recap boolean default false nullable NO' as expected
union all
select 2, 'rows (unchanged)', (select count(*) from public.notification_prefs)::text, '3'
union all
select 3, 'rows with an email switch on', (select count(*) from public.notification_prefs where email_streak_reminder or email_weekly_recap)::text, '0'
order by 1;
