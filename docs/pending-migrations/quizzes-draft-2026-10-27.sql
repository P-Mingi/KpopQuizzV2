-- Six quizzes move to draft (owner decisions of 2026-10-27, SEO strategy phase 0).
-- OWNER-GATED: pasted by the owner in the Supabase SQL editor, then checked by Claude.
-- Rollback: quizzes-draft-2026-10-27-rollback.sql.
--
-- | Slug | Why (docs/seo/strategy-2026-10-27/) |
-- |---|---|
-- | finnish-the-lyric | a lyrics quiz: no lyrics on the site |
-- | k-pop-dating-and-relationships-verified-facts-only | the dating lives of real people |
-- | k-pop-sasaeng-and-fan-culture-dark-side | sasaeng: nothing sasaeng-adjacent |
-- | can-you-recognize-these-idols-as-kids | childhood photos of real people, licence unknown |
-- | kpop-geral | in Portuguese on an English page, one question on an idol leaving the industry |
-- | this-is-only-for-true-gllits | a duplicate upload of this-is-only-for-true-gllits-2 (same creator, same day, the same 10 questions); its URL goes 301 to that quiz (lib/seo/legacy-urls.ts, MERGED_QUIZZES) |
--
-- What changes: status 'published' -> 'draft' for these six rows only. Nothing else: not the
-- questions, the counters, the likes, the plays or updated_at (no trigger on quizzes changes
-- updated_at; the only triggers on a status update fire when a quiz BECOMES published). A draft
-- quiz leaves the site's lists, hubs and sitemap at the next render; its creator still sees it.
-- The two opinion polls held off the theme pages (best-kpop-group,
-- do-you-like-the-same-kpop-groups-as-me) stay published, as decided.
-- Guard: every row must still be published with this exact id and slug, else nothing changes.

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
  if (select count(*) from public.quizzes q join draft_20261027 d on d.id = q.id and d.slug = q.slug where q.status = 'published') <> 6 then
    raise exception 'quizzes-draft-2026-10-27: not all six quizzes are published with the expected id and slug, nothing changed';
  end if;
  if (select status from public.quizzes where slug = 'this-is-only-for-true-gllits-2') is distinct from 'published' then
    raise exception 'quizzes-draft-2026-10-27: the kept ILLIT quiz is not published, nothing changed';
  end if;
end $$;

update public.quizzes q set status = 'draft'
from draft_20261027 d
where q.id = d.id and q.slug = d.slug and q.status = 'published';

do $$
begin
  if (select count(*) from public.quizzes q join draft_20261027 d on d.id = q.id where q.status = 'draft') <> 6 then
    raise exception 'quizzes-draft-2026-10-27: the six quizzes are not all in draft, nothing changed';
  end if;
end $$;

commit;
