-- L14-O1-dle-on.rollback.sql (run O1): switches kpopdle-idol, otakudle and the two games of one series (otakudle-one-piece, otakudle-dragon-ball) off. Epochs, banks and every play stay, so running L14 again resumes the same numbering.
-- Players then see "not available" on the two pages while the flag is on; turn the flag off (a PR) to answer 404 again. Off for one game only: update public.dle_games set active = false where id = '<game>'.
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

update public.dle_games set active = false where id in ('kpopdle-idol', 'otakudle', 'otakudle-one-piece', 'otakudle-dragon-ball') and active;
