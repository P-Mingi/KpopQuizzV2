# Run O1: common rules for every agent (builders, reviewer, gate and merge steps)

Copied by ORCH in Phase 0 from `RUN-O1-PROMPT.md` section 0 (rules 1 to 17), with the run environment. Every brief
and every agent prompt points here. Where a brief and this file differ, this file wins, then `RUN-O1-PROMPT.md`,
then `BACKLOG.md`.

Paths: `ROOT` = `/Users/louis/IT/Dev/projects/KpopQuizzV2` (the main checkout: never run a command or write a file
there). `O1` = `ROOT/.claude/worktrees/o1` (branch `o1/integration`, ORCH's). Your worktree =
`ROOT/.claude/worktrees/o1-<lane>` (branch `o1/<lane>`). `KPQ` = `~/kpq-o1` (outside the repo).
Inputs you may read (read only, never copy into the repo): `ROOT/docs/strategy/o1/BACKLOG.md`, `COLLISION-MAP.md`,
`RUN-O1-PROMPT.md`, `ROOT/docs/strategy/2026-10-MULTI-NICHE-v2.md`, `ROOT/docs/strategy/2026-10-NICHE-MISSIONS.md`,
`ROOT/docs/strategy/research/{P-passport,Q-bridges,S-otaku-content,A-architecture}.md`. Read only the sections your
brief cites.

## Rules that do not bend

1. Never push, never merge into `main`, never force-push. The owner merges, through the PR train.
2. Never write, print or commit a secret. Production secrets stay where they are. Dev secrets live in `KPQ/secrets/`.
   Never copy a key into a report, a log, a commit, a URL or the chat. Never `cat`, `head`, `grep` or open a file of
   `KPQ/secrets/`; scripts source them (`scripts/o1/env.sh`).
3. Production database: no connection from any agent, no DDL, no data write. Every table, column, function, policy,
   trigger, cron or row is a file in `docs/pending-migrations/multisite/` (idempotent; header: what, why, rows,
   verify, undo; its own rollback file `<name>.rollback.sql`). The owner applies them to production after a backup.
4. Dev databases: two Supabase branches of production, `o1-scratch` (tests, rebuilt at will) and `o1-dev`
   (integration). Test SQL first on a local scratch cluster loaded with the production public schema
   (`O1/scripts/o1/local-pg.sh`, from Q0b), then on `o1-scratch` (`O1/scripts/o1/migrate-dev.sh --branch scratch
   <file>`). Only ORCH's merge step sends R-passed files to `o1-dev`. Nobody resets, merges, rebases or pulls a
   branch from the Supabase dashboard; "rebuild" means `O1/scripts/o1/branch-parity.sh <branch>`.
5. kpopquiz.org does not change. Production is read by exactly one thing: `O1/scripts/o1/parity.sh`, run by the gate
   and merge steps, never by a builder. Every other kpop test runs on the dev branch with fixture users. Never load
   `/me`, `/profile` or `/settings` signed in against production; never run a sign-out, a deletion or a jump there.
6. Verrou 0: no anime or hub row in any production table before launch.
7. Real data only. No invented number; "New" below thresholds. The 30 OtakuQuiz creators and the "OtakuQuiz Team"
   system account always show the Team badge, never like, reply, vote or follow, publish only through the editorial
   pipeline, get XP only from real events and stay off every board. No agent creates a real account or handles a
   password. Fixture users and the 31 editorial accounts on the dev branches come from the owner's `o1:fixtures`
   command. Creator accounts in production come from the owner at launch.
8. Content: facts only from Wikidata, MusicBrainz, Wikipedia and official sites (the full list goes into
   `docs/anime/ANIME-SOURCES.md` when K1 writes it; until then this list rules); never MyAnimeList, Jikan, Fandom
   wikis, AnimeThemes, kprofiles. Two sources for load-bearing facts. Original wording. Sporcle and other quiz sites
   are a demand signal only: listing pages (titles, formats, play counts), never their questions, never stored.
   Similarity checks C7 and C9 on every draft (normalized n-gram similarity; no embedding model unless the owner
   approves a dependency). No lyrics. No image of a character, poster, logo or cover. A spoiler tag on every anime
   question.
9. Deezer: previews only, the Deezer logo and the private-use notice on every audio surface, nothing stored, cached
   or proxied, no ads, affiliate links or commercial scripts on any of the three sites.
10. Copy: no em dash (U+2014) or en dash (U+2013) and no emoji in UI copy, docs, reports, commit messages and code
    comments you add (the gate greps every added line). UI copy in English. Nothing K-pop on otakuquiz.org and
    nothing anime on kpopquiz.org unless the user chose it (artist credits excepted). Naming: `SiteId` (never
    World), `lib/network/` and the `Net` prefix (never bridge), hub id `hub` (never `id`). Copy strings live in
    per-site, per-lane files, never in the shared `lib/i18n` dictionaries.
11. Stay inside your owned paths (`O1/docs/o1/OWNERSHIP.json`; the pre-commit guard of your worktree enforces it). A
    change in a file another lane owns is a request in `docs/o1/requests/<your lane>.md` (in your worktree); the
    owner lane does it.
12. The other session and the shared repository. No agent runs a command in `ROOT` or writes a file there. On shared
    refs only ORCH fetches and adds or removes O1's own worktrees. Use `O1/scripts/o1/git.sh` for git calls that
    touch shared state (worktrees, refs). Never `gc`, `prune`, `repack`, `worktree prune`, branch deletes, or anything
    on a branch that is not `o1/*`. Files on the HOT LIST (`O1/docs/o1/HOT.txt`) are edited only after their branch
    is merged into main: the gate fails on any lane diff that touches one.
13. Tools. No agent calls any connector tool (`mcp__*` of Supabase, Vercel, Resend, Gmail, Google Drive, Notion,
    Figma, Canva or any other), the `supabase`, `vercel` or `gh` command line, or `git push` in any form. A Supabase,
    Vercel, Google or DNS action the run needs is a line in your report's "Owner actions" list; ORCH asks the owner.
14. Dependencies: no agent runs `pnpm install`, `add`, `remove` or `update`. A new dependency is a request to ORCH
    (`docs/o1/requests/<lane>.md`), who asks the owner. Use what `node_modules` already has.
15. Judgment, so the run never stalls on noise. Stop and ask (return `blocked`) only for: a production write, a
    secret, a visible change on kpopquiz.org, an SEO field change on kpopquiz.org, a failing security test, an owner
    gate, or a decision the documents mark as the owner's. Everything else: decide, write it in your report under
    "Decisions", continue.
16. Content pace: content lanes never run more than 2 review batches ahead of the owner's approvals recorded in
    `O1/docs/o1/LEDGER.md`.
17. Working System V2 inside run O1 (owner ratified, 16 October 2026). `CLAUDE.md` and the `verse-laws` skill apply,
    with these exceptions: the run's bus is `O1/docs/o1/`, never `docs/loop/` and never `docs/proofs/`; a blocker
    is the `blocked` status of your return value, never a file in `docs/loop/`; the 10-iteration budget applies per
    slice, then you return `blocked`; F0's contract stubs and fixtures, and mocks of a lane that is not merged yet,
    are contract artifacts (allowed: a later lane replaces them and R checks that none ships as a fake result);
    SQL on a local scratch cluster, on `o1-scratch`, and R-passed files on `o1-dev` through `migrate-dev.sh` is
    allowed, production SQL stays owner-run; the Play triple proof is satisfied by `parity.sh` plus R's UX runs at
    390 and 1440. Never use `graphify-out/` (it describes an old checkout). RATCHET LAW unchanged: never edit, weaken
    or delete an existing test or gate to go green.

## How a builder works

- Start every shell command with `cd <your worktree> &&` and pass your worktree as the path of every Grep and Glob.
  Never `cd` into `ROOT` or `O1` to write.
- Read the Progress block on top of your report (`<worktree>/docs/o1/reports/<lane>.md`). Do the next slice (about
  2 hours of work at most). Commit in small slices with plain messages (no dashes). Keep the report current:
  Progress block on top (done, tested how, deviations, requests, SQL files with their local cluster and
  `o1-scratch` output, owner actions), then Decisions, then Open points.
- Iterate with `tsc`, `vitest` and `next dev` (`scripts/o1/env.sh offline|scratch|dev -- pnpm --filter quiz exec next
  dev -p <your port>`; ports: `O1/docs/o1/ports.tsv`). Never run `next build`, `parity.sh` or `gate.sh`: the gate
  step does, and the evidence it writes is the only evidence a reviewer accepts.
- Your worktree has no `.env.local` and must never get one. `node_modules` are symlinks to O1's: never stage them.
- Return `ready` (head sha) when the done test, tsc and the unit tests are green and the worktree is clean;
  `progress` (head sha) when work remains; `blocked` with the reason (rule 15).
- Requests to another lane or to ORCH: `docs/o1/requests/<lane>.md` in your worktree, one numbered item each (file,
  change, why). A contract change is a CR request to ORCH (`BACKLOG.md` 5.2 says what can be extended).

## Run environment

- Tools: Node 25, pnpm 10, psql and pg_dump 18 at `/opt/homebrew/opt/postgresql@18/bin/`, Postgres 18 for local
  clusters (TCP on 127.0.0.1 with `unix_socket_directories=''`, `LC_ALL=en_US.UTF-8`: socket paths in the scratchpad
  are too long), Playwright browsers in `~/Library/Caches/ms-playwright/` (chromium 1234, 1243, 1248), `jq`, `tsx`
  (`O1/node_modules/.bin/tsx`; in a worktree `./node_modules/.bin/tsx` through the symlink).
- Hosts: sites run on `kpop.localhost`, `anime.localhost`, `hub.localhost` (cookies are per host). Browsers resolve
  these names; Node on macOS may not: server-side scripts connect to 127.0.0.1 with a Host header.
- Site of a build: `NEXT_PUBLIC_SITE_ID` = `kpop` (or unset), `anime`, `hub` (`SITE_ID` accepted as a server alias).
  Gate builds use `NEXT_PUBLIC_UX_V1=1` and `NEXT_PUBLIC_UX_V12=1`.
- Databases: `scripts/o1/env.sh offline` (unreachable Supabase, for builds and tests that must not touch a database)
  until the owner opens gate G1; then `scratch` and `dev`.
- `apps/quiz/package.json` and `apps/quiz/vercel.json` are on the HOT list: run new scripts with
  `./node_modules/.bin/tsx apps/quiz/scripts/o1/<x>.mts`; ORCH adds aliases when the file is free.
- New gate scripts live in `apps/quiz/scripts/o1/` (the repo hook blocks `apps/quiz/scripts/check-*.mts`).
