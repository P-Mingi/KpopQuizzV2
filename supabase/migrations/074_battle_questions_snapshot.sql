-- 074 - E2: snapshot the 7 battle questions on the battle row.
-- quizzes.questions (JSONB) have no stable per-question uuids, so battles.question_ids
-- cannot reference them. Instead we snapshot the exact 7 questions (text + options +
-- correct + fun_fact) onto the battle, so the challenger, the opponent, and the ghost
-- all see identical questions even if the source quiz later changes.
alter table public.battles add column if not exists questions jsonb;
