# C3 issues, loop 2 re-check (feat/ux-v1-v11 cc6c394, flag on, :3021)

| Id | Owner | Loop 2 verdict | Evidence |
|---|---|---|---|
| C3-001 | P3 | FIXED. Every quiz of the hub is a visible `<a>` in the server HTML (the rest of the list sits in a native `<details>`, no `<noscript>` list left): visible quiz links flag off -> on: BLACKPINK 18 -> 27, ATEEZ 15 -> 23, BTS 18 -> 30, Stray Kids 18 -> 32, TWICE 15 -> 17; 0 flag-off visible link missing. p3.spec 19/19 at both widths | `evidence/p3-hub-links-loop2.txt`, `seo-loop2/SUMMARY.md` |
| C3-002 | P3 | FIXED in code, not fault-injected. lib/ux-v1/p3/reads.ts: a failed read throws at request time (Next keeps the last good page) and a degraded build render gets a 60 s revalidate; unit tests in p3.test.ts. The cc6c394 build prerendered /groups complete ("44 groups", generation line, revalidate 3600) | `build-cache-state.mjs` output below, `seo-loop2/SUMMARY.md` |
| C3-003 | P1 | FIXED in code, not fault-injected. lib/ux-v1/p1/render-health.ts: a render that lost a read throws at runtime regeneration (the last complete page stays) and lowers its own revalidate to 30 s at build; unit tests in p1.test.ts. The cc6c394 build prerendered / complete (19 hub links, quiz of the day, groups rail; revalidate 600) | `build-cache-state.mjs` output below |
| C3-004 | P4 | FIXED. With the mount read delayed 4 s, the count stays 44 after the click (loop 1: fell back to 43); p4.spec "like" passed first time at both widths (loop 1: flaky) | `evidence/p4-like-race-loop2.txt`, `e2e-loop2.md` |
| C3-005 | P5 | FIXED. The cover helper sentence is back in the flag-on /create server HTML (no lost text vs flag off) | `seo-loop2/SUMMARY.md` (row /create) |
| C3-006 | P1 | FIXED. The Verse strip sentence is in the flag-on home (no lost text vs flag off) | `seo-loop2/SUMMARY.md` (row /) |
| C3-007 | P8 | FIXED. The community feed tab panel shows the focus ring (keyboard walk: 0 stops without an indicator at 1440 and 390) | `QA-A11Y-loop2.md`, `results-loop2/qa-keyboard.jsonl` |
| C3-008 | P1 | FIXED. The rail photos are fixed 80 x 80 images with a 1x / 2x srcset: served 220 px for 240 px needed at DPR 3 (loop 1: 640 px); home image bytes 908 -> 495 KB (slow 4G run) | `perf/SUMMARY-loop2.md`, `perf/perf-loop2-on-gzip.json` |
| C3-009 | P6 | FIXED in code. readTodayPlayers throws on a read error or a missing count (never cached as 0); unit tests in hub-data.test.ts | apps/quiz/src/lib/ux-v1/p6/hub-data.ts |

`node checks/qa/build-cache-state.mjs .worktrees/ux11-integration/apps/quiz/.next` (the cc6c394 build served on :3021):

```
/: revalidate 600 | hub links 19 | daily=quiz 2 | "All 90 groups" 2
/groups: revalidate 3600 | hub links 90 | groups intro 44
/blindtest: revalidate 3600
```

## New in loop 2 (not issues, noted for the owner)

- Link set: the flag-on home drops /verse/blackpink, /verse/seventeen, /verse/stray-kids and the hubs drop
  /verse/blackpink and /verse/ateez. These are parked Verse spaces: 404 on both local builds, 302 to /verse on
  kpopquiz.org. The flag-off pages (and the live hubs) link these dead doors; the v11 pages now link a Verse space
  only when it is open (C2-006 fix). /verse/bts and /verse are kept. A lost link to a dead door, listed for the
  owner's review.
- Home CLS 0.054 (loop 1: 0 to 0.055 depending on timing): a section heading moves at about 0.9 s when a client
  island fills in. Under the 0.1 "good" line and below today's home (0.05 to 0.07).
