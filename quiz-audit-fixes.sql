-- KpopQuiz Content Audit - Fix Commands
-- Generated: 2026-03-26
-- Review each fix carefully before running.
-- These are READ-ONLY suggestions - run manually after review.

-- ============================================================
-- FIX 1: BTS world records quiz - Q2 question text
-- Problem: Question says "2019" but the Grammys performance was January 2020
-- Quiz: "BTS world records and achievements quiz"
-- ============================================================
UPDATE quizzes
SET questions = jsonb_set(
  questions::jsonb,
  '{1,question}',
  '"BTS performed at which major US awards show in 2020 with Lil Nas X?"'
),
updated_at = NOW()
WHERE id = 'a0189d77-42f3-499b-b6c3-e880ee158e21';

-- ============================================================
-- FIX 2: BTS world records quiz - Q6 correct answer
-- Problem: Answer is 3, but BTS had 4 consecutive #1 Hot 100 debuts
--          (Dynamite, Life Goes On, Butter, Permission to Dance)
-- Change correct from index 1 (B=3) to index 2 (C=4)
-- Also fix the fun fact to include Life Goes On
-- Quiz: "BTS world records and achievements quiz"
-- ============================================================
UPDATE quizzes
SET questions = jsonb_set(
  jsonb_set(
    questions::jsonb,
    '{5,correct}',
    '2'
  ),
  '{5,fun_fact}',
  '"Dynamite, Life Goes On, Butter, and Permission to Dance all debuted at #1 consecutively."'
),
updated_at = NOW()
WHERE id = 'a0189d77-42f3-499b-b6c3-e880ee158e21';

-- ============================================================
-- FIX 3: BLACKPINK title tracks - Q2 correct answer
-- Problem: Ice Cream did not reach #1 on any US chart.
--          How You Like That reached #1 on Billboard Digital Song Sales.
-- Change correct from index 2 (C=Ice Cream) to index 1 (B=How You Like That)
-- Also fix the fun fact
-- Quiz: "BLACKPINK title tracks challenge"
-- ============================================================
UPDATE quizzes
SET questions = jsonb_set(
  jsonb_set(
    questions::jsonb,
    '{1,correct}',
    '1'
  ),
  '{1,fun_fact}',
  '"How You Like That reached #1 on the Billboard Digital Song Sales chart in 2020."'
),
updated_at = NOW()
WHERE id = '08fbc359-7486-40ba-8cbd-652dd2c63fbe';

-- ============================================================
-- FIX 4: Stray Kids achievements - Q1 correct answer and options
-- Problem: Answer says 4, but they have 5 #1 Billboard 200 albums
--          (ODDINARY, MAXIDENT, 5-STAR, Rock-Star, ATE)
-- Need to change option D from "4" to "5" and update fun fact
-- Quiz: "Stray Kids achievements and records quiz"
-- ============================================================
UPDATE quizzes
SET questions = jsonb_set(
  jsonb_set(
    jsonb_set(
      questions::jsonb,
      '{0,options}',
      '["1", "2", "3", "5"]'
    ),
    '{0,correct}',
    '3'
  ),
  '{0,fun_fact}',
  '"ODDINARY, MAXIDENT, 5-STAR, Rock-Star, and ATE all reached #1 on the Billboard 200."'
),
updated_at = NOW()
WHERE id = '31148326-a073-42ee-be52-c91f98181742';

-- ============================================================
-- FIX 5: TWICE from Sixteen to stardom - Q4 correct answer
-- Problem: Answer says 2018 (C, index 2) but their first tour was in 2017
--          The fun fact even says "starting in February 2017"
-- Change correct from index 2 (C=2018) to index 1 (B=2017)
-- Quiz: "TWICE from Sixteen to stardom quiz"
-- ============================================================
UPDATE quizzes
SET questions = jsonb_set(
  questions::jsonb,
  '{3,correct}',
  '1'
),
updated_at = NOW()
WHERE id = '9617acc8-a94f-468f-b175-23caab6ab35f';

-- ============================================================
-- OPTIONAL FIX 6: aespa members facts - Q3 (DEBATABLE)
-- Current: Winter marked as correct for "powerful vocals and high notes"
-- NingNing is more widely recognized as main vocalist / high note specialist
-- Change correct from index 2 (C=Winter) to index 3 (D=NingNing)
-- Only apply if you agree NingNing is the better answer
-- Quiz: "aespa members facts quiz"
-- ============================================================
-- UNCOMMENT TO APPLY:
-- UPDATE quizzes
-- SET questions = jsonb_set(
--   jsonb_set(
--     questions::jsonb,
--     '{2,correct}',
--     '3'
--   ),
--   '{2,fun_fact}',
--   '"NingNing is the main vocalist of aespa and is celebrated for her powerful high notes and wide vocal range."'
-- ),
-- updated_at = NOW()
-- WHERE id = 'e24b0a24-0124-4d12-b56a-1e7c7239bec0';
