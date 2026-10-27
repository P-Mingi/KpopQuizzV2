-- Quiz corrections, lot E1: 5 wrong answers in 5 player quizzes, found by the fact-check circuit of the SEO
-- strategy of 2026-10-27 (docs/seo/strategy-2026-10-27/explanations/e1/QUIZ-ISSUES-E1.md), each with a
-- sourced correction (1 or 2 sentences) and its source, opened and confirmed on 2026-10-27.
-- OWNER-GATED: applied in production by Claude only on the owner's go, after quiz-corrections-schema.sql.
-- Rollback: quiz-corrections-e1-rollback.sql.
-- It only inserts 5 requests (status pending). Nothing reaches a creator and no quiz changes until the cron
-- /api/cron/quiz-corrections runs (it is scheduled only after the o1/integration merge): then each creator
-- gets one quiz_correction notification, and a quiz whose question is unchanged 14 days later moves to draft.
-- Guard: every quiz is still published under the same slug, has a creator, and the question and the marked
-- answer at each index are still exactly the ones that were checked; otherwise nothing is applied (a creator
-- edited a quiz: drop that row or re-check it).
-- Running it twice changes nothing (an open request for the same quiz and question is kept as it is; a
-- request the job already moved on no longer passes the guard).

begin;

create temporary table corr_e1 (
  quiz_id uuid, slug text, q_index int, question text, marked_answer text, correction text, source_url text
) on commit drop;

insert into corr_e1 (quiz_id, slug, q_index, question, marked_answer, correction, source_url) values
  -- idol-bands-quiz, question 17
  ('ea9d595c-1cd8-4780-b0ad-72529fe6a98a'::uuid, 'idol-bands-quiz', 16,
   'The girl band LATENCY has 3 members that were formerly members of which girl group?',
   'Cignature',
   'LATENCY debuted in January 2026 with three former Cignature members, but all three left the band in August 2026, so today it has none. Saying the band debuted with them keeps the question true.',
   'https://en.wikipedia.org/wiki/Latency_(band)'),
  -- newjeans-quiz, question 2
  ('20a1d6ea-6526-4fc9-bf1b-2440100e4d0c'::uuid, 'newjeans-quiz', 1,
   'How many members are in newjeans?',
   '5',
   'NewJeans was originally a five-member group, and Wikipedia lists four current members since December 2025, so 5 is no longer the current number of members.',
   'https://en.wikipedia.org/wiki/NewJeans'),
  -- k-pop-b-sides-that-became-fan-favorites, question 2
  ('7b228734-ba1d-45de-92af-b56aa1273d59'::uuid, 'k-pop-b-sides-that-became-fan-favorites', 1,
   'Which BTS B-side became so popular it charted for years?',
   'Spring Day',
   'Spring Day is not a B-side: it was the lead single of You Never Walk Alone, released in February 2017. Its long run on Melon''s chart is real, so the question works without the word B-side.',
   'https://en.wikipedia.org/wiki/Spring_Day_(song)'),
  -- bts-love-yourself-era-quiz, question 6
  ('b8ddf97a-3d04-48b6-8825-b98d10a9215f'::uuid, 'bts-love-yourself-era-quiz', 5,
   'Which song from Love Yourself: Tear features a collaboration with Steve Aoki?',
   'The Truth Untold (no - it features no collab)',
   'The Truth Untold is the right answer, but its option text is wrong: Love Yourself: Tear lists track 3 as The Truth Untold featuring Steve Aoki. Removing "(no - it features no collab)" fixes it.',
   'https://en.wikipedia.org/wiki/Love_Yourself:_Tear'),
  -- k-pop-albums-that-sold-millions, question 1
  ('6ce91381-6656-4b18-b536-1e40a52fcccc'::uuid, 'k-pop-albums-that-sold-millions', 0,
   'Which album holds the record for fastest-selling K-pop album in first week (as of 2023)?',
   'FML by SEVENTEEN (4.6M+)',
   'FML sold about 4.55 million copies in its first week, not 4.6M+. Stray Kids'' 5-Star sold more (about 4.62 million), and in October 2023 Seventeenth Heaven set the record with 5.09 million.',
   'https://www.koreatimes.co.kr/pages/article.asp?newsIdx=362125');

do $$
declare bad int;
begin
  select count(*) into bad
  from corr_e1 x
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
    raise exception 'quiz corrections lot E1: % row(s) no longer match their quiz, nothing applied', bad;
  end if;
end $$;

insert into public.quiz_correction_requests (quiz_id, q_index, question, marked_answer, correction, source_url, lot)
select quiz_id, q_index, question, marked_answer, correction, source_url, 'E1' from corr_e1
on conflict (quiz_id, q_index) where status in ('pending', 'notified') do nothing;

do $$
begin
  if (select count(*) from public.quiz_correction_requests r join corr_e1 x on x.quiz_id = r.quiz_id and x.q_index = r.q_index
      where r.lot = 'E1' and r.status in ('pending', 'notified')) <> 5 then
    raise exception 'quiz corrections lot E1: 5 open requests expected, nothing applied';
  end if;
end $$;

commit;
