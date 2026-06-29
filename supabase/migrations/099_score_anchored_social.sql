-- 099 - Score-anchored reactions + comments (Workstream M, M1.20). Extends the
-- EXISTING reactions/comments tables (mig 047), no parallel system. Each reaction
-- and comment carries the author's best score on that quiz at the moment they
-- post, so the social proof is anchored to knowledge ("reacted with 9/10"), not a
-- freeform feed. Additive + nullable (older rows stay null).
alter table public.quiz_reactions
  add column if not exists score int,
  add column if not exists total int;

alter table public.quiz_comments
  add column if not exists score int,
  add column if not exists total int;
