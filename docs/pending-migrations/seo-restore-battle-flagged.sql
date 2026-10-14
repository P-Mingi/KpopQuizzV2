-- APPLIED 2026-10-14 by the owner's session (this file matches what ran). Puts back online the quizzes that were flagged
-- ONLY by anonymous reports (the retired Battle mode's per-question reports and the app's
-- own "[Auto]" moderation rows), never by a signed-in user. Measured on 2026-10-13:
--
--   slug                                     plays  reports  signed-in reporters
--   bts-true-or-false-bet-you-cant-get-100    1273        5   0
--   seventeen-members-mega-quiz-all-13        1178        9   0
--   stray-kids-albums-and-b-sides-deep-dive   1144        6   0
--   enhypen-world-ultimate-fan-challenge       890        5   0
--   illit-quiz                                 428        6   0   (59 Google clicks in 3 months)
--   katseye-quiz                                70        8   0
--
-- The WHERE re-checks the rule in the database, so a quiz that a signed-in user reported is
-- never restored by this statement. only-real-monstiez (227 plays, 8 anonymous reports) is NOT
-- in the list on purpose: owner decision, it stays offline (one question is about the harassment
-- of a BABYMONSTER member).
-- Reverse: UPDATE public.quizzes SET status = 'flagged' WHERE slug IN (<same list>);
-- After applying, the next render of each page (ISR, within the hour) brings it back; the
-- sitemap lists them on its next hourly rebuild.

UPDATE public.quizzes q
SET status = 'published'
WHERE q.status = 'flagged'
  AND q.slug IN (
    'bts-true-or-false-bet-you-cant-get-100',
    'seventeen-members-mega-quiz-all-13',
    'stray-kids-albums-and-b-sides-deep-dive',
    'enhypen-world-ultimate-fan-challenge',
    'illit-quiz',
    'katseye-quiz'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.reports r WHERE r.quiz_id = q.id AND r.reporter_id IS NOT NULL
  );
