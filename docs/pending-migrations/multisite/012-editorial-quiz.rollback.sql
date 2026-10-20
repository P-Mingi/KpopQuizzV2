-- 012-editorial-quiz.rollback.sql (run O1, lane K1): undo of 012-editorial-quiz.sql.
--
-- What:   drops the partial index, the check editorial_drafts_payload_check and the columns review_batch_id (its foreign key
--         goes with it) and payload of editorial_drafts, puts back today's editorial_drafts_kind_check (thread, debate, blog),
--         copied verbatim from the production schema dump (~/kpq-o1/prod-public.sql, line 6087), and drops review_batches.
-- Why:    the rollback of manifest.md row 16 (reverse order: after 013's, before 011's).
-- Rows:   1 table and 2 columns dropped. Refused, with nothing changed, while a review batch exists, a quiz draft exists or
--         any draft carries a payload or a batch id (the launch review trail would be lost).
-- Verify: select to_regclass('public.review_batches');                                                          expect null
--         select pg_get_constraintdef(oid) from pg_constraint where conname = 'editorial_drafts_kind_check';   expect the three kinds of today
--         a catalog dump (pg_dump --schema-only) of public equals the one taken before 009
-- Undo:   run 012-editorial-quiz.sql again.
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
declare
  n bigint;
  msg text := '';
begin
  if to_regclass('public.review_batches') is not null then
    select count(*) into n from public.review_batches;
    if n > 0 then msg := msg || 'review_batches (' || n || ' rows) '; end if;
  end if;
  if exists (select 1 from pg_attribute where attrelid = 'public.editorial_drafts'::regclass and attname = 'payload' and not attisdropped) then
    select count(*) into n from public.editorial_drafts where kind = 'quiz' or payload is not null or review_batch_id is not null;
    if n > 0 then msg := msg || 'editorial_drafts of kind quiz, with a payload or a batch (' || n || ' rows) '; end if;
  else
    select count(*) into n from public.editorial_drafts where kind = 'quiz';
    if n > 0 then msg := msg || 'editorial_drafts of kind quiz (' || n || ' rows) '; end if;
  end if;
  if msg <> '' then
    raise exception '012-editorial-quiz rollback refused: editorial data would be lost: %; remove it deliberately first', msg;
  end if;
end $$;

drop index if exists public.editorial_drafts_review_batch_idx;
alter table public.editorial_drafts drop constraint if exists editorial_drafts_payload_check;
alter table public.editorial_drafts drop column if exists review_batch_id;
alter table public.editorial_drafts drop column if exists payload;
drop table if exists public.review_batches;

-- today's check (verbatim from the production dump)
alter table only public.editorial_drafts drop constraint if exists editorial_drafts_kind_check;
ALTER TABLE ONLY public.editorial_drafts ADD CONSTRAINT editorial_drafts_kind_check CHECK ((kind = ANY (ARRAY['thread'::text, 'debate'::text, 'blog'::text])));
