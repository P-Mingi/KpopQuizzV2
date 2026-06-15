-- 075 - E6: link a submitted battle question to a signed-in author so we can
-- award the author +20 XP when the question is promoted to 'live'. author_hash
-- stays the anon (ip+day) identity; author_user_id is set only when the submitter
-- was signed in (anon authors stay null and earn no XP).
alter table public.pending_questions
  add column if not exists author_user_id uuid references public.profiles(id) on delete set null;
