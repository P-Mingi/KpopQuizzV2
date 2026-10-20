# Q0b: owner test tools (3 local sites on o1-dev, one-time sign-in link)

Lane Q0b, branch o1/Q0b. New files only: `scripts/o1-tools/dev-up.sh`, `scripts/o1-tools/signin-link.sh`,
`scripts/o1-tools/signin-helper.mjs` and this report. No app code changed. No secret in any file or in this report.

## Tool 1: `scripts/o1-tools/dev-up.sh [--rebuild] [--stop] [--status] [--ports p1,p2,p3]`

What it does
- Builds kpop, anime and hub from the code the worktree has checked out (o1/integration in the owner's worktree; the script does
  not touch git) against o1-dev, the way `apps/quiz/e2e/o1/O1/run-dev.sh` does through C3's script: `scripts/o1/env.sh dev`,
  `SITE_SCOPE=1` for the build and the server, `NEXT_PUBLIC_UX_V1=1`, `NEXT_PUBLIC_UX_V12=1`, `NEXT_PUBLIC_NET_ORIGINS` for the
  three origins, build lock `scripts/o1/build-lock.sh`, builds kept in `apps/quiz/.next-devup-<site>` (ignored by git, separate from
  C3's `.next-<site>`).
- Reuses a build when its stamp matches: tree of the app sources and packages (uncommitted edits counted by content), the ports, and a
  hash of the o1-dev URL and anon key (never printed). `--rebuild` forces the three builds (and restarts running servers).
- Starts the three servers (`next start`, each in its own session so they outlive the command) with `PASSPORT_JUMP=1`,
  `PASSPORT_TICKET_SECRET` and `NET_IP_HASH_SALT` generated once per start and shared by the three servers (in memory only),
  `ADMIN_USER_IDS` = the admin_reviewer fixture (docs/o1/contracts/fixtures.md). Logs: `~/kpq-o1/logs/dev-up/` (`<site>.log`,
  `build-<site>.log`). State: `~/kpq-o1/logs/dev-up/state.env` (pids, ports, commit; no secret).
- Waits until each site answers 200 on `/`, then prints exactly three lines on stdout (progress goes to stderr):

      kpopquiz  http://kpop.localhost:3190
      otakuquiz http://anime.localhost:3191
      fanquiz   http://hub.localhost:3192

- `--status` prints the same three lines, or `stopped` (exit 1). `--stop` stops the servers and the sign-in helper and prints `stopped`.
  A second start while they run prints the three lines and says it is already running.
- Ports: `--ports`, else `$O1_DEVUP_PORTS`, else 3190,3191,3192 (outside every lane triple of docs/o1/ports.tsv).
- Refuses (exit 5) unless `env.sh dev` gives o1-dev: `O1_ENV=dev`, `O1_BRANCH=o1-dev`, URL exactly `https://<branch ref>.supabase.co`,
  no production ref anywhere in the URL, the ref or the database URL (env.sh itself refuses the production project, a missing
  file or mode, and a URL without the branch ref).

Known limit, inherited from C3's server flags (`-H 127.0.0.1`): a path no route knows answers 500 instead of the 404 page, because Next
proxies the middleware rewrite to `/page-not-found` to `localhost`, which resolves to ::1 first and nothing listens there. Real 404s
(for example `/bts-quiz`) are fine. `O1_DEVUP_HOST=localhost` makes the servers listen on ::1 and fixes it (tried: 404 page), at the price
that `127.0.0.1` then refuses; `*.localhost` names still work.

Cost: three builds took about 3 to 4 minutes each on this loaded machine (about 10 minutes the first time). A start that reuses the
builds takes about 10 seconds.

## Tool 2: `scripts/o1-tools/signin-link.sh <fixture key or email> [kpop|anime|hub]`

Example: `scripts/o1-tools/signin-link.sh dual anime` prints one line, `http://anime.localhost:3199/s/<random id>`.
Open it in a browser (or `curl -L -c jar`): the account is signed in on the anime site and the browser lands on its home.
`signin-link.sh --stop` stops the helper (it also stops itself a minute after its last link is used or expired).
The sites must be up (`dev-up.sh`); the helper listens on `127.0.0.1:$O1_SIGNIN_PORT` (default 3199).

The way chosen: Supabase's own magic link, no app change, no password. Why this way and not a route in the app: it needs no code in
any production build, no flag, and the fixtures have no password.
1. `signin-helper.mjs mint` (run under `env.sh dev`, so it holds the service role key only while the command runs) looks the fixture
   account up by id (generateLink would create an account for an unknown email), then asks the admin API for a one-time magiclink
   token (`generateLink`, type magiclink, no email sent) and checks the returned user id.
2. It hands the token to a small local server (`signin-helper.mjs serve`, started detached on first use, without the service role key),
   which keeps it in memory only and returns a random id. The printed link holds that id, not a Supabase token.
3. Opening the link on `<site>.localhost` (once, within 10 minutes) makes the server verify the token with `@supabase/ssr`
   (`verifyOtp`, the way the apps' own routes do), set the session cookies exactly as `@supabase/ssr` writes them, and redirect to
   `http://<site>.localhost:<site port>/`. Cookies ignore ports, so the site receives them. The link is dropped from memory before
   anything else happens (a failed attempt needs a new link). A link opened on the wrong host (for example the kpop link on
   `hub.localhost`) answers 404 and stays valid for the right host.

Refusals: exit 5 unless `env.sh dev` gives o1-dev (same checks as dev-up, again inside the helper); exit 4 for an account that is not in
docs/o1/fixtures-dev.json (key or email), is not on the database, or is the `unconfirmed` fixture (a link would confirm its email and
break the fixture); exit 3 when the site is not running; exit 2 for a bad usage or site. Nothing but the link goes to stdout.
Test knobs: `O1_SIGNIN_PORT` (helper port), `O1_SIGNIN_TTL_S` (shortens a link's life to 5 to 600 s, never lengthens it).

## Checks (this worktree, o1-dev, sites on 3190 to 3192, helper on 3106)

1. dev-up
   - First start built the three sites and printed the three lines above; an interrupted first run (I stopped it during the hub
     build) was resumed and reused the kpop and anime builds, building only hub.
   - `curl http://localhost:<port>/` gives 200 on 3190, 3191 and 3192 (also with the `*.localhost` names).
   - `--status`: the three lines, exit 0. `--stop`: `stopped`, the three ports and the helper port closed, `--status` then prints
     `stopped` (exit 1).
   - Second start without `--rebuild`: `build kpop reused`, `build anime reused`, `build hub reused`, all up in 9 seconds. A start
     while running prints the three lines and "already running".
2. signin-link, opened with curl (cookie jar, `-L`), then `/me` (the signed-in profile page; signed out it has no username):

       account (site)            first open    /me signed out   /me signed in   same link again
       kpop_only (kpop)          200           no username      o1_kpop_only    410 (used or expired)
       anime_new (anime)         200           no username      o1_anime_new    410
       dual (anime)              200           no username      o1_dual         410
       dual (kpop)               200           no username      o1_dual         410

   - `/settings` redirects to `/login` signed out and answers 200 signed in (kpop and anime).
   - A link made with `O1_SIGNIN_TTL_S=10` answers 410 after 10 s. A default link left unused was dropped from the helper's memory
     at exactly 10 minutes (helper log). In that first run the helper then exited at once, so the link met a closed port; fixed: the
     helper now stays one minute after its last link is gone (used or expired), so the late answer is 410, and then stops by itself
     and removes its state file (seen with the 10 s link).
   - Refused: `somebody@example.com` and an `o1-fixture-*` address that is not in the list (exit 4, no output); `unconfirmed` (exit 4);
     site `blog` (exit 2); three production-looking environments built as fake `dev.env` files in a scratch folder through
     `O1_KPQ` (production project ref: env.sh refuses, exit 5; URL without the branch ref: env.sh refuses, exit 5; valid shape but
     `O1_BRANCH=o1-prod`: the tool refuses, exit 5), for both tools. Nothing was created on any database by a refusal.
3. Everything started was stopped at the end: `dev-up.sh --stop` and `signin-link.sh --stop`; no process left on 3106 or 3190 to 3192.
