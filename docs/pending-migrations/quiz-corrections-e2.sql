-- Quiz corrections, lot E2: 12 wrong answers in 9 player quizzes, found by the fact-check circuit of the SEO
-- strategy of 2026-10-27 (docs/seo/strategy-2026-10-27/explanations/e2/QUIZ-ISSUES-E2.md), each with a
-- sourced correction (1 or 2 sentences) and its source, opened and confirmed on 2026-10-27.
-- OWNER-GATED: applied in production by Claude only on the owner's go, after quiz-corrections-schema.sql and
-- quiz-corrections-e1.sql. Nothing here is applied yet.
-- Rollback: quiz-corrections-e2-rollback.sql.
-- It only inserts 12 requests (status pending). Nothing reaches a creator and no quiz changes until the cron
-- /api/cron/quiz-corrections runs (it is scheduled only after the o1/integration merge): then each request
-- sends one quiz_correction notification to the quiz's creator, and a quiz whose question is unchanged 14 days
-- later moves to draft. Three quizzes have two requests each (seventeen-fml-era-quiz,
-- k-pop-weverse-and-social-media-quiz, nct-dream-quiz): one notification per question.
-- Guard: every quiz is still published under the same slug, has a creator, and the question and the marked
-- answer at each index are still exactly the ones that were checked; otherwise nothing is applied (a creator
-- edited a quiz: drop that row or re-check it).
-- Running it twice changes nothing (an open request for the same quiz and question is kept as it is; a
-- request the job already moved on no longer passes the guard).

begin;

create temporary table corr_e2 (
  quiz_id uuid, slug text, q_index int, question text, marked_answer text, correction text, source_url text
) on commit drop;

insert into corr_e2 (quiz_id, slug, q_index, question, marked_answer, correction, source_url) values
  -- newjeans-members-quiz, question 1
  ('a82fe713-d0c8-4ba9-90ad-2250b9225546'::uuid, 'newjeans-members-quiz', 0,
   'How many members are in NewJeans?',
   '5',
   'NewJeans was originally a five-member group, and since December 2025 Wikipedia lists four members, so 5 is no longer the current number of members; 4 is the right option today.',
   'https://en.wikipedia.org/wiki/NewJeans'),
  -- k-pop-companies-quiz, question 3
  ('2cf7792c-811f-4ea4-bab0-0d6d900c591f'::uuid, 'k-pop-companies-quiz', 2,
   'Which company manages both SEVENTEEN and fromis_9?',
   'Pledis Entertainment',
   'Pledis Entertainment managed fromis_9 only from 2021 to 2024; since January 2025 the group has been with the label Asnd, so no option manages both today. Asking which company managed both until 2024 keeps Pledis right.',
   'https://en.wikipedia.org/wiki/Fromis_9'),
  -- nct-system-explained-quiz, question 2
  ('a69541e8-94f0-41b7-b154-819f86b82a02'::uuid, 'nct-system-explained-quiz', 1,
   'How many fixed sub-units does NCT have?',
   '4 (NCT 127, NCT Dream, WayV, NCT DoJaeJung)',
   'As of October 2026 Wikipedia lists seven NCT sub-units: the rotational NCT U and six fixed ones, NCT 127, NCT Dream, WayV, NCT DoJaeJung, NCT Wish (2024) and NCT JNJM (2026). So the answer is 6, which no option offers.',
   'https://en.wikipedia.org/wiki/NCT_(group)'),
  -- seventeen-fml-era-quiz, question 1
  ('29c146c4-eb89-4d74-b03e-98c3b049b470'::uuid, 'seventeen-fml-era-quiz', 0,
   'What does FML stand for in SEVENTEEN''s album title?',
   'SEVENTEEN 10th Mini Album ''FML''',
   'The marked option only repeats the album title. SEVENTEEN told Billboard in May 2023 that FML has two readings, F*ck My Life (the usual one) and Fight for My Life (the one they want), and none of the four options gives either.',
   'https://www.billboard.com/lists/seventeen-fml-interview-track-by-track-exclusive/'),
  -- seventeen-fml-era-quiz, question 3
  ('29c146c4-eb89-4d74-b03e-98c3b049b470'::uuid, 'seventeen-fml-era-quiz', 2,
   'FML broke what record in its first week of sales?',
   'Over 4.6 million copies sold in first week',
   'FML sold 4,550,214 copies in its first week, a first-week sales record at the time; 4.64 million was its pre-order count. So "over 4.6 million" is too high, and no option gives the right figure.',
   'https://en.wikipedia.org/wiki/FML_(EP)'),
  -- enhypen-members-deep-dive, question 1
  ('c666c898-7242-4ee5-b233-72dab738db96'::uuid, 'enhypen-members-deep-dive', 0,
   'Who is the oldest member of ENHYPEN?',
   'Heeseung',
   'As of October 2026 ENHYPEN''s official profile lists six members, Jungwon, Jay, Jake, Sunghoon, Sunoo and Ni-ki, without Heeseung. The oldest of them is Jay, born April 20, 2002, so Jay is the right option today.',
   'https://beliftlab.com/artist/profile/ENHYPEN'),
  -- k-pop-weverse-and-social-media-quiz, question 1
  ('61ec7b01-b469-48af-bbf9-3e9b53c57847'::uuid, 'k-pop-weverse-and-social-media-quiz', 0,
   'BTS has the most followers of any music group on Instagram',
   'False',
   'The statement is true. As of October 2026, Wikipedia''s list of BTS''s awards and records shows them holding the Guinness World Record for most Instagram followers for a music group, set in 2021 and renewed in 2023.',
   'https://en.wikipedia.org/wiki/List_of_awards_and_nominations_received_by_BTS'),
  -- k-pop-weverse-and-social-media-quiz, question 5
  ('61ec7b01-b469-48af-bbf9-3e9b53c57847'::uuid, 'k-pop-weverse-and-social-media-quiz', 4,
   'V from BTS broke the record for fastest Instagram account to reach 1 million followers',
   'False',
   'The statement is true. V reached 1 million Instagram followers in 43 minutes in 2021, a Guinness World Record, and as of October 2026 Wikipedia''s list of his world records still shows him holding it, so the answer is True.',
   'https://en.wikipedia.org/wiki/List_of_awards_and_nominations_received_by_V'),
  -- blackpink-members-quiz, question 3
  ('f772542f-0fb2-4a7c-9c16-299a91baaa63'::uuid, 'blackpink-members-quiz', 2,
   'Who is the leader of BLACKPINK?',
   'Jisoo',
   'BLACKPINK has no official leader, unlike most K-pop groups, so Jisoo is not its leader and none of the four options is right.',
   'https://www.koreaherald.com/article/3117149'),
  -- nct-dream-quiz, question 3
  ('bf6d0e36-1445-4177-b8f1-fcc26aa2a4cf'::uuid, 'nct-dream-quiz', 2,
   'How many members are in NCT Dream''s current fixed lineup?',
   '7',
   'Since April 8, 2026, NCT Dream has six members: Renjun, Jeno, Haechan, Jaemin, Chenle and Jisung. Mark is no longer in the lineup, so 7 is outdated and 6 is the right option today.',
   'https://en.wikipedia.org/wiki/NCT_Dream'),
  -- nct-dream-quiz, question 4
  ('bf6d0e36-1445-4177-b8f1-fcc26aa2a4cf'::uuid, 'nct-dream-quiz', 3,
   'Which member is in both NCT 127 and NCT Dream?',
   'Mark and Haechan',
   'Mark has not been a member of NCT 127 or NCT Dream since April 8, 2026, so Haechan is now the only member of both units; Only Haechan is the right option today.',
   'https://en.wikipedia.org/wiki/NCT_(group)'),
  -- day6-quiz, question 4
  ('8ada27c7-65a0-4802-92e6-28e9627a92fc'::uuid, 'day6-quiz', 3,
   'How many members are in DAY6?',
   '5',
   'Since the end of 2021, DAY6 has had four members, Sungjin, Young K, Wonpil and Dowoon, so 5 is no longer the current number; 4 is the right option today.',
   'https://en.wikipedia.org/wiki/Day6');

do $$
declare bad int;
begin
  select count(*) into bad
  from corr_e2 x
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
    raise exception 'quiz corrections lot E2: % row(s) no longer match their quiz, nothing applied', bad;
  end if;
end $$;

insert into public.quiz_correction_requests (quiz_id, q_index, question, marked_answer, correction, source_url, lot)
select quiz_id, q_index, question, marked_answer, correction, source_url, 'E2' from corr_e2
on conflict (quiz_id, q_index) where status in ('pending', 'notified') do nothing;

do $$
begin
  if (select count(*) from public.quiz_correction_requests r join corr_e2 x on x.quiz_id = r.quiz_id and x.q_index = r.q_index
      where r.lot = 'E2' and r.status in ('pending', 'notified')) <> 12 then
    raise exception 'quiz corrections lot E2: 12 open requests expected, nothing applied';
  end if;
end $$;

commit;
