# Brief Q0c: the read-only production proxy of parity.sh (Wave 1, code, priority 0)

Read first: `O1/docs/o1/briefs/COMMON.md`. Reviewer profiles: SEC and ARCH. Needs: Q0a merged (parity.sh, the freeze
hook and the refusal list are Q0a's work; ownership of `scripts/o1/parity.sh` and `scripts/o1/parity/**` moves to Q0c
when it starts, LEDGER D-028). Size: 3 to 5 agent-hours (estimate).

## The owner's conditions (2026-10-18), verbatim in substance; each one is a done-test line
1. A small local proxy sits in front of the production Supabase URL. The build and the server receive only the proxy's
   address, never the real URL: prove that the production ref appears in no variable passed to the build or to the
   server (check the literal ref, and the payload of any JWT passed: the build and the server get stand-in keys; the
   proxy swaps the stand-in anon and service role keys for the real ones on the way out, so the real keys never reach
   them either).
2. The proxy lets GET and HEAD through (PostgREST runs GETs in a read-only transaction).
3. In POST it lets through only `/rest/v1/rpc/<name>` for the 22 STABLE or IMMUTABLE production functions, which
   PostgREST also runs read-only: bt_fans_today, bt_runs_admin_stats, calc_mastery_level, calc_player_level,
   check_byeol_eligibility, get_daily_bt_leaderboard, get_fandom_war_map, get_fandom_war_map_v12, get_quiz_rank,
   get_quiz_rank_for_score, get_quiz_rank_for_score_v12, get_quiz_rank_v12, get_today_stats, get_weekly_leaderboard,
   is_editorial, live_topic_open, name_all_round_stats, quiz_comment_like_counts, ranked_ladder,
   ranked_player_standing, ranked_standings, verse_name_recognition. Check each name against the volatility in
   `KPQ/prod-public.sql` (read only) and say so in the report; a function that is not STABLE or IMMUTABLE there is
   refused and reported, never allowed.
4. Everything else (POST, PATCH, PUT and DELETE elsewhere, auth writes, storage uploads, realtime) gets a 403 and leaves
   a line in the report. Reason: some pages call writing functions at render (ensure_daily_quiz, tier_list_bump_view,
   and others); with the service role key a comparison would write to production.
5. The parity report lists the blocked calls, base side and head side (one proxy per side, or one proxy that knows the
   side). If they differ, that is a difference to explain (parity says so; R reads it).
6. Test the proxy offline first: a POST to /rest/v1/rpc/ensure_daily_quiz gets a 403 without leaving the machine
   (upstream pointed at an unreachable address, and a socket count or a fake upstream that records nothing proves no
   byte left). Also: a PATCH, a DELETE, a POST to /auth/v1/signup and to /storage/v1/object get 403; a GET reaches the
   fake upstream; an allowed RPC reaches it.
7. One full comparison before each merge that touches kpopquiz.org, no more (parity.sh's cache per sha pair already
   gives this; the merge step runs it once).

## Deliverables
- `scripts/o1/prod-proxy/` (the proxy, Node, no new dependency; its self-test; the allowlist as data checked against
  `KPQ/prod-public.sql`).
- `scripts/o1/parity.sh` changes (a CR approved here by ORCH): production mode starts the proxy, passes only the proxy
  URL and the stand-in keys to builds and servers, keeps Q0a's freeze hook and refusals, writes the blocked calls per
  side into the result, and fails when the production ref reaches a child environment. Offline mode unchanged.
- Report `docs/o1/reports/Q0c.md` with each condition and how it is proven.

## Done test
Every condition above proven offline (no production read). The first production comparison is run by ORCH after R
passes Q0c, removing `docs/o1/PARITY-OFFLINE` (D-025), on o1/integration against origin/main.
