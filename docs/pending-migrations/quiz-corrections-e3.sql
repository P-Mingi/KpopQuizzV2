-- Quiz corrections, lot E3: 8 wrong answers in 6 player quizzes, found by the fact-check circuit of the SEO
-- strategy of 2026-10-27 (docs/seo/strategy-2026-10-27/explanations/e3/QUIZ-ISSUES-E3.md), each with a
-- sourced correction (1 or 2 sentences) and its source, opened and confirmed on 2026-10-27.
-- OWNER-GATED: applied in production by Claude only on the owner's go, after quiz-corrections-schema.sql,
-- quiz-corrections-e1.sql and quiz-corrections-e2.sql. Nothing here is applied yet.
-- Rollback: quiz-corrections-e3-rollback.sql.
-- It only inserts 8 requests (status pending). Nothing reaches a creator and no quiz changes until the cron
-- /api/cron/quiz-corrections runs (it is scheduled only after the o1/integration merge): then each request
-- sends one quiz_correction notification to the quiz's creator, and a quiz whose question is unchanged 14 days
-- later moves to draft. Two quizzes have two requests each (k-pop-english-songs-quiz,
-- k-pop-numbers-quiz-how-many-members): one notification per question.
-- Guard: every quiz is still published under the same slug, has a creator, and the question and the marked
-- answer at each index are still exactly the ones that were checked; otherwise nothing is applied (a creator
-- edited a quiz: drop that row or re-check it).
-- Running it twice changes nothing (an open request for the same quiz and question is kept as it is; a
-- request the job already moved on no longer passes the guard).

begin;

create temporary table corr_e3 (
  quiz_id uuid, slug text, q_index int, question text, marked_answer text, correction text, source_url text
) on commit drop;

insert into corr_e3 (quiz_id, slug, q_index, question, marked_answer, correction, source_url) values
  -- ateez-discography-challenge, question 4
  ('9ce091ba-d3c0-4c2f-acc6-0df3e0850640'::uuid, 'ateez-discography-challenge', 3,
   'ATEEZ performed on which competitive K-pop TV show in 2022?',
   'Kingdom: Legendary War',
   'Kingdom: Legendary War, the Mnet competition with ATEEZ among its six groups, aired from April 1 to June 3, 2021, not in 2022. Changing the year in the question to 2021 makes Kingdom: Legendary War right.',
   'https://en.wikipedia.org/wiki/Kingdom:_Legendary_War'),
  -- guess-the-loossemble-song, question 6
  ('fb86be58-eb2a-45b9-89d7-a7cb7e653da0'::uuid, 'guess-the-loossemble-song', 5,
   'Which Loossemble song is this?',
   'FANATICISM',
   'The clues (a B-side, two words, the word secret in the title) describe Secret Diary, a B-side on Loossemble''s 2024 EP TTYL. FANATICISM, also on TTYL, is one word, so Secret Diary is the right option.',
   'https://en.wikipedia.org/wiki/Loossemble'),
  -- k-pop-english-songs-quiz, question 3
  ('1702ad79-9be4-436f-abea-364dfc1cc2ca'::uuid, 'k-pop-english-songs-quiz', 2,
   'Which BLACKPINK song is entirely in English?',
   'Ice Cream (ft. Selena Gomez)',
   'Ice Cream is not entirely in English: its lyrics are sung mostly in English, except for a Korean rap verse from Lisa. Asking which song is mostly in English keeps Ice Cream right.',
   'https://en.wikipedia.org/wiki/Ice_Cream_(Blackpink_and_Selena_Gomez_song)'),
  -- k-pop-english-songs-quiz, question 5
  ('1702ad79-9be4-436f-abea-364dfc1cc2ca'::uuid, 'k-pop-english-songs-quiz', 4,
   'Which Stray Kids song was released as an English-language version?',
   'MANIAC',
   'Wikipedia lists only two versions of MANIAC, the Korean original (March 2022) and a Japanese version (May 2022), and no English-language one, so MANIAC is not the right answer.',
   'https://en.wikipedia.org/wiki/Maniac_(Stray_Kids_song)'),
  -- k-pop-numbers-quiz-how-many-members, question 3
  ('5b495306-1017-42ea-8ff9-a40bd87b434e'::uuid, 'k-pop-numbers-quiz-how-many-members', 2,
   'How many members does NewJeans have?',
   '5',
   'NewJeans was originally a five-member group, and as of October 2026 Wikipedia lists four members, so 5 is no longer the current number of members; 4 is the right option today.',
   'https://en.wikipedia.org/wiki/NewJeans'),
  -- k-pop-numbers-quiz-how-many-members, question 5
  ('5b495306-1017-42ea-8ff9-a40bd87b434e'::uuid, 'k-pop-numbers-quiz-how-many-members', 4,
   'How many members does ENHYPEN have?',
   '7',
   'ENHYPEN was formed with seven members and has had six since March 2026: Jay, Jake, Sunghoon, Sunoo, Jungwon and Ni-ki. So 7 is outdated and 6 is the right option today.',
   'https://en.wikipedia.org/wiki/Enhypen'),
  -- twice-japanese-discography, question 4
  ('2904a2ec-9c9c-4280-96d0-2f5b40c4f764'::uuid, 'twice-japanese-discography', 3,
   'Mina is from which Japanese city?',
   'Kobe',
   'Mina was born in San Antonio, Texas, and grew up in Nishinomiya, Hyogo Prefecture, not Kobe, so none of the four options is right. Adding Nishinomiya as an option would fix the question.',
   'https://en.wikipedia.org/wiki/Mina_(Japanese_singer)'),
  -- k-pop-fashion-and-style-quiz, question 4
  ('f7569739-be1a-48e6-99e4-0930226a214b'::uuid, 'k-pop-fashion-and-style-quiz', 3,
   'Which BLACKPINK member is a global ambassador for Celine and Bulgari?',
   'Lisa',
   'Lisa stepped down as Celine''s global ambassador in 2024, after holding the role since September 2020, so she is no longer one. Asking who was a global ambassador for Celine and Bulgari keeps Lisa right.',
   'https://www.koreajoongangdaily.com/business/exclusive-blackpinks-lisa-steps-down-as-celine-global-ambassador/12060565');

do $$
declare bad int;
begin
  select count(*) into bad
  from corr_e3 x
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
    raise exception 'quiz corrections lot E3: % row(s) no longer match their quiz, nothing applied', bad;
  end if;
end $$;

insert into public.quiz_correction_requests (quiz_id, q_index, question, marked_answer, correction, source_url, lot)
select quiz_id, q_index, question, marked_answer, correction, source_url, 'E3' from corr_e3
on conflict (quiz_id, q_index) where status in ('pending', 'notified') do nothing;

do $$
begin
  if (select count(*) from public.quiz_correction_requests r join corr_e3 x on x.quiz_id = r.quiz_id and x.q_index = r.q_index
      where r.lot = 'E3' and r.status in ('pending', 'notified')) <> 8 then
    raise exception 'quiz corrections lot E3: 8 open requests expected, nothing applied';
  end if;
end $$;

commit;
