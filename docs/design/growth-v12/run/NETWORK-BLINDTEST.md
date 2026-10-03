# Network check of /blindtest and /pt/blindtest, both flags off (owner decision 23, 2026-10-03)

Question from the owner: the one extra script on `/blindtest` and `/pt/blindtest` (flags off) is accepted on condition
that it makes no network request. Method: production builds of `feat/v12` (3e1779e, app code of 429bd83) and
`origin/main` (a94d77c), both with `NEXT_PUBLIC_UX_V1`, `NEXT_PUBLIC_UX_V12`, `NEXT_PUBLIC_BT_TRACKING` unset, served
at the same time on :3073 and :3074. Headless Chromium 1440x900 loads each page, waits for network idle and 4 s,
then clicks Play and waits 6 s (a run starts on both builds). Every request is recorded; any non-GET is answered
locally (204) so nothing is written. Requests are compared after replacing hashed chunk names, image keys and RSC
query ids. Script: `run/checks/qa/network/net-check.mjs`. Three runs.

Result: no request comes from the extra chunk. On both pages, in all three runs, the only stable difference is the
GET of that chunk itself (19 vs 18 on `/blindtest`, 22 vs 21 on `/pt/blindtest`). Zero requests to `/api/track` on
either build; the only non-GET on both builds is the same `POST /api/blind-test/generate` of the run. The counts of
RSC prefetches of `/`, `/blindtest` and `/login` move between runs in both directions (link prefetch timing), so they
are not attributed to the build.

## Run 1
### /blindtest
played: feat/v12 true, origin/main true
requests: feat/v12 53, origin/main 52
non-GET requests: feat/v12 1, origin/main 1
  feat/v12 POST http://localhost:3073/api/blind-test/generate
  origin/main POST http://localhost:3074/api/blind-test/generate
requests to /api/track: feat/v12 0, origin/main 0
differences (normalized request, feat/v12 count, origin/main count):
  GET /_next/static/chunks/<chunk> | 19 | 18
  GET /blindtest | 5 | 4
  GET /login | 5 | 6

### /pt/blindtest
played: feat/v12 true, origin/main true
requests: feat/v12 62, origin/main 61
non-GET requests: feat/v12 1, origin/main 1
  feat/v12 POST http://localhost:3073/api/blind-test/generate
  origin/main POST http://localhost:3074/api/blind-test/generate
requests to /api/track: feat/v12 0, origin/main 0
differences (normalized request, feat/v12 count, origin/main count):
  GET /_next/static/chunks/<chunk> | 22 | 21

## Run 2
### /blindtest
played: feat/v12 true, origin/main true
requests: feat/v12 53, origin/main 52
non-GET requests: feat/v12 1, origin/main 1
  feat/v12 POST http://localhost:3073/api/blind-test/generate
  origin/main POST http://localhost:3074/api/blind-test/generate
requests to /api/track: feat/v12 0, origin/main 0
differences (normalized request, feat/v12 count, origin/main count):
  GET /_next/static/chunks/<chunk> | 19 | 18

### /pt/blindtest
played: feat/v12 true, origin/main true
requests: feat/v12 62, origin/main 61
non-GET requests: feat/v12 1, origin/main 1
  feat/v12 POST http://localhost:3073/api/blind-test/generate
  origin/main POST http://localhost:3074/api/blind-test/generate
requests to /api/track: feat/v12 0, origin/main 0
differences (normalized request, feat/v12 count, origin/main count):
  GET / | 6 | 4
  GET /_next/static/chunks/<chunk> | 22 | 21
  GET /login | 4 | 6

## Run 3
### /blindtest
played: feat/v12 true, origin/main true
requests: feat/v12 53, origin/main 52
non-GET requests: feat/v12 1, origin/main 1
  feat/v12 POST http://localhost:3073/api/blind-test/generate
  origin/main POST http://localhost:3074/api/blind-test/generate
requests to /api/track: feat/v12 0, origin/main 0
differences (normalized request, feat/v12 count, origin/main count):
  GET /_next/static/chunks/<chunk> | 19 | 18

### /pt/blindtest
played: feat/v12 true, origin/main true
requests: feat/v12 62, origin/main 61
non-GET requests: feat/v12 1, origin/main 1
  feat/v12 POST http://localhost:3073/api/blind-test/generate
  origin/main POST http://localhost:3074/api/blind-test/generate
requests to /api/track: feat/v12 0, origin/main 0
differences (normalized request, feat/v12 count, origin/main count):
  GET /_next/static/chunks/<chunk> | 22 | 21
