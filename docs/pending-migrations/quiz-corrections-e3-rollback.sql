-- Rollback of quiz-corrections-e3.sql. OWNER-GATED, like the file it undoes.
-- Deletes the requests of lot E3. Effect by status: pending, nothing was sent; notified, the job stops (the
-- notice already sent stays in the creator's bell, and the quiz will not move to draft); resolved or
-- cancelled, only the record goes. Quizzes are not touched. Lots E1 and E2 are not touched either.
-- Guard: it refuses while a quiz of the lot is still in draft because of its request (status drafted, quiz
-- still 'draft'): republish it (admin quiz editor) or decide to keep it in draft first, then delete that row
-- by hand and run this file again.

begin;

do $$
declare held int;
begin
  select count(*) into held from public.quiz_correction_requests r join public.quizzes z on z.id = r.quiz_id
  where r.lot = 'E3' and r.status = 'drafted' and z.status = 'draft';
  if held > 0 then
    raise exception 'quiz corrections lot E3 rollback: % quiz(zes) still in draft because of the lot, nothing rolled back', held;
  end if;
end $$;

delete from public.quiz_correction_requests where lot = 'E3';

commit;
