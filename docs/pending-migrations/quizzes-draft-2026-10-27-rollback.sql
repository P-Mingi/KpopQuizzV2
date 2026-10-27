-- Rollback of quizzes-draft-2026-10-27.sql: the six quizzes go back to published.
-- Warning: republishing fires the trigger group_quiz_alerts_on_publish, so followers of each
-- quiz's group may get a "new quiz" alert again. Remove this-is-only-for-true-gllits from
-- MERGED_QUIZZES (lib/seo/legacy-urls.ts) first, or its page keeps answering 301.
-- Guard: every row must still be a draft with this exact id and slug, else nothing changes.

begin;

create temporary table draft_20261027 (id uuid, slug text) on commit drop;
insert into draft_20261027 (id, slug) values
  ('ffa3b526-62a7-4e89-a9a0-a4d62b356327', 'finnish-the-lyric'),
  ('904a55e6-2f2a-4220-b7e6-11762bb919b2', 'k-pop-dating-and-relationships-verified-facts-only'),
  ('b56eff85-ae33-44ee-859b-fa9df23d4dc3', 'k-pop-sasaeng-and-fan-culture-dark-side'),
  ('aa598960-dc12-47e4-af86-4592fd91cee4', 'can-you-recognize-these-idols-as-kids'),
  ('fb155f45-3a4a-480e-a79c-2dddb041db74', 'kpop-geral'),
  ('62e332ec-a506-425a-97ab-07f26e4729f3', 'this-is-only-for-true-gllits');

do $$
begin
  if (select count(*) from public.quizzes q join draft_20261027 d on d.id = q.id and d.slug = q.slug where q.status = 'draft') <> 6 then
    raise exception 'quizzes-draft-2026-10-27 rollback: not all six quizzes are drafts with the expected id and slug, nothing changed';
  end if;
end $$;

update public.quizzes q set status = 'published'
from draft_20261027 d
where q.id = d.id and q.slug = d.slug and q.status = 'draft';

commit;
