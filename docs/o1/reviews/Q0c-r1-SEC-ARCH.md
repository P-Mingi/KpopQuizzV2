# Review Q0c round 1, profiles SEC and ARCH

| field | value |
|---|---|
| lane | Q0c (the read-only production proxy of parity.sh) |
| round | 1 (the whole diff `d28e316..86acf39`, 20 files, 1611 added lines) |
| profiles | SEC and ARCH, one pass, each checked with its own evidence (D-029) |
| reviewer | R (fresh instance) |
| reviewed sha | 86acf3908eb4413c86ae382eb01338f514ee257b (86acf39) |
| tree | df76ed576f7f2bda384c2bab24c945b4609e0333 |
| branch / worktree | o1/Q0c, `.claude/worktrees/o1-Q0c` |
| gate base | d28e3165f5fc84715c3ced8f9894a6b380c33467 (o1/integration with Q0a merged; an ancestor of the head) |
| evidence folder | `docs/o1/evidence/Q0c/86acf3908eb4413c86ae382eb01338f514ee257b/` |
| date | 2026-10-18 (review about 19:00 to 19:45 UTC) |
| verdict | FIX (1 major, 4 minor) |

## Reviewability gate

- HEAD of the worktree is 86acf3908eb4413c86ae382eb01338f514ee257b, the sha I was given. `git status --porcelain`
  printed nothing at the start and nothing after all my runs (tsc, vitest, node --test, the GET write audit; my attack
  scripts and their outputs live in the scratchpad only).
- Evidence `summary.json`: `madeBy: scripts/o1/gate.sh`, sha 86acf39, tree df76ed5 (equal to `git rev-parse
  HEAD^{tree}`), base d28e316, `green: true`, `touchesKpop: false`. Every step rc 0 except parity `skipped` (reason in
  `parity.log`: no path outside the anime, hub and run-only folders).

## Checks (items of REVIEWER.md that apply)

1. Scope (ARCH): PASS.
   - `guard.log`: `Q0c ok (20 range d28e316..86acf39)`. My own guard run on the same range: same output, exit 0.
     `hot.log`: clean (320 hot files).
   - Every changed path is `scripts/o1/prod-proxy/**`, `scripts/o1/parity.sh`, `scripts/o1/parity/**` (Q0c's in
     `OWNERSHIP.json`, sequenced with Q0a per D-033) or the lane's own report and requests.
2. Contract (ARCH): PASS.
   - The `parity.sh` changes are the CR the brief approves ("a CR approved here by ORCH", D-028). No file of
     `docs/o1/contracts/` names parity. `parity.json` gains two fields, `"mode"` and `"proxy"`, after the existing
     ones; its consumers (`parity.sh` itself with `grep -q '"identical": true'`, `gate-plan.mjs` with an existence
     test) read nothing that moved. Additive.
   - "Offline mode unchanged": the offline branch of `run_env` holds the same four lines as before, byte for byte;
     gate.sh's stand-in env (`http://127.0.0.1:9`, D-025) is classified offline (checked, attack 2). What does move in
     offline mode: the harness hash (Open point 1), two extra existence checks at start, `"mode": "offline"` and
     `"proxy": null` in parity.json. Acceptable.
3. Evidence: PASS.
   - My tsc (`apps/quiz`, `--noEmit -p tsconfig.json --incremental false`): exit 0, as `tsc.log`.
   - My vitest (`--testTimeout=30000`, the gate's command): 125 files, 2321 tests passed, as `unit.log`.
   - My `node --test --test-timeout=60000` of the 13 files of the gate's `harness-unit` plan (`checks/plan.json`):
     135 of 135, as `checks/harness-unit.log`. `scripts/o1/parity/*.test.mjs` alone: 76 of 76; the proxy's own
     `scripts/o1/prod-proxy/*.test.mjs`: 20 of 20 (both as the report says).
   - No lane leak specs exist (`lane-specs: lanes.json lists no specs for Q0c`); the gate's `leak` and
     `network-links` checks are ok.
4. kpopquiz.org unchanged: PASS. `changed.txt` holds only `scripts/o1/**` and `docs/o1/**`; parity was not needed.
   No build output can change (no file under `apps/`, `packages/`).
5. Leaks on the lane's surfaces: not applicable (no route, no page, no copy).
6. SQL: not applicable (no SQL file).
7. Security (SEC): the owner's seven conditions, each against the code and a run of my own.
   - Condition 1 (only the proxy address and stand-in keys reach builds and servers): MET for the env file as it is
     meant to be written (an origin `https://<ref>.supabase.co` and JWT keys): `childEnv` swaps by value, then
     `findLeaks` reads every variable, variable name and argument for the ref, the upstream host and the real keys,
     literally (case folded) and inside JWT payloads, and `findFileLeaks` the `.env*` files of the child's folder
     (`apps/quiz` of the build path, which is the cwd of `build()` and `serve()`). My attack 3: an upper case URL, a key
     with a trailing newline and a pooler URL holding the ref are caught. NOT met in two configurations: a URL string
     the bash mode switch misreads as local (M1), and a custom domain with new style keys, where no ref is known (m2).
     No production ref, host or JWT literal exists in `apps/quiz/src`, `packages/*/src` or `next.config.ts` (grep:
     only `example`/`abc` hosts in tests and the `*.supabase.co` image pattern), so no source path bypasses the proxy.
   - Condition 2 (GET and HEAD pass): MET. `/rest/v1/**`, `/storage/v1/**`, `/graphql/v1` and four auth read
     endpoints (D2 narrows GoTrue GETs that write, and the admin API). A GET of a volatile RPC reaches the upstream
     (attack 1); that is the owner's premise (PostgREST runs GET read-only), not a defect.
   - Condition 3 (POST only on the 22 STABLE or IMMUTABLE RPCs): MET. The JSON list equals the brief's list (diff of
     the two, sorted). My own read of the 22 function headers of `KPQ/prod-public.sql` (read only, headers only, with
     awk, not the builder's parser): one overload each; 20 STABLE (bt_fans_today, bt_runs_admin_stats,
     check_byeol_eligibility, get_daily_bt_leaderboard, get_fandom_war_map, get_fandom_war_map_v12, get_quiz_rank,
     get_quiz_rank_for_score, get_quiz_rank_for_score_v12, get_quiz_rank_v12, get_today_stats,
     get_weekly_leaderboard, is_editorial, live_topic_open, name_all_round_stats, quiz_comment_like_counts,
     ranked_ladder, ranked_player_standing, ranked_standings, verse_name_recognition), 2 IMMUTABLE
     (calc_mastery_level, calc_player_level). Refused: none. This matches the report's table. The path regex is
     exact lower case with no trailing slash; `Content-Profile` and `Accept-Profile` must be `public`. The parser has a
     latent fail open shape (m1) that today's dump does not contain.
   - Condition 4 (everything else 403 and a line): MET for the proxy (attack 1: 17 raw requests, every write refused
     or rejected by Node's parser, the upstream saw only the allowed reads; refusals carry `x-o1-proxy: blocked` and a
     log line with the path only). The "line in the report" part holds for parity's own phases
     (`proxy-blocked.txt`, published to the evidence); for the gate's crawl of the kept build it waits on request 1
     (m4).
   - Condition 5 (blocked calls per side, a difference is a difference): MET. One proxy per phase, the phase in every
     line; `blocked.mjs` compares distinct calls per side and kind; parity exits 1 when they differ; the hook never
     freezes a proxy 403 (diff of `freeze-hook.mjs`, and `parity-sh-proxy.test.mjs` shows a refused read asked twice
     reaching the proxy twice).
   - Condition 6 (offline first, nothing leaves): MET. `proxy.test.mjs` counts sockets at the proxy's agent (0) and
     connections at a recording fake upstream (0) for the 16 writes, including POST `rpc/ensure_daily_quiz`, PATCH,
     DELETE, POST `/auth/v1/signup`, POST `/storage/v1/object/...`; the control GET to 127.0.0.1:9 opens 1 socket, so
     the counter counts; GET, HEAD and `rpc/get_today_stats` reach the fake upstream with the real keys and no
     stand-in. Repeated end to end by `launch.test.mjs` and `parity-sh-proxy.test.mjs`. I re-ran all three.
   - Condition 7 (one comparison per merge): MET. The cache check still comes before the lock, the preflight and any
     worktree; the test runs base = head twice with a production URL and no dump and shows nothing starts.
   - Secrets: `secrets.log` clean. My own scan of the 1611 added lines: no JWT shape, no `sb_secret_` or
     `sb_publishable_` literal, no `<20 chars>.supabase.co` host. Stand-in keys are random per run, mode 600, in the
     run's freeze folder under KPQ (never in the repository or the evidence). The service role key never reaches a
     browser: the child's `SUPABASE_SERVICE_ROLE_KEY` is a stand-in, and the real one exists only in the launcher.
8. Content, 9. UX, 10. SEO: not applicable.
11. Copy: PASS. `copy.log` empty; my scan of added lines: no U+2013, no U+2014, no emoji.
12. The report tells the truth: mostly yes. Checked and true: the harness hash 29548297 (was cb12ed53, both
    recomputed with the script's own file list); 34 RPC names called by the app, 10 in the owner's list; D12's nine
    writers (the base judge, run against the same SQL tree, reads all nine as `reads`, the head as `writes`; only
    bt_bump_song_plays and reconcile_quiz_counters among the app's RPCs moved); get_personality_counts VOLATILE and
    get_rising_creators absent in the dump; the GET write audit prints "all 60 URLs: no unreviewed write reachable"
    on the head; 4013 is in no lane's range of `ports.tsv`. Overstated: D1 and the parity.sh header (M1), the "exit
    9" wording and D4 (m3).

## Attack attempts

1. Raw socket requests the tests do not send, against `createProxy` with a fake upstream that records every
   connection (scratchpad `attack1.mjs`). Tried: a lower case `post` on a writer; an absolute form target; two
   `Content-Profile` headers (public, then private); `Content-Profile: PUBLIC`; a pipelined allowed GET then a PATCH on
   one socket; a chunked body with a `Content-Length` and a smuggled DELETE; `Upgrade` without `Connection: upgrade`;
   `X-HTTP-Method-Override` in mixed case; `;x=1` and `#../ensure_daily_quiz` after an allowed RPC; GET of a volatile
   RPC; `?apikey=` in the query with no header; POST `/graphql/v1`; GET `/auth/v1/admin/users`; an HTTP/1.0 PUT on
   storage; CONNECT; a 2 MB body to an allowed RPC. Result: every write refused (403) or rejected by Node's parser
   (400: the lower case method, the CL plus TE request); the upstream saw only the pipelined GET, the GET of the
   volatile RPC (condition 2 premise), the query string GET with no key, and the allowed RPC with `PUBLIC` (an unknown
   schema to PostgREST, harmless). One upstream connection in total. Held.
2. The mode switch (`is_local_url` of parity.sh, extracted and run by itself) against Node's URL parser, 13 inputs.
   Result: three strings whose host is the production host are read as local by bash:
   `https://<ref>.supabase.co?x=@localhost`, `https://<ref>.supabase.co#@127.0.0.1`,
   `https://<ref>.supabase.co\@127.0.0.1`. supabase-js 2.100.1 builds `new URL("rest/v1", base)`, which drops the
   query and the fragment: the first two reach `https://<ref>.supabase.co/rest/v1`. Then, with the freeze hook loaded
   and fetch stubbed (scratchpad `attack2-hook.mjs`, nothing left the machine): with `O1_FREEZE_TARGET` set to the
   misread string, a POST to `rpc/ensure_daily_quiz` is not recognized as a Supabase request and reaches the network
   stub (200); with the plain URL the hook answers 403. Broken: M1.
3. The env guard (scratchpad `attack3.mjs`, made up values only). Tried: the URL in upper case, a key with a newline,
   a pooler URL with the ref, a plain base64 of the URL; then a custom domain URL with new style keys plus a pooler URL,
   a `PROJECT_REF`, a direct `<ref>.supabase.co` URL. Result: the first three caught; plain base64 missed (outside
   condition 1's "literal or JWT payload"); with a custom domain and new style keys there is no ref needle, all three
   missed. m2.
4. Planted schema dumps for the allowlist parser (scratchpad `attack4.mjs`). Tried: a volatile SQL standard `RETURN`
   body followed by a STABLE function of another schema; a quoted `"public"."name"`; a volatile pg_dump overload after
   a stable one; a volatile `BEGIN ATOMIC` body selecting a column named `stable`. Result: the quoted name and the two
   overload cases fail closed (refused); the `RETURN` body case is read as STABLE and ALLOWED. On this machine's dump
   every function header ends at an `AS` line (awk over all 93 headers) and all 93 are in schema public, so today's
   verdicts are right. m1.
5. Claims in the report against the diff: the hash, the counts, D12 (base judge run against the same SQL), the audit,
   the ports, the exit codes. Result: all true except the "exit 9" wording (a `.env*` leak found at build or serve
   time ends the run with 7 or 8, the 9 only in the build or serve log: `build()` maps any failure to `return 1`, and a
   server that never starts fails `up`) and D4's "anything else is refused" (a key in the query string is not looked
   at). m3.

## Findings

### Major

M1 (SEC) `scripts/o1/parity.sh` lines 111 to 117 (`is_local_url`, `offline_url`) and 126 to 131: the mode switch
fails open. It reads the host with bash string cuts (`${1#*://}`, `${h%%/*}`, `${h##*@}`), so a URL whose real host
is production but which holds `@` and a loopback name after a `?`, a `#` or a backslash is classified offline. The
offline branch then runs the child with the real URL and keys and no proxy, no guard and no preflight, and the freeze
hook's `url.startsWith(TARGET + '/')` no longer matches the requests supabase-js builds from that base, so its write
guard is off too (attack 2: a POST to `rpc/ensure_daily_quiz` reaches the stubbed network). This contradicts D1
("there is no switch that turns it off") and the header (lines 31 and 32: "it can only add the proxy, never remove
it"). Likelihood: low, only the owner writes `KPQ/secrets/kpop-parity.env` and no agent or lane can, but the
consequence is exactly the production write with the service role key the owner's conditions exist to prevent, and
the fix is small. Fix: decide the mode with the WHATWG parser the app uses (`new URL(v).hostname`, for example a
`--mode` entry of `launch.mjs` or a one line `node -e`), and refuse (exit 4, in both modes) an env URL that is not a
bare origin: userinfo, a path other than `/`, a query, a fragment, a backslash or whitespace. Prove it in
`parity-sh-proxy.test.mjs` with the three strings of attack 2 (made up ref): each must end in production mode or a
refusal, never in the offline branch.

### Minor

m1 (SEC) `scripts/o1/prod-proxy/allowlist.mjs` lines 41 to 48: a header with no `AS` line (a SQL standard `RETURN`
body) is scanned up to 40 lines and through the headers of other schemas' functions (`head` matches `public.` only),
so a later `STABLE` line can be credited to a volatile function (attack 4, ALLOWED). Today's dump has no such header,
so no verdict of the 22 is wrong. Fix: stop the scan at `^\s*RETURN\s` and at any `CREATE` line, and refuse a name
whose header ends without a terminator.

m2 (SEC) `scripts/o1/prod-proxy/env-guard.mjs` lines 25 to 36: the ref is known only from a `<ref>.supabase.co|in`
host or a JWT `ref` claim. With a custom domain and new style keys the needle list holds no ref and condition 1's
"the literal ref" check silently does nothing (attack 3). R did not read the env file and cannot say which shape
production uses. Fix: in production mode, stop (exit 4) when no ref is known, or take it from a named variable of the
env file kept with the launcher.

m3 (ARCH, report truth) `docs/o1/reports/Q0c.md` line 35 and D4 (line 103): "the ref in a child environment stops the
run (exit 9)" is true for the preflight only; a leak the preflight cannot see (a `.env*` file of the build folder)
stops the run with exit 7 (`build()`, parity.sh line 286) or 8 (`up`, line 315), the reason only in
`build-<role>.log` or `serve-<role>.log`. D4's "anything else (a real key a child got somewhere ...) is refused"
holds for the `apikey` and `authorization` headers, not for a key in the query string (attack 1; harmless while
condition 1 holds, since the verdict alone decides writes). Fix: say so, or make `build()` and `serve()` pass a 9
through as 9.

m4 (SEC) Condition 4's "a line in the report" for the gate's own crawl of the kept build (`gate-serve`,
`gate-check` phases) waits on request 1 to Q0a (`gate-checks.sh`); until it lands those blocked calls are only in the
kept freeze folder. Nothing writes meanwhile (the proxy refuses). ORCH: land request 1 before the first gate of a kpop
lane after D-025 ends, or accept the gap in writing.

## Observations (not findings)

- Open point 3 is a parity blind spot the proxy introduces: URLs built from `NEXT_PUBLIC_SUPABASE_URL` (group photos
  of `lib/ux-v1/a0/group-photos.ts`, Verse assets) carry `http://127.0.0.1:4013` on both sides, so
  `isConfiguredImageHost` (`*.supabase.co` only) sends `quiz-rows.tsx` to its placeholder and that branch is no longer
  compared in production mode. Disclosed; the owner's call. Worth a line in REVIEW-LOG, and worth a look at the page
  statuses of the first production run.
- The proxy guards Supabase only. The app also reads `DISCORD_ALERT_WEBHOOK_URL`, `DISCORD_FLEX_WEBHOOK_URL` and
  other tokens; main parity runs are not strict (Open point 2, Q0a request 27), so a POST to another origin from a
  parity build or server is not refused. Outside Q0c's conditions; whether the env file holds such values is the
  owner's to check (R reads no secret).
- Plain base64 (not a JWT) is not searched by the guard; outside condition 1's wording.
- Design (ARCH): two layers kept (the hook refuses writes in process, the proxy refuses them on the network and holds
  the only real keys), small modules with offline tests that count sockets rather than trust absence of errors, a
  test shim for the gate's folder list (request 2). Sound.

## Verdict

FIX. One major (M1: the mode switch fails open on a misparsed env URL, which turns off both the proxy and the hook's
write guard), four minor (m1 to m4). Everything else of the brief is built and proven offline, and the evidence,
tsc, vitest and harness runs agree. Round 2 reviews the diff since 86acf39 plus the answers to M1 and m1 to m4.
