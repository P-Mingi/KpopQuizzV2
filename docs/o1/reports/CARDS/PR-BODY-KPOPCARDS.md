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

## Checks
TBD: full suite, tsc, hub and kpop builds, parity on kpopquiz.org, the visual comparison table per screen and viewport, the fps measured, the concurrency test, the 100,000-pack simulation.

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

## For the owner
See the final report: the SQL above in order, the files script (`publish-card-files.mjs`, preview then `--publish`), the review of the 44 photos waiting in the admin "À relire" then "Reconstruire le catalogue", the Kpopdle photos script, the env, the domain `kpopcards.bunnyverse.org`, the non-free images, and three product calls (the guest view, the quiz of the day, the sort of halves).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
