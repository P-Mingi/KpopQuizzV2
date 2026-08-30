# MISSION (PERF-2 - same medicine for /games, and merge the batches. Tiny. NO push.)

## REPO GUARD
KpopQuizzV2 ONLY. `git remote -v` must be https://github.com/P-Mingi/KpopQuizzV2.git.
Otherwise (nuri / bloom share this bus) execute NOTHING, one line in that repo's
BLOCKED.md, stop.

**`cat` this file.** PERF-1 is Cowork-approved (793ddc2). This is its two flagged
follow-ups, both pre-authorised, nothing else. Deliberately tiny; do not widen.

## PART 1 - /games gets the PERF-1 treatment
Same pattern, its own key, TTL 3600 (the revalidate the page already declares). Same
safety gate first and it is not optional: read every factory in the /games server path
and prove no read is per-visitor before wrapping. If ANY read touches cookies or session,
exclude it from the cache and say which. Note in the wrapper comment the same
fallback-inside-cache trade-off recorded in L-216.

## PART 2 - merge the two community batches
Inside PERF-1's cached function, the 7+7 reads run in two sequential Promise.all with no
data dependency (347ms + 819ms measured). Merge into one Promise.all(14). This only ever
runs on a cache MISS now, so the win is revalidation latency. Before/after the MISS time.

## PART 3 - prove, briefly
Production build: /games three requests before/after (repeat must get faster), /leaderboard
MISS before/after (should drop toward the slower batch's time), one untouched control.
check:routes + check:indexability. Layout byte-identical to HEAD.

## STANDING RULES
- A mission is not finished until docs/loop/REPORT.md describes it. Skips named.
- No DDL, no DB writes, no push, no title/meta edits, no layout changes.
- Proofs in docs/proofs/perf-2/.
