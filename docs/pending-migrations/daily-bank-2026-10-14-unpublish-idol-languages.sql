-- OWNER-GATED. Unpublishes the daily quiz of 2026-10-14, "K-pop Idol Languages"
-- (/q/k-pop-idol-languages, quiz c77955af-e465-446f-91cb-292a0d13fa6d, 18 plays on 2026-10-15).
-- Found while preparing lot 1 (Mission U). It has four errors, so it cannot stay public:
--   Q1 fun fact: TWICE has five Korean members, not six (nine members: five Korean, three
--      Japanese, one Taiwanese).
--   Q5 premise: the GOT7 member who speaks Thai is BamBam, not Jackson (the quiz's own fun fact
--      lists Jackson's languages without Thai).
--   Q7 answer and fun fact: "Japanese" is marked right for Jisoo, and the fun fact says she is
--      the only Korean-born member of BLACKPINK (Jennie was born in Seoul).
--   Q10 is about Kris Wu, which breaks the no legal matters rule.
-- 'draft' keeps the row and its plays; the page stops being public and leaves the sitemap.
-- Rollback: daily-bank-2026-10-14-unpublish-idol-languages-rollback.sql.

update public.quizzes set status = 'draft'
where id = 'c77955af-e465-446f-91cb-292a0d13fa6d' and status = 'published';
