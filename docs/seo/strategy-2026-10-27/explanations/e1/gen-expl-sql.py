#!/usr/bin/env python3
"""Writes the SQL of an explanation lot and its rollback.
Usage: gen-expl-sql.py <lot> <final.json> <out dir> [<reviewer> <review date>]
final.json: [{quiz_id, slug, q_index, question, answer, explanation, source_url}], only the rows
to publish. The SQL inserts into public.quiz_explanations (seo-quiz-explanations.sql must be
applied first). Guard: every quiz is still published and the question and right answer at
q_index are still exactly the ones checked; otherwise nothing is applied."""
import json, re, sys
lot, src, out = sys.argv[1:4]
reviewer, reviewed = (sys.argv[4:6] + [None, None])[:2]
review_line = (f'reviewed by {reviewer} on {reviewed}' if reviewer else "owner's review: not recorded yet (the owner's go is the review)")
rows = json.load(open(src, encoding='utf8'))
DASH = re.compile('[–—]')
seen = set()
for r in rows:
    k = (r['quiz_id'], r['q_index'])
    assert k not in seen, k; seen.add(k)
    assert 40 <= len(r['explanation']) <= 300, r
    assert r['source_url'].startswith('https://'), r
    assert not DASH.search(r['explanation']) and '--' not in r['explanation'], r
def q(s): return "'" + s.replace("'", "''") + "'"
# One field per line: the docs secret gate reads line by line, and a song title such as
# Secret Quest must not share a line with a long id or URL.
values = ',\n'.join(
    f"  ({q(r['quiz_id'])}::uuid, {int(r['q_index'])},\n   {q(r['question'])},\n   {q(r['answer'])},\n   {q(r['explanation'])},\n   {q(r['source_url'])})"
    for r in rows)
n = len(rows); quizzes = len({r['quiz_id'] for r in rows})
ANSWER = """case when jsonb_typeof(j.e->'correct') = 'boolean'
           then case when (j.e->>'correct')::boolean then 'True' else 'False' end
           else j.e->'options'->>((j.e->>'correct')::int) end"""
sql = f"""-- SEO explanations, lot {lot}: {n} verified explanations for {quizzes} quizzes (strategy of 2026-10-27, phase 0 point 3).
-- OWNER-GATED: applied in production by Claude only on the owner's go, after seo-quiz-explanations.sql.
-- Checked by the writers, an independent checker and a dedicated recheck (docs/seo/strategy-2026-10-27/explanations/{lot.lower()}/),
-- {review_line}. Rollback: seo-explanations-{lot.lower()}-rollback.sql.
-- Guard: every quiz is still published and the question and the right answer at each index are still exactly the
-- ones that were checked; otherwise nothing is applied (a creator edited a quiz: regenerate the lot).
-- Running it twice fails on the primary key and changes nothing.

begin;

create temporary table expl_{lot.lower()} (quiz_id uuid, q_index int, question text, answer text, explanation text, source_url text) on commit drop;
insert into expl_{lot.lower()} (quiz_id, q_index, question, answer, explanation, source_url) values
{values};

do $$
declare bad int;
begin
  select count(*) into bad
  from expl_{lot.lower()} x
  left join public.quizzes z on z.id = x.quiz_id and z.status = 'published'
  left join lateral (select z.questions -> x.q_index as e) j on true
  where z.id is null or j.e is null
     or j.e ->> 'question' is distinct from x.question
     or ({ANSWER}) is distinct from x.answer;
  if bad > 0 then
    raise exception 'explanations lot {lot}: % row(s) no longer match their quiz, nothing applied', bad;
  end if;
end $$;

insert into public.quiz_explanations (quiz_id, q_index, question, answer, explanation, source_url, lot)
select quiz_id, q_index, question, answer, explanation, source_url, '{lot}' from expl_{lot.lower()};

do $$
begin
  if (select count(*) from public.quiz_explanations where lot = '{lot}') <> {n} then
    raise exception 'explanations lot {lot}: row count is not {n}, nothing applied';
  end if;
end $$;

commit;
"""
rb = f"""-- Rollback of seo-explanations-{lot.lower()}.sql: removes the {n} explanations of lot {lot}. Quizzes are untouched.

begin;

delete from public.quiz_explanations where lot = '{lot}';

commit;
"""
open(f'{out}/seo-explanations-{lot.lower()}.sql', 'w', encoding='utf8').write(sql)
open(f'{out}/seo-explanations-{lot.lower()}-rollback.sql', 'w', encoding='utf8').write(rb)
print('written', n, 'rows,', quizzes, 'quizzes')
