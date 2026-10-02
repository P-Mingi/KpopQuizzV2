-- WHAT: one spelling for songs.language: the 156 rows that say 'ko' become 'korean'.
-- WHY: the column mixes 'korean' (3,964 rows, the column's own default) and 'ko' (156 rows, written by the
--   ingestion script before V12). PROPOSAL, owner decision: nothing is broken today, this only removes the mix.
-- READERS CHECKED (origin/main a94d77c and feat/v12, same code): the column has exactly one reader,
--   apps/quiz/src/app/(site)/verse/[slug]/songs/[id]/page.tsx (the select on L34, printed on L141 as the
--   "Language" line of the song page, upper-cased by CSS). No filter, no index, no policy, no SQL function and no
--   other page reads it. Proof and the full grep: docs/growth/catalogue/v12-g2-08-language.md.
-- WHY 'korean' AND NOT 'ko': it is the default of the column and the value of 96% of the rows; the one reader
--   prints the value as it is, so the 3,964 rows already show "KOREAN". Going the other way would rewrite 3,964
--   rows and change that line on every song page that shows it. The ingestion script now writes 'korean'.
-- VISIBLE EFFECT (flags on or off): the "Language" line of a song page goes from "KO" to "KOREAN" for the rows that
--   are linked to a group: 13 today (the Cortis songs), plus the Hearts2Hearts and NCT WISH songs once
--   v12-g2-02 links them. The other rows have no group, so no song page.
-- NOT IN THIS FILE: whether each song really is in Korean. The value is a default, not a checked fact (English and
--   Japanese releases carry it too). Fixing that needs a per-song source and is a separate owner decision.
-- ROWS: 156 updates (count read with the anon key on 2026-10-02). No insert, no delete.
-- IDEMPOTENT: only rows that still say 'ko' are touched; a second run matches nothing.
-- APPLY ORDER: any time. Independent of the other v12-g2 files.
-- VERIFY: select language, count(*) from songs group by 1;  -- one line: korean (plus NULL for the soundtrack rows of v12-g2-07)
-- UNDO: not needed in practice; to restore the mix exactly, the 156 rows are the ones this script wrote:
--   update songs set language = 'ko' where language = 'korean' and deezer_track_id in (<ids listed in the report>);

begin;

update songs set language = 'korean', updated_at = now() where language = 'ko';

commit;
