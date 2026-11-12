-- 100-bucket-cards.rollback.sql (undo of 100-bucket-cards.sql)
--
-- What:   puts the file size limit of the bucket 'cards' back to the 1 MB of 003-rls.sql. The bucket and the files in it stay
--         (deleting a bucket row with files in it is not done by a script; 003-rls.rollback.sql owns the bucket).
-- Verify: select file_size_limit from storage.buckets where id = 'cards';   expect 1048576 (or no row)
-- o1-transaction: single, ONE DO block. Idempotent.

do $c100r$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  update storage.buckets set file_size_limit = 1048576 where id = 'cards';
end $c100r$;
