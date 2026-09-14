# Games hub, test output (all on next build + next start, never dev)

## Server under test
```
Command: npx next start -p 3021   (after: npm run build)
START CMD: npx next start -p 3021
▲ Next.js 16.2.1
- Local:         http://localhost:3021
- Network:       http://192.168.1.43:3021
Ready in 287ms
```
The pixel captures and the e2e run both hit this server. The full mobile page
capture (pixel/render-390-fullpage-no-dev-badge.png) ends in the site footer with
no Next.js dev badge, confirming the build-and-start origin.

## Unit (vitest run, full suite)
```
 Test Files  10 passed (10)
      Tests  80 passed (80)
```
Games-hub unit files: hub-filters.test.ts, daily-rotation.test.ts, reset-countdown.test.ts (17 tests).

## e2e (playwright, desktop + mobile, vs next start :3021)
```
  PASS   1 [desktop] › e2e/games-hub.spec.ts:30:3 › games hub › renders all eight game cards in the server HTML (782ms)
  PASS   2 [desktop] › e2e/games-hub.spec.ts:38:3 › games hub › every idol face is a real image that loaded (naturalWidth > 0) (656ms)
  PASS   3 [desktop] › e2e/games-hub.spec.ts:51:3 › games hub › daily band CTA links to the blind test (647ms)
  PASS   4 [desktop] › e2e/games-hub.spec.ts:56:3 › games hub › Tier Lists card links to the tier-list maker and shows the New badge (641ms)
  PASS   5 [desktop] › e2e/games-hub.spec.ts:63:3 › games hub › K-pop Idle card is a dead-button-free "coming soon" (no link) (658ms)
  PASS   6 [desktop] › e2e/games-hub.spec.ts:70:3 › games hub › filter chips reveal exactly their set and All restores all eight (920ms)
  PASS   7 [desktop] › e2e/games-hub.spec.ts:85:3 › games hub › no emoji anywhere in the hub (611ms)
  PASS   8 [desktop] › e2e/games-hub.spec.ts:93:3 › games hub › /pt/games renders the same eight cards (669ms)
  -   9 [desktop] › e2e/games-hub.spec.ts:101:3 › games hub mobile › no horizontal overflow at 390 (mobile artboard width)
  -  10 [desktop] › e2e/games-hub.spec.ts:112:3 › games hub mobile › foot stats stay one line and never overlap the CTA at 390
  PASS  11 [mobile] › e2e/games-hub.spec.ts:30:3 › games hub › renders all eight game cards in the server HTML (725ms)
  PASS  12 [mobile] › e2e/games-hub.spec.ts:38:3 › games hub › every idol face is a real image that loaded (naturalWidth > 0) (584ms)
  PASS  13 [mobile] › e2e/games-hub.spec.ts:51:3 › games hub › daily band CTA links to the blind test (595ms)
  PASS  14 [mobile] › e2e/games-hub.spec.ts:56:3 › games hub › Tier Lists card links to the tier-list maker and shows the New badge (623ms)
  PASS  15 [mobile] › e2e/games-hub.spec.ts:63:3 › games hub › K-pop Idle card is a dead-button-free "coming soon" (no link) (596ms)
  PASS  16 [mobile] › e2e/games-hub.spec.ts:70:3 › games hub › filter chips reveal exactly their set and All restores all eight (901ms)
  PASS  17 [mobile] › e2e/games-hub.spec.ts:85:3 › games hub › no emoji anywhere in the hub (618ms)
  PASS  18 [mobile] › e2e/games-hub.spec.ts:93:3 › games hub › /pt/games renders the same eight cards (647ms)
  PASS  19 [mobile] › e2e/games-hub.spec.ts:101:3 › games hub mobile › no horizontal overflow at 390 (mobile artboard width) (634ms)
  PASS  20 [mobile] › e2e/games-hub.spec.ts:112:3 › games hub mobile › foot stats stay one line and never overlap the CTA at 390 (637ms)
  2 skipped
  18 passed (14.8s)
```
## Typecheck / build
```
tsc --noEmit source errors: 0
Route allowlist guard passed: 378 page routes reachable.
Verse token gate passed: no raw hex colors in Verse surfaces.
[check:env] OK - NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY present (environment: local).
Compiled successfully in 10.5s
/games and /pt/games: Static (o), Revalidate 1h
```
