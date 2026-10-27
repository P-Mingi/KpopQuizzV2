-- Quiz corrections, lot E4: 7 wrong answers in 7 player quizzes, found by the fact-check circuit of the SEO
-- strategy of 2026-10-27 (docs/seo/strategy-2026-10-27/explanations/e4/QUIZ-ISSUES-E4.md), each with a
-- sourced correction (1 or 2 sentences) and its source, opened and confirmed on 2026-10-27.
-- OWNER-GATED: applied in production by Claude only on the owner's go, after quiz-corrections-schema.sql,
-- quiz-corrections-e1.sql, quiz-corrections-e2.sql and quiz-corrections-e3.sql. Nothing here is applied yet.
-- Rollback: quiz-corrections-e4-rollback.sql.
-- It only inserts 7 requests (status pending). Nothing reaches a creator and no quiz changes until the cron
-- /api/cron/quiz-corrections runs (it is scheduled only after the o1/integration merge): then each request
-- sends one quiz_correction notification to the quiz's creator, and a quiz whose question is unchanged 14 days
-- later moves to draft. Each quiz has one request; two of them (newjeans-true-or-false,
-- newjeans-hype-boy-vs-attention-quiz) have the same creator, who gets one notification per question.
-- Guard: every quiz is still published under the same slug, has a creator, and the question and the marked
-- answer at each index are still exactly the ones that were checked; otherwise nothing is applied (a creator
-- edited a quiz: drop that row or re-check it).
-- Running it twice changes nothing (an open request for the same quiz and question is kept as it is; a
-- request the job already moved on no longer passes the guard).

begin;

create temporary table corr_e4 (
  quiz_id uuid, slug text, q_index int, question text, marked_answer text, correction text, source_url text
) on commit drop;

insert into corr_e4 (quiz_id, slug, q_index, question, marked_answer, correction, source_url) values
  -- nmixx-members-quiz, question 1
  ('7485f0a5-f7c2-4f1e-b1d5-5525e42abd3c'::uuid, 'nmixx-members-quiz', 0,
   'How many members are in NMIXX?',
   '7',
   'NMIXX debuted in February 2022 as a seven-member group, and as of October 2026 Wikipedia lists six members, so 7 is outdated; 6 is the right option today.',
   'https://en.wikipedia.org/wiki/Nmixx'),
  -- k-pop-concert-and-tour-facts, question 2
  ('e310637b-6181-4272-be7d-ce132492113e'::uuid, 'k-pop-concert-and-tour-facts', 1,
   'BLACKPINK''s BORN PINK World Tour visited how many countries approximately?',
   'Over 30 countries',
   'BLACKPINK''s Born Pink World Tour, from October 2022 to September 2023, played 66 concerts in 22 countries, so Over 30 is too high and no option is right. An option such as About 20 countries would fix it.',
   'https://en.wikipedia.org/wiki/Born_Pink_World_Tour'),
  -- nct-127-basics, question 6
  ('97eede3e-e841-456a-9432-919f9d82f8c0'::uuid, 'nct-127-basics', 5,
   'Which NCT 127 member is Canadian?',
   'Mark',
   'As of October 2026 Wikipedia lists Mark, who is Canadian, as a former NCT 127 member, so the question no longer fits him. Asking which member of the July 2016 debut lineup is Canadian keeps Mark right.',
   'https://en.wikipedia.org/wiki/Mark_Lee_(singer)'),
  -- newjeans-true-or-false, question 1
  ('71817bad-b0d6-450a-a552-3775b5b3e799'::uuid, 'newjeans-true-or-false', 0,
   'NewJeans has 5 members',
   'True',
   'NewJeans was originally a five-member group, and as of October 2026 Wikipedia lists four members, so the statement is no longer true; False is the right answer today.',
   'https://en.wikipedia.org/wiki/NewJeans'),
  -- newjeans-hype-boy-vs-attention-quiz, question 4
  ('a9233f61-d3cb-4862-8766-f33c3db2bc70'::uuid, 'newjeans-hype-boy-vs-attention-quiz', 3,
   'What is the name of NewJeans'' first studio album released in 2024?',
   'How Sweet',
   'How Sweet, released May 24, 2024, is a single album, and as of October 2026 Wikipedia lists no studio album by NewJeans, so no option is right. Asking for their first single album of 2024 keeps How Sweet right.',
   'https://en.wikipedia.org/wiki/NewJeans_discography'),
  -- stray-kids-discography-test, question 6
  ('4423343d-f76f-4c7d-8d5e-92e169ef7630'::uuid, 'stray-kids-discography-test', 5,
   'Which Stray Kids album was their first to reach #1 on the Billboard 200?',
   '5-STAR',
   'Oddinary was Stray Kids'' first No. 1 on the Billboard 200: it debuted at the top of the chart dated April 2, 2022, as their first entry. So ODDINARY is the right option, not 5-STAR.',
   'https://www.billboard.com/music/chart-beat/stray-kids-oddinary-tops-billboard-200-albums-chart-1235050415/'),
  -- kep1er-quiz, question 2
  ('0b145c9a-9755-4152-9774-8b163662d5bf'::uuid, 'kep1er-quiz', 1,
   'How many members are in Kep1er?',
   '9',
   'Kep1er was formed in 2021 as a nine-member group, and as of October 2026 Wikipedia lists six members, so 9 is outdated and the right count, 6, is not among the options. Adding 6 would fix it.',
   'https://en.wikipedia.org/wiki/Kep1er');

do $$
declare bad int;
begin
  select count(*) into bad
  from corr_e4 x
  left join public.quizzes z
    on z.id = x.quiz_id and z.status = 'published' and z.slug = x.slug and z.creator_id is not null
  left join lateral (select z.questions -> x.q_index as e) j on true
  where z.id is null or j.e is null
     or j.e ->> 'question' is distinct from x.question
     or (case
           when jsonb_typeof(j.e -> 'correct') = 'boolean'
             then case when (j.e ->> 'correct')::boolean then 'True' else 'False' end
           when jsonb_typeof(j.e -> 'correct') = 'number' and jsonb_typeof(j.e -> 'options') = 'array'
             then coalesce(j.e -> 'options' -> ((j.e ->> 'correct')::int) ->> 'label',
                           j.e -> 'options' ->> ((j.e ->> 'correct')::int))
         end) is distinct from x.marked_answer;
  if bad > 0 then
    raise exception 'quiz corrections lot E4: % row(s) no longer match their quiz, nothing applied', bad;
  end if;
end $$;

insert into public.quiz_correction_requests (quiz_id, q_index, question, marked_answer, correction, source_url, lot)
select quiz_id, q_index, question, marked_answer, correction, source_url, 'E4' from corr_e4
on conflict (quiz_id, q_index) where status in ('pending', 'notified') do nothing;

do $$
begin
  if (select count(*) from public.quiz_correction_requests r join corr_e4 x on x.quiz_id = r.quiz_id and x.q_index = r.q_index
      where r.lot = 'E4' and r.status in ('pending', 'notified')) <> 7 then
    raise exception 'quiz corrections lot E4: 7 open requests expected, nothing applied';
  end if;
end $$;

commit;
