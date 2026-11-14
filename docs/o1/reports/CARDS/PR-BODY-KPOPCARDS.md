# KpopCards, lots 3 + 4 + 5 (one PR, the owner merges)

Branch `o1/cards3` (main 84187a3 with #230 merged, then lots 3, 4 and 5). Everything stays behind `NET_CARDS` and `PRIVATE_LAUNCH`; nothing is visible on bunnyverse.org or kpopquiz.org until the owner's go. Reference: the validated prototype `docs/design/cards/kpopcards-prototype-v6.html` (pixel for pixel) and its notes `docs/design/cards/kpopcards-v6-notes.html`.

## What changes
- **KpopCards**, a site inside Bunnyverse at `/kpopcards`: lobby, opening of 1 pack or 5, pack of the day, focus pack, golden pack, collection, card view, missions, ranking, player page, odds, help, credits, idol page. `/cards` and its sub-paths redirect permanently (308); the host `kpopcards.bunnyverse.org` is an alias of `bunnyverse.org/kpopcards`.
- **Lot 3, one edition, one photo**: 191 photos checked on Commons (licence, author, deletion requests, sha1, the age rule on each photo's date); editions open from the bottom; 2 photos to enter the packs; groups get the six editions. Returning groups: fromis_9 now, KARA and LOONA after the owner's review.
- **The server decides everything**: one opening = one function in one transaction, the wallet locked, an idempotency key per request; the Gold guarantee by pack 30, a golden pack every 10th, themes, the pack of the day, the missing half, Open 5 counted pack by pack; stack of 10, 40 timer packs a Paris day; craft (no Full Art), sets, the week, level, ranking by completion, friends by one-time code, locks, recycling safeguards, the "still there?" check, rewarded ad = 25 shards, the Kpopdle win pack. The quiz of the day grants no pack (decision 28: its result is a score the browser reports).
- **Motion and sound**: the v6 opening, the Full Art and Gold moments, Reveal all with its spotlight, WebAudio sound and vibration (nothing before a gesture), reduced motion as 0.2 s fades, the lot 5 fluidity rules.
- **Lot 4 extras**: the guest demo pack attached at sign-in, web push "Notify me" with quiet hours (off), the hub PWA manifest and icons.
- **Daily games pictures (lot 3 part E)**: the Kpopdle photos script (owner-run), a designed fallback card instead of initials, the owner's private preview of the non-free Otakudle images and the button that deletes them (a narrow server-side selection).
- **Hub**: the Daily games tab on every hub page.

## SQL, in this order (after a backup, never between 23:50 and 00:30 UTC; each file is one DO block with its `-- Verify:` lines and a rollback)
Raw links (live once the branch is pushed): `https://raw.githubusercontent.com/P-Mingi/KpopQuizzV2/o1/cards3/docs/pending-migrations/cards/<file>`.
0. `099-idols-members.sql` and `102-catalog-rebuild.sql` only if they are not applied yet (lot 2).
1. `099b-idols-returning.sql`: the members of fromis_9, KARA and LOONA, only where the group has no active member, out of Kpopdle. Verify (3): the "N rows added" notice; 0 active row without needs_review; one line per group added.
2. `103-catalog-photos.sql`: the catalog with one photo per edition, `cards_build_catalog()`, the files trigger. Verify (7): 0 cards owned; numbers 1 to N contiguous; 0 photo on two editions; 0 card on a photo that is not live; 0 subject with fewer than 2 editions; 0 pair with non-consecutive numbers; photo statuses as in the notice (147 approved or auto, 44 to review).
3. `104-economy.sql`: the guarantee, the missing half, the timer refills, craft, wishlist, focus, ad shards, the moment columns. Verify (9): its 7 functions and one each of `cards_roll`, `cards_wallet`, `cards_apply_pack`; nothing executable by anon or authenticated; RLS on the new tables, no browser grant; the 5 new columns; an empty wallet shows 40 timer packs left and 30 to the guarantee; nothing backfilled.
4. `105-goals.sql`: sets and the week, the ledgers. Verify (7): 5, f, 4, 0, t, the week start 2026-11-09, 0 claimed right after the run.
5. `106-demo.sql`: the guest demo claim. Verify (6): 1, t, 0, t, f, 0.
6. `107-prefs.sql`: sound, vibration and the other preferences. Verify (5): 2, 1, 0, f, all.
7. `108-push.sql`: web push subscriptions (unused while NET_CARDS_PUSH is off). Verify (8): 1 table, RLS t, 0 browser grant, 0 policy, 5 functions, none for anon or authenticated, all for service_role, 0 rows.
8. `110-core.sql`: stack of 10, themes, pack of the day, `cards_open` (1 or 5 packs, one transaction, idempotency key), locks, recycle, craft, ad grant, the audit table. Verify (7): 10, each 1, 0, f, 1, 10, 0.
9. `111-group-types.sql`: girl or boy for 41 groups (two agreeing sources each). Verify (3): boy 16, girl 24, mixed 1; 0; 0.
10. `112-social.sql`: friends by one-time code, ranking by completion, player pages. Verify (4): 7, f, 2, 0.
11. `113-moment.sql`: the moment of a card. Verify (3): 1, 1, f.
Each file's header holds the exact queries next to these expected values.

## Flags and env (hub project; the values advised at launch)
| Name | At launch | What it does |
|---|---|---|
| `NET_CARDS` | 1 | KpopCards pages and API; off, everything answers 404 |
| `PRIVATE_LAUNCH` | 1 until the owner's go | only the allowed accounts see the hub |
| `NET_CARDS_BRIDGES` | 1 | the Kpopdle win pack and the kpopquiz.org blocks |
| `CARDS_BONUS_PER_DAY` | 3 | Kpopdle win packs a Paris day |
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
- **tsc** green. **Full suite** (without the offline wrapper): 10,967 passed, 5 skipped, 34 failed in 18 files under load; each of the 18 files passes alone (load timeouts, for example legal.test's 5 s walk of src).
- **Builds**: hub (NET_CARDS on and off) and kpop (the parity head build) green.
- **Production server** (`next start`, hub build, offline): every /kpopcards page answers (200); `/cards`, `/cards/binder?x=1` and `/cards/c/<num>` answer 308 to the same place under /kpopcards with the query kept; `kpopcards.bunnyverse.org/` and `/help?a=1` answer 308 to `bunnyverse.org/kpopcards` and `/kpopcards/help?a=1`. This check found that an empty generateStaticParams under the `[site]` layout answers 404 (NoFallbackError) on a production server although a dev server answers 200: the six open-ended pages now render per request (as `u/[username]`). Offline there is no catalog, so the pages show their "not available right now" fallback; a real card rendered by a production server needs the database.
- **Parity on kpopquiz.org** (60 URLs, base 84187a3, head 762da7e): 58 identical; /groups and /bts-quiz differ only in the numbering of streamed rows (the same rows in another order), which a control run of two builds of the same tree (84187a3 against b936fc6, same tree) also shows on /groups. No stylesheet, markup or status difference; no refused write fails. A first run had found one real difference (a Tailwind utility `.inline-grid` added to kpopquiz.org's shared stylesheet by a word in the Daily games badge): fixed in f77ef99.
- **Visual comparison with the v6 prototype** (Playwright, target at most 1% of pixels different and every key box within 2 px; photos and idol names masked on both sides): 38 of 42 shots within target.

| Screen | 1440x860 | 1366x657 | 390x664 |
|---|---|---|---|
| Lobby | 0.16% | 0.18% | 0.31% |
| Collection, binder | 0.20% | 0.21% | 0.29% |
| Collection, grid | 1.42% (pager 3.5 px wider) | 1.50% (same) | 1.55% |
| Collection, filters | 0.21% | 0.21% | 0.24% |
| Card view | 0.72% | 0.84% | 1.40% (the lock row, 80 px) |
| Missions | 0.09% | 0.10% | 0.06% |
| Ranking, friends | 0.30% | 0.31% | 0.43% |
| Ranking, everyone | 0.24% | 0.25% | 0.37% |
| Help | 0.07% | 0.08% | 0.06% |
| Bell | 0.05% | 0.06% | 0.17% |
| Avatar menu | 0.01% | 0.01% | 0.00% |
| Opening, pack | 0.21% | 0.26% | 0.91% |
| Opening, first card | 0.13% | 0.14% | 0.48% |
| Opening, summary | 0.07% | 0.09% | 0.01% |
| Guest lobby (product call) | 25.4% | 26.9% | 44.0% |

  The grid's remaining gap is mostly one empty pocket: the app never splits a group pair across two grid pages (lot 2 rule), the prototype does.
- **Opening**: fits all 13 sizes (320x568 to 1920x1080); no horizontal overflow from 360 to 1920 px; the flip never shows the back through the front on Chromium, Firefox and WebKit; reduced motion as 0.2 s fades. **Frames per second**, CPU 4x slower, Full Art opening: 59.5 (390x664) and 58.7 (1366x657), prototype 59.9 and 60.0, target 45.
- **Journeys** 15 of 16 (craft is skipped in the example state: 34 shards, the cheapest craft costs 50, as in the prototype; crafting after an ad works by hand). **Accessibility**: every target 44 px or more, names and focus rings on every page, at 390 and 1366.
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

## For the owner
See the final report: the SQL above in order, the files script (`publish-card-files.mjs`, preview then `--publish`), the review of the 44 photos waiting in the admin "À relire" then "Reconstruire le catalogue", the Kpopdle photos script, the env, the domain `kpopcards.bunnyverse.org`, the non-free images, and five product calls (the guest view, the quiz of the day, the sort of halves, the place of the lock, a group pair split across two grid pages).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
