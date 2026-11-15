# KpopCards, lots 3 + 4 + 5 (one PR, the owner merges)

Branch `o1/cards3` (main 84187a3 with #230 merged, then lots 3, 4 and 5). Everything stays behind `NET_CARDS` and `PRIVATE_LAUNCH`; nothing is visible on bunnyverse.org or kpopquiz.org until the owner's go. Reference: the validated prototype `docs/design/cards/kpopcards-prototype-v6.html` (pixel for pixel) and its notes `docs/design/cards/kpopcards-v6-notes.html`.

## What changes
- **KpopCards**, a site inside Bunnyverse at `/kpopcards`: lobby, opening of 1 pack or 5, pack of the day, focus pack, golden pack, collection, card view, missions, ranking, player page, odds, help, credits, idol page. `/cards` and its sub-paths redirect permanently (308); the host `kpopcards.bunnyverse.org` is an alias of `bunnyverse.org/kpopcards`.
- **Lot 3, one edition, one photo**: 191 photos checked on Commons (licence, author, deletion requests, sha1, the age rule on each photo's date); editions open from the bottom; 2 photos to enter the packs; groups get the six editions. Returning groups: fromis_9 now, KARA and LOONA after the owner's review.
- **The catalog keeps growing after the first pack** (114): `cards_catalog_append()` adds the new editions and subjects after the last card number, with the rules of the build (one edition one photo, editions from the bottom, consecutive pair numbers, 2 photos to enter the packs); it never renumbers or deletes and never touches owned cards, packs or wallets; a second call adds 0. The admin's "Reconstruire le catalogue" stays until the first pack, then becomes "Ajouter au catalogue" with a preview (cards, subjects) before the confirmation.
- **The server decides everything**: one opening = one function in one transaction, the wallet locked, an idempotency key per request; the Gold guarantee by pack 30, a golden pack every 10th, themes, the pack of the day, the missing half, Open 5 counted pack by pack; stack of 10, 40 timer packs a Paris day; craft (no Full Art), sets, the week, level, ranking by completion, friends by one-time code, locks, recycling safeguards, the "still there?" check, rewarded ad = 25 shards, the Kpopdle win pack, and the quiz of the day pack (115, integrator rule of 2026-11-14 replacing decision 28): finishing the quiz of the day gives one pack a Paris day, inside the same cap of 3, decided in the database and idempotent; the hub's server records it itself.
- **Integrator decisions of 2026-11-14 on the screens**: the guest lobby is the prototype's layout with the guest banner, every personal block in its drawn empty state, no invented player, pull or number; halves as the prototype (the edition sort one by one, the number sort keeps pairs); the lock is a 44 px icon button next to the favorite (aria-pressed, "Lock this card" / "Unlock this card"), the same server protection; a pair is never split across two grid pages, and the pocket left empty is a plain one (no silhouette, no number).
- **Motion and sound**: the v6 opening, the Full Art and Gold moments, Reveal all with its spotlight, WebAudio sound and vibration (nothing before a gesture), reduced motion as 0.2 s fades, the lot 5 fluidity rules.
- **Lot 4 extras**: the guest demo pack attached at sign-in, web push "Notify me" with quiet hours (off), the hub PWA manifest and icons.
- **Daily games pictures (lot 3 part E)**: the Kpopdle photos script (owner-run), a designed fallback card instead of initials, the owner's private preview of the non-free Otakudle images and the button that deletes them (a narrow server-side selection): the selected rows, then their files in the bucket entity-images (main, 2x, 96 px; a file another row still uses is kept), then the orphan files of the import window. The same private preview lists the series rows that remain (picture, slug, licence, verified or not, source host), read only, for the owner to check.
- **Hub**: the Daily games tab on every hub page.

## SQL, in this order (after a backup, never between 23:50 and 00:30 UTC; each file is one DO block with its `-- Verify:` lines and a rollback)
Raw links (live once the branch is pushed): `https://raw.githubusercontent.com/P-Mingi/KpopQuizzV2/o1/cards3/docs/pending-migrations/cards/<file>`.
The order is closed: a read-only check of production on 2026-11-14 (integrator) found no `part` column in `cards_catalog` and 0 row of 099, so 099 and 102 are not applied; 001 to 003 and 101 are.
1. `099-idols-members.sql`: the members of the card subjects that had none (lot 2). Verify (4): the count equals the "N rows added" notice; one line per subject with an added notice; 0 active row without needs_review; 0 row of this file in Kpopdle.
2. `102-catalog-rebuild.sql`: the age rule and the group pairs (lot 2). Verify (6): 0 cards owned; the parts as in the notice; 1, N, N (contiguous); 0 pair with non-consecutive numbers; 0 subject the age rule leaves out; exactly the slugs of the "left out" notices.
3. `099b-idols-returning.sql`: the members of fromis_9, KARA and LOONA, only where the group has no active member, out of Kpopdle. Verify (3): the "N rows added" notice; 0 active row without needs_review; one line per group added.
4. `103-catalog-photos.sql`: the catalog with one photo per edition, `cards_build_catalog()`, the files trigger. Verify (7): 0 cards owned; numbers 1 to N contiguous; 0 photo on two editions; 0 card on a photo that is not live; 0 subject with fewer than 2 editions; 0 pair with non-consecutive numbers; photo statuses as in the notice (147 approved or auto, 44 to review).
5. `104-economy.sql`: the guarantee, the missing half, the timer refills, craft, wishlist, focus, ad shards, the moment columns. Verify (9): its 7 functions and one each of `cards_roll`, `cards_wallet`, `cards_apply_pack`; nothing executable by anon or authenticated; RLS on the new tables, no browser grant; the 5 new columns; an empty wallet shows 40 timer packs left and 30 to the guarantee; nothing backfilled.
6. `105-goals.sql`: sets and the week, the ledgers. Verify (7): 5, f, 4, 0, t, the week start 2026-11-09, 0 claimed right after the run.
7. `106-demo.sql`: the guest demo claim. Verify (6): 1, t, 0, t, f, 0.
8. `107-prefs.sql`: sound, vibration and the other preferences. Verify (5): 2, 1, 0, f, all.
9. `108-push.sql`: web push subscriptions (unused while NET_CARDS_PUSH is off). Verify (8): 1 table, RLS t, 0 browser grant, 0 policy, 5 functions, none for anon or authenticated, all for service_role, 0 rows.
10. `110-core.sql`: stack of 10, themes, pack of the day, `cards_open` (1 or 5 packs, one transaction, idempotency key), locks, recycle, craft, ad grant, the audit table. Verify (7): 10, each 1, 0, f, 1, 10, 0.
11. `111-group-types.sql`: girl or boy for 41 groups (two agreeing sources each). Verify (3): boy 16, girl 24, mixed 1; 0; 0.
12. `112-social.sql`: friends by one-time code, ranking by completion, player pages. Verify (4): 7, f, 2, 0.
13. `113-moment.sql`: the moment of a card. Verify (3): 1, 1, f.
14. `114-catalog-append.sql`: `cards_catalog_append(p_dry_run boolean default true)`, a preview by default, a write only with `false`. Verify (6): 1 function; f (anon, authenticated); t (service_role); t (security definer, search_path public); the preview answers `"dry_run": true` and writes nothing (0 cards while no photo waits); 1, N, N, the same as after 103 (the file itself adds no card).
15. `115-quiz-of-day-bonus.sql`: the quiz of the day pack. Verify (7): the source check lists 'quiz', 'kpopdle' and 'quiz_of_day'; 1 index (one row a Paris day, even in parallel); 2 functions (`cards_bonus_record` replaced, `cards_bonus_sync`); f (anon, authenticated); t (service_role); t (security definer, search_path public); t (the `cards_bonus_record` in place reads the quiz of the day). Every Verify line is read only: none calls a function.
Each file's header holds the exact queries next to these expected values.

## Flags and env (hub project; the values advised at launch)
| Name | At launch | What it does |
|---|---|---|
| `NET_CARDS` | 1 | KpopCards pages and API; off, everything answers 404 |
| `PRIVATE_LAUNCH` | 1 until the owner's go | only the allowed accounts see the hub |
| `NET_CARDS_BRIDGES` | 1 | the Kpopdle win pack, the quiz of the day pack and the kpopquiz.org blocks |
| `CARDS_BONUS_PER_DAY` | 3 | bonus packs a Paris day, Kpopdle wins and the quiz of the day together |
| `CARDS_TIMER_PER_DAY` | 40 | timer packs a Paris day |
| `CARDS_ADS_PER_DAY` | 10 | rewarded ads a Paris day |
| `CARDS_AD_SHARDS` | 25 | shards an ad gives |
| `NET_CARDS_ADS`, `NEXT_PUBLIC_NET_CARDS_ADS` | 0 | the rewarded ad, until the ad layer and the consent banner are ready |
| `CARDS_DEMO_SECRET` | a random 32-character secret | the guest demo pack (none without it) |
| `NET_CARDS_PUSH`, `NEXT_PUBLIC_NET_CARDS_PUSH` | 0 | Notify me (web push), until the keys below exist |
| `CARDS_VAPID_PUBLIC_KEY`, `NEXT_PUBLIC_CARDS_VAPID_PUBLIC_KEY`, `CARDS_VAPID_PRIVATE_KEY`, `CARDS_VAPID_SUBJECT` | from `node apps/quiz/scripts/cards/vapid-keys.mjs` | the push keys (only if push is wanted) |
| `ADMIN_USER_IDS` | the owner's id | the admin, and the owner's private preview of the non-free Otakudle images (with PRIVATE_LAUNCH=1) |
| `CARDS_UI_FIXTURE`, `CARDS_UI_FIXTURE_FULL` | never set in production | development fixture only |
The cron `/api/cron/cards-push` (every 10 minutes) is in vercel.json; it answers 404 while NET_CARDS_PUSH is off.
`NET_CARDS` must be set before the deployment is built: the static KpopCards pages (missions, ranking, odds, help, credits, report) read it at build time, so turning it on means a redeploy.

## Checks
- **tsc** green. **Full unit suite**, the CI command (`cd apps/quiz && pnpm run test:unit`, Node 22.20.0), twice on the final head: 595 of 595 files, 11,119 of 11,119 tests, 0 failed, 0 skipped, no worker error, in 682 s and 723 s. The cause of the earlier load failures (34 tests in 18 files, each green alone): the 5 s default is wall-clock time, and at full width the database files (PGlite, real Postgres clusters, the 100,000-pack simulations) starved the tree-scan tests, which read the whole of src in every `it`. The fix: two projects in one command (light at 4 workers, then the 44 database and simulation files at 2), a per-file memo of read-only reads under src for the scanners (emptied by any write; every test checks the same files with the same rule), and an explicit timeout on the 12 tests measured above the line only (listed below); every other test keeps the 5 s default.
- **Builds**: hub (NET_CARDS on and off) and kpop (the parity head build) green.
- **Production server** (`next start`, hub build, offline): every /kpopcards page answers (200); `/cards`, `/cards/binder?x=1` and `/cards/c/<num>` answer 308 to the same place under /kpopcards with the query kept; `kpopcards.bunnyverse.org/` and `/help?a=1` answer 308 to `bunnyverse.org/kpopcards` and `/kpopcards/help?a=1`. This check found that an empty generateStaticParams under the `[site]` layout answers 404 (NoFallbackError) on a production server although a dev server answers 200: the six open-ended pages now render per request (as `u/[username]`). Offline there is no catalog, so the pages show their "not available right now" fallback; a real card rendered by a production server needs the database.
- **Parity on kpopquiz.org** (60 URLs, base 84187a3, head 762da7e): 58 identical; /groups and /bts-quiz differ only in the numbering of streamed rows (the same rows in another order), which a control run of two builds of the same tree (84187a3 against b936fc6, same tree) also shows on /groups. No stylesheet, markup or status difference; no refused write fails. A first run had found one real difference (a Tailwind utility `.inline-grid` added to kpopquiz.org's shared stylesheet by a word in the Daily games badge): fixed in f77ef99.
- **Visual comparison with the v6 prototype** (Playwright, target at most 1% of pixels different and every key box within 2 px; photos, idol names and the photo credit text masked on both sides): 37 of 42 signed-in shots within target; the 5 others are the grid at 3 sizes (accepted gap, below) and the card view's credit box at 1440 and 1366 (below).

| Screen | 1440x860 | 1366x657 | 390x664 |
|---|---|---|---|
| Lobby | 0.14% | 0.15% | 0.25% |
| Collection, binder | 0.20% | 0.21% | 0.29% |
| Collection, grid | 1.42% (pager 3.5 px wider) | 1.50% (same) | 1.55% |
| Collection, filters | 0.21% | 0.21% | 0.24% |
| Card view | 0.33% | 0.49% | 0.10% |
| Missions | 0.09% | 0.10% | 0.06% |
| Ranking, friends | 0.30% | 0.31% | 0.43% |
| Ranking, everyone | 0.24% | 0.25% | 0.37% |
| Help | 0.07% | 0.08% | 0.06% |
| Bell | 0.05% | 0.06% | 0.17% |
| Avatar menu | 0.01% | 0.01% | 0.00% |
| Opening, pack | 0.21% | 0.26% | 0.91% |
| Opening, first card | 0.13% | 0.14% | 0.48% |
| Opening, summary | 0.07% | 0.09% | 0.01% |
| Guest lobby (against the prototype's empty state with the guest view on) | 1.13%, 0 box off | 1.20%, 0 box off | 2.18%, 0 box off |

  - The grid's remaining gap is accepted (integrator 2026-11-14): a pair is never split across two grid pages, so a page cut short ends on a plain empty pocket where the prototype shows a card, and the pager has 13 pages against 12 (3.5 px wider).
  - Card view: the lock button has no counterpart in the prototype, so the harness leaves it out of the card-view box list (integrator lock decision); the credit line is masked like the names (the prototype's photos and credits are examples) and its box is still checked: 18.8 px off at 1440 and 1366 (the real credit runs one line longer). Without these two harness changes: 0.63%, 0.86%, 1.49%.
  - Guest lobby: every key box within 2 px; the pixels left are the "-" a guest sees where the prototype prints a player's own counts (pills, level, stack, shards). Against the old reference (the prototype's example player with the guest view on): 17.9%, 18.9%, 28.3%.
- **Opening**: fits all 13 sizes (320x568 to 1920x1080); no horizontal overflow from 360 to 1920 px; the flip never shows the back through the front on Chromium, Firefox and WebKit; reduced motion as 0.2 s fades. **Frames per second**, CPU 4x slower, Full Art opening: 59.5 (390x664) and 58.7 (1366x657), prototype 59.9 and 60.0, target 45.
- **Journeys** 15 of 16 on the final head (craft is skipped in the example state: 34 shards, the cheapest craft costs 50, as in the prototype; crafting after an ad works by hand). **Accessibility** 15 of 15: every target 44 px or more, names and focus rings on every page, the lock button's aria-pressed, at 390 and 1366. The card view flip passes on Chromium.
- **Concurrency on a real Postgres** (throwaway cluster, the real SQL files, parallel psql sessions on one account): 10 openings in parallel on a stack of 10 give exactly 10 packs, one pack number each, no extra card; 14 on a stack of 10 give 10 packs and 4 refusals, the stack stops at 0; the same idempotency key fired 8 times at once gives one pack and the same answer; 3 Open 5 on a stack of 10 give 2 and 1 refusal, pack numbers 1 to 10 once each; the Gold guarantee fires once, on the 30th pack, whatever the order; two recycles never pay one extra copy twice. 13 of 13.
- **Simulation**: 100,000 packs per theme (all, girls, boys, solo) through the server's own draw, golden every 10th pack and the guarantee counted pack by pack: every printed rate within 5 standard deviations; every golden card 5 Holo or better; the longest run without Gold or Full Art is 29 in each theme (902 to 959 guarantee packs).

## Exact expected values changed (each because a rule or the prototype requires it; none weakened)
- `rules.test.ts`: 5 lock sentences become 7 (`photo`, `size`): owner decision "one edition, one photo".
- `ui-catalog.test.ts`: a group's editions C, U, R, UR become all six: the same decision.
- `cards-ui.test.ts`, `cards-pairs.test.ts`, `cards-lot3-ui.test.ts`: Common, Uncommon, Rare, Super Rare, Ultra Rare, Legendary become Standard, Stage, Holo, Era, Gold, Full Art (one name per rarity, owner-validated); the card markup, the 30 px band, the hint text, the Help list and the CSS checks follow the v6 prototype; the FAQ's Gold sentence says card 5 of pack 30 (lot 4 A11 as built).
- `cards-pairs.test.ts`: a locked group edition shows two pockets (`SR, SR, L, L`), the pair block becomes the "See half 2/2" button, and the edition sort orders halves one at a time (the v6 prototype; lot 2 kept pairs together, the number sort still does).
- `cards-opening-css.test.ts` (new): the reduced-motion and spotlight checks moved from `cards-lot3-ui.test.ts`, written against the v6 values (opacity 0.32, scale 1.15).
- `cards.routes.test.ts`: rewritten for the KpopCards contract (164 tests): the open answer, the ad grant gives 25 shards (lot 4 B4), the new state fields.
- `catalog-sql.test.ts`: the list of cards SQL files gains 099b, 103 to 108 and 110 to 113.
- `routing.test.ts`: the cards pages are under /kpopcards (with /kpopcards/help and /kpopcards/credits); the hub's redirects are no longer empty but the four host-alias rules of kpopcards.bunnyverse.org (integrator 2026-11-13); the hub-only /sw.js rewrite and the hub's own PWA icons (lot 4 B6).
- `kpop-icons.test.ts`: the hub manifest hash changes (the PWA manifest, lot 4 B6).
- `nav-hub.test.ts`: the hub's tabs gain Daily games while the Burrow is open (owner request 2026-11-13).
- `admin-lock.refusal.test.ts`, `admin-lock.static.test.ts`: 48 admin routes become 51 (the non-free images button and the owner's private preview, lot 3 part E).
- `cards-bridge.test.ts`: the sign-in return goes to `/kpopcards`; `cards-layout.test.ts`: the layout path and the title KpopCards; `ui-fixture-guard.test.ts`: the mock's path.
- `cards-layout.test.ts`: the font import line names DM_Sans, the root carries a third variable, and two checks are added (DM Sans with its optical size axis, the `--f-ui` token): the prototype's interface face. The font mock of `cards-layout`, `cards-lot3-ui`, `cards-pairs` and `cards-ui` gains that variable.
- `kc-dynamic.test.ts` (written in this lot): its rule "an empty generateStaticParams" is what a production server answers 404; it now requires per-request rendering for open-ended values, or the finite list with the site param (the themes), and refuses an empty list.
- The QA harness (`e2e/o1/CARDS/kpopcards/helpers/diff.ts`, new in this lot) measures the boxes at rest, as its screenshots already are.
- The QA harness, after the integrator decisions of 2026-11-14: the card-view box list is `.sheet button:not(#d-lock)` (the lock button has no counterpart in the prototype) and gains `.credit`; the credit text is masked on both sides like the names (`freeze.ts`); a new screen `lobby-guest-empty` (the prototype's empty state with the guest view on, its controls panel closed) is added beside `lobby-guest`, which is kept.
- `catalog-sql.test.ts`: the list of cards SQL files gains 114 and 115.
- `sql-quiz-bonus.test.ts` (written in this lot): the last Verify line of 115 called `cards_bonus_sync`, which writes through `cards_bonus_record`; it is now a read-only check of the function in place (integrator rule of 2026-11-15), and a new check requires that no Verify line of 115 calls a function.
- `cards.routes.test.ts`: the server records the bonus packs first, so the first calls are `cards_bonus_sync` then `cards_player` (was `cards_player`), the timer check reads the `cards_player` call, a bonus opening calls `cards_bonus_sync` then `cards_open` (was `cards_bonus_record`), and the lobby's `bridges.quizOfDay` is `{ enabled: true, done }` (was `enabled: false` with the decision 28 reason); `mock-api.test.ts` likewise: the integrator's quiz of the day rule.
- `cards-bridge.test.ts`: two test titles that said a quiz earns nothing are reworded, assertions unchanged.
- `lobby-guest.test.ts` (written in this lot) follows the guest layout of the integrator's rule.
- Timeouts (the integrator's rule: an explicit timeout only for the tests that need one, measured): `lib/dle/bank.test.ts` 120 s to 600 s (121.6 s on an idle machine, so it failed alone); 30 s (default 5 s) for `lib/daily-bank/lot3-sql.test.ts` (measured 4.3 s), `components/o1-o2-seam.test.ts` (2.9 s), `lib/hidden-cover.test.ts` (3.1 s), `lib/anime/series-images.test.ts` (2.5 s), `lib/seo/contact-email.test.ts` (3.2 s), `lib/site/mailbox.test.ts` (4.2 s), `lib/site/registry.test.ts` (3.6 s), `app/(site)/legal/legal.test.ts` (3.6 s), `lib/ux-v1/a0/site-avatar.test.ts` (5.0 s), and the top bar test of `app/sites/[site]/home-hub.test.ts` (5.0 s once); 15 s for `lib/cards/rules.test.ts` (2.6 s). No test is skipped, removed or narrowed.

## For the owner
See the final report: the SQL above in order, the files script (`publish-card-files.mjs`, preview then `--publish`), **the review of the 44 photos waiting in the admin "À relire" then "Reconstruire le catalogue", BEFORE any real pack is opened** (after the first pack only "Ajouter au catalogue" remains), the Kpopdle photos script, the env, the domain `kpopcards.bunnyverse.org`, and the non-free images (then a look at the series rows the private preview lists).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
