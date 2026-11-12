## What this PR does

Bunnyverse Cards, the collectible card game of bunnyverse.org, end to end, **with PR #228 merged in** (o1/norefs: the private character references screen goes; one merge for the owner, who closes #228), from the owner-approved plan v3 and prototype v4
(2026-11-06, `docs/design/cards/`) and the owner's photo decision of 2026-11-12 (`docs/o1/briefs/CARDS-AMEND-1.md`).
**Everything stays off**: every Cards flag is off by default, and the hub also stays behind PRIVATE_LAUNCH. Nothing is
written to production by this PR: the database changes are four SQL files the owner applies.

- **Hub pages:**
  - `/cards`: the packs, tap to rip, the reveal, the stack of 5 and the two timers, the last pull, shards, and the drop rates.
  - `/cards/binder`: pages of 9 pockets by group, or the grid of 36 with sorts, filters, favorites, search and Recycle extras.
  - `/cards/c/[num]`: one card with its credit, noindex.
  - `/cards/report`: the "Report a photo" form, noindex.
  - A Cards section in the existing hub `/credits`, and Cards entries in the hub navigation.
  - The design is the prototype's: dark photocard cards, light mode on the kpopquiz.org kit, the real Bunnyverse logo. The card is 5.5:8.5 (owner, 2026-11-12).
- **Server:**
  - `/api/cards/*`: state, open, ad ticket and grant, recycle, favorite, report and catalog.
  - The wallet: a stack of 5, +1 every 10 minutes under 5, topped up to 5 at midnight Europe/Paris with the ad counter reset.
  - Shards: C 1, U 2, R 5, SR 12, UR 30, L 80; 50 shards open a pack.
  - The draw runs on the server with `crypto.randomInt`. The odds are those of the real catalog: the plan's weights of the rarities that exist, scaled to 100. The fifth card turns a Common into an Uncommon.
  - Opening a pack needs a signed-in account, and Team accounts are refused.
- **Bridges:** all behind `NET_CARDS` + `NET_CARDS_BRIDGES`.
  - On kpopquiz.org: a "Your packs" block on the home page and a "<group> cards" block on group pages.
  - On the hub, a Kpopdle win earns +1 pack.
  - Binder link in the profile menu, and a Collection section in both passports.
  - kpopquiz.org never loads an ad script.
- **Ads:** on the hub only, behind `NET_CARDS_ADS` + `NEXT_PUBLIC_NET_CARDS_ADS`.
  - AdSense H5 Games Ads rewarded ad: a single-use server ticket before the ad, the pack granted only from `adViewed`, up to 10 a day.
  - The button is hidden when no ad is available.
  - One banner on the binder pages only.
  - Google's certified CMP for the EEA, the UK and Switzerland. US requests are child-directed, and an unknown country counts as US.
- **Admin:** a "Cartes" tab in the photos admin.
  - Focal point (crop) per photo, and the "too small for 2x" flag.
  - The reports inbox, "remove a photo" (its cards leave the packs) and lock reasons.

### The catalog (the 59 October photos, nothing else)

- **Sources:** `docs/design/growth-v12/run/group-photos.json` and `lib/ux-v1/a0/group-photo-credits.ts`: 59 Wikimedia Commons files (41 groups, 18 soloists or members), CC BY or CC BY-SA, already in the public bucket `images` at `group-photos/<slug>.jpg`. Never `public/idols`.
- **Editions:** 4 per subject: Standard C, Stage U, Holo R and Gold UR. Era SR and Full Art L are locked pockets with the plan's sentence "Only one free photo of this idol exists so far."
- **Size:** at most 236 cards, `BV1-0001` to `BV1-0236`.
- **Resolved when applied:** `101-catalog.sql` reads names, debut years and ages from `groups` and `idols`, keeps adult subjects only (a group needs all its active members adult), numbers them with no gap, and prints the real counts in its Verify notices.
- **Card files:** cut by the owner's script from the Commons ORIGINALS of the same 59 photos (same page, same licence, full size, checked by sha1; `docs/design/cards/data/originals.json`), never from the 1,200 px bucket copies.
- **Too small for 2x:** 24 of the 59, whose widest 5.5:8.5 crop of the original is under 640 px. It was 41 on the bucket copies, 13 of which had been enlarged in October.
- **Odds shown** (computed from the catalog, not typed): each card C 63.03, U 25.21, R 10.50, UR 1.26; the fifth card U 88.24, R 10.50, UR 1.26.

## Card files (the owner's script)

`apps/quiz/scripts/cards/publish-card-files.mjs`: with no flag, a preview from the Commons originals (`out/cards-tool/preview/`, reads Commons only). With `--publish` it refuses unless `CARDS_SUPABASE_URL` is set explicitly, prints the project host and asks to type it back, then asks for the service key (never shown or written), uploads to the bucket `cards` and records the focal point each file was cut at.

The SQL of #228 also stays to run: `docs/pending-migrations/multisite/launch/L32-l1-character-refs.rollback.sql` and its three Verify lines (NULL, 0, 0).

## SQL for the owner (in this order, after a backup, no build running, never 23:50 to 00:30 UTC)

1. `docs/pending-migrations/cards/001-schema.sql`: 9 tables, RLS on and browser grants revoked at creation.
2. `docs/pending-migrations/cards/002-functions.sql`: 10 functions, `security definer`, service role only.
3. `docs/pending-migrations/cards/003-rls.sql`: RLS, and the public bucket `cards` (WebP, 2 MB).
4. `docs/pending-migrations/cards/101-catalog.sql`: the catalog; read its Verify notices.

Each file is one DO block with Verify lines and its `.rollback.sql`; undo runs in reverse order. No XP, level, streak or badge is touched.

## Proofs

- **Unit tests:** the odds over 1,000,000 cards (each rarity within 4 standard errors, an absent edition never drawn, the fifth card never C), the wallet against its SQL twin on 280 cases (both clock changes of 2026 and 2027), shards, ad tickets (replayed, reused, too young, of another user), the locked pockets and their five sentences, credits on every card, noindex card pages, one H1, flags off = 404, kpopquiz.org untouched with the flags off.
- **SQL proofs on pglite and a throwaway Postgres:** the exact files, concurrent double spends (one winner), rollbacks.
- **The real `o1-scratch` Supabase branch** (not production):
  - **Files:** applied in order twice (idempotent) and rolled back in reverse twice.
  - **101:** run on test subjects: 59 in, 236 cards, `BV1-0236`.
  - **Scenario inside a rolled-back transaction:**
    - new wallet 5;
    - a fifth card C refused;
    - an ad ticket refused at 2 s, accepted at 11 s, its replay refused;
    - empty stack refused;
    - +1 at 10 min, +2 at 25 min, 5 after Paris midnight;
    - no bonus without a Kpopdle win, one after a win recorded by `cards_bonus_record` (twice = still one), a second bonus refused;
    - Recycle extras: 27 extras = 174 shards, as computed.
  - **Two defects found there and fixed:** the wallet needed `dle_plays` even with bonuses off; a rollback deleted the bucket by SQL, which Supabase refuses.
- **Adversarial review:** a separate reviewer found 8 major and 9 minor defects, no blocker (`docs/o1/reviews/CARDS-REVIEW-1.md`). All 17 are fixed, each with a test that failed first.

## Checks

- **tsc:** clean.
- **Unit, full suite (with #228 merged in):** 10,015 passed. 5 load timeouts that pass alone, and 1 failure already on main (`lib/ux-v1/p10/passport-render.test.ts` "band modes").
- **Route gate:** green.
- **Builds:** kpop and hub production builds green.
- **kpopquiz.org parity, every flag off:** `scripts/o1/parity.sh 5a661a8 b726b7e` (the reviewed branch, #228 included), top 20 list, 70 pages: 69 identical. The other, `/groups`, differs only by a Flight module id shifted by one (`$L1c` against `$L1d`), the known harness noise. Earlier runs caught two real changes, now fixed: a test id `p-1` and the word `grayscale` in a TypeScript style string each made Tailwind add one rule to the shared stylesheet.
- **Twins check:** one violation, already on main (`blindtest/ux-v1/use-run.ts`).
- **Secrets check:** no secret; one false positive, the local test origin `http://localhost:3021`, already in a test on main.

## Exact values of existing tests changed (the owner's new mission)

- `lib/admin/admin-lock.static.test.ts` and `admin-lock.refusal.test.ts`: 48 admin routes, unchanged from main in number: #228, merged in here, removes one (references) and Cards adds one (the owner's photo review), plus that test's title.
- `lib/cards/subjects-credits.test.ts` (new in this PR): 41 to 24 photos too small for 2x, from the Commons originals (integrator review); each flag is now recomputed from the original's size in the test.
- `lib/site/contract.test.ts`: the lanes list adds `ADDED_LANES = ['CARDS']`; the BACKLOG list is unchanged.
- `lib/site/routing.test.ts`: extended with the Cards family closed by `NET_CARDS`; nothing removed.

## What changes for search

Nothing while the flags are off: kpopquiz.org is identical (parity above). With `NET_CARDS` on:
- the card pages and the report page are always noindex;
- `/cards` and `/cards/binder` are noindex while the hub is private (owner decision 5);
- none of these pages is in a sitemap.

## Owner decisions and limits (full list: `docs/o1/briefs/CARDS-DECISIONS.md`, 30 lines)

- **Bonus packs:** they come from Kpopdle wins only (decision 28). A kpopquiz.org quiz completion is recorded from a score the browser sends, and `public.plays` accepts an anonymous insert, so a quiz-end bonus could be farmed. The quiz-end line is not built. Cap: 3 a day, a setting.
- **Rewarded ad:** Google's rewarded event runs in the browser and cannot be checked by the server. A ticket opens a pack only 10 s to 1 h after issue, once (decision 29).
- **Google parameters to confirm in the AdSense console:** three names in `lib/cards/ads.ts` (`UNCONFIRMED_FOR_OWNER`): the child-directed attribute, the test attribute, and the CMP script base.
- **Group cards:** a 5.5:8.5 crop of a landscape group photo shows 1 to 3 members (decision 26).
- **Not built:**
  - the PWA notification: no PWA yet;
  - the prototype's fonts (Archivo, Martian Mono), which are not in the repo (decision 30).
- **Not exercised in a browser:** the signed-in flows (agents never sign in). They are covered by the SQL scenario on the real branch and the route tests.

Not merged. The owner merges.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
