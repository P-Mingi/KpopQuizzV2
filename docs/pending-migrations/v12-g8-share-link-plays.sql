-- v12-g8-share-link-plays.sql  (V12 run, agent G8 Group hub + creators). NOT APPLIED.
--
-- WHAT
--   1. Table  public.share_link_plays   one row per play that came through a
--                                       creator's tracked share link (/s/<code>):
--                                       one per link, player and UTC day.
--
-- WHY
--   The share kit (SYSTEM.md 5.4) shows "N plays from your link". Today the site
--   records a CLICK on a share link (dev_share_links.click_count, dev_share_clicks)
--   but nothing ties a PLAY to the link it came from, so the number does not exist.
--   Rule 7 of the run: a number that does not exist is hidden. The kit shows the
--   line only once this table exists and the two write-side calls of
--   run/requests/G8.md (R1, R2) are in.
--
-- ROWS
--   None written by this file. No backfill (past plays cannot be attributed), no
--   change to an existing table, row, policy or function.
--
-- WHAT IT UNLOCKS
--   GET /api/creators/kit answers `linkPlays: <number>` instead of `null`, and the
--   share kit shows the live line. recordLinkPlay() (lib/creators/link-plays.ts)
--   starts storing rows (it answers 'not_live' and writes nothing until then).
--
-- SAFETY
--   Additive only. RLS is on and there is NO policy: anon and authenticated can
--   neither read nor write; every access goes through the service role
--   (app/api/creators/kit after the session check, the play route through
--   recordLinkPlay). No personal data: player_key is a truncated SHA-256 of the
--   account id or of the random per-browser id, never the id itself; no IP, no
--   user agent. is_test is set by the server (true unless VERCEL_ENV is
--   'production'): the dev server and the previews use this same database and
--   must never count. share_code is plain text on purpose (no foreign key), so
--   this file does not depend on the type of dev_share_links.id.
--
-- ORDER
--   Independent of every other v12 file.
--
-- VERIFY (read only, after apply)
--   select count(*) from public.share_link_plays;                                        -- 0
--   select relrowsecurity from pg_class where oid = 'public.share_link_plays'::regclass; -- t
--   select count(*) from pg_policies where tablename = 'share_link_plays';               -- 0
--   select has_table_privilege('anon', 'public.share_link_plays', 'select'),
--          has_table_privilege('authenticated', 'public.share_link_plays', 'insert');    -- f, f
--
-- UNDO
--   BEGIN;
--   DROP TABLE IF EXISTS public.share_link_plays;
--   COMMIT;

BEGIN;

CREATE TABLE IF NOT EXISTS public.share_link_plays (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  share_code  text NOT NULL,                                   -- dev_share_links.share_code
  quiz_id     uuid NOT NULL,                                   -- the quiz the link opens
  player_key  text NOT NULL,                                   -- sha256(account or browser id), 32 hex
  played_on   date NOT NULL DEFAULT ((now() AT TIME ZONE 'utc')::date),
  is_test     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT share_link_plays_code_chk CHECK (char_length(share_code) BETWEEN 4 AND 32),
  CONSTRAINT share_link_plays_key_chk CHECK (char_length(player_key) = 32),
  CONSTRAINT share_link_plays_once UNIQUE (share_code, player_key, played_on)
);

COMMENT ON TABLE public.share_link_plays IS 'V12: one row per play that came through a creator share link (/s/<code>), once per link, player and UTC day. Service role only. is_test rows never count.';

CREATE INDEX IF NOT EXISTS share_link_plays_quiz_idx ON public.share_link_plays (quiz_id);

ALTER TABLE public.share_link_plays ENABLE ROW LEVEL SECURITY;
-- No policy on purpose: with RLS on and no policy, anon and authenticated see and
-- write nothing. The service role bypasses RLS.
REVOKE ALL ON TABLE public.share_link_plays FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.share_link_plays TO service_role;

COMMIT;
