## What this PR does

Bunnyverse Cards, the collectible card game of bunnyverse.org, end to end, **with PR #228 merged in** (o1/norefs: the private character references screen goes; one merge for the owner, who closes #228), from the owner-approved plan v3 and prototype v4
(2026-11-06, `docs/design/cards/`) and the owner's photo decision of 2026-11-12 (`docs/o1/briefs/CARDS-AMEND-1.md`).
**Everything stays off**: every Cards flag is off by default, and the hub also stays behind PRIVATE_LAUNCH. Nothing is
written to production by this PR: the database changes are four SQL files the owner applies.

It also closes **two security flaws of the Verse** found in the relaunch audit, in two separate commits (see
"Verse security fix" below). They are live on main today for anyone holding a curator role in one space.

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

## Verse security fix (integrator go, 2026-11-12)

The integrator read the database: no tree page changed since 2026-08-10, no link stored in a page, no payload.
There is nothing to write in the database.

**FLAW 1, one space reaching into another** (commit `verse: a curator of one space can no longer write or read another space`):
- Before: `/api/verse/tree` and `/api/verse/tags` checked the curator role on the `group_id` the caller sent, then acted on
  `page_id` or `tag_id` alone. A curator of one space could save, rename, move, publish, trash, restore or revert any page
  of another space, read its revisions, and tag, untag, merge or rename its tags.
- Now (`lib/verse/tree/ownership.ts`): every id is read first and its space comes from the row. The role is checked on
  that space. A missing row or a row of another space is a 403, the same answer as a caller with no role, so the reply
  never tells which ids exist.
  - move: the new parent must be in the same space.
  - create: the parent and the bound entity (idol, album, track, era, award) must be in the space.
  - attach and detach: the page and the tag must both be in the checked space; merge needs both tags there, rename the tag.
  - `/api/verse/eras/color` reads the era first too. It was already harmless (the update was filtered by space), but it
    answered `ok` while changing nothing.
- Every other `/api/verse/*` and `/api/admin/verse/*` route that takes an id was read; each already reads the row and
  checks the role on the row's space, is the caller's own data, is open to any signed-in user with no curator power,
  or is admin only. None changed.
- Test: `app/api/verse/space-ownership.routes.test.ts`, 30 tests. For every action, a curator of another space is
  refused and a curator of the right space is accepted. The 15 refusals fail on the old code.

**FLAW 2, a stored link breaking out of the editor** (commit `verse: the tree editor builds links with the DOM, a stored href can no longer break out`):
- Before: the tree editor wrote `<a href="${esc(href)}">` into `innerHTML`, with an escaper that left quotes alone, so
  a stored `https://x/"onmouseover="...` became an attribute for whoever opened the page in the editor.
- Now:
  - `safeHref` (`lib/verse/tree/blocks.ts`), used at the save and at every render:
    - an https link comes back as `new URL(v).href`;
    - a site path keeps only path characters (no query, no fragment, no quote);
    - refused: any backslash, a leading `//` or `/\`, `javascript:`, `data:`, `http:` and every other scheme, and a
      link over 300 characters.
  - The editor builds no HTML string any more (`lib/verse/tree/runs.ts`): text, list rows, table cells, the toolbar
    Link, the highlight and the `[[` page picker are built with `createElement`, `setAttribute` and text nodes. Its
    `innerHTML`, `dangerouslySetInnerHTML`, `insertHTML` and `createLink` are gone, and so are the HTML builder and its
    escaper, which nothing uses now.
  - The reader checks the stored href and slug again. The link hover card is built with `textContent`.
  - A block page link keeps a real page slug only.
  - The TipTap renderer (`lib/verse/render-content.ts`: the public Verse pages and the community posts) already
    escaped quotes. A link with a backslash, a tab or a line break, or a site path starting with `//`, now renders
    as plain text. Every other link renders as before.
  - Every other HTML sink under `components/verse` and `app/(site)/verse` is a static string, JSON-LD through
    `jsonLdString`, or that renderer.
- Tests, with the attack strings on the save side and the render side:
  - `lib/verse/tree/xss.test.ts` (17);
  - `components/verse/tree/document-page.xss.test.ts` (5);
  - `lib/verse/render-content.links.test.ts` (3);
  - `components/verse/html-sinks.test.ts` (2): it pins every HTML sink of the two Verse folders and fails on a new one.
- Not changed: no existing test or expected value. Behaviour changes:
  - an https link is normalised;
  - a site path with `?`, `#` or a quote is dropped;
  - a tree action with no `page_id` is a 400;
  - a bad parent or missing tag id is a 403.
- Not tried in a real browser: the repo has no DOM library, so the editor's builders run in tests against a small
  fake document.
- Backlog (integrator, 2026-11-12), not in this PR: `essays/reactions` GET gives the reaction count of any essay id, drafts included (a count only).

## Checks

- **tsc:** clean.
- **Unit, full suite (with #228 merged in, the Verse fix and the fonts):** 10,081 passed, none failed. The earlier failure already on main (`lib/ux-v1/p10/passport-render.test.ts` "band modes") passed in this run.
- **Hub production build with Cards on:** green; the font CSS holds Archivo (width 62% to 125%) and Martian Mono (75% to 112.5%), and only the Cards routes load it.
- **Route gate:** green.
- **Builds:** kpop and hub production builds green.
- **kpopquiz.org parity, every flag off:** `scripts/o1/parity.sh 5a661a8 <head>`, top 20 list, 70 pages. The stylesheet is identical on every page it compared.
  - Before the Verse fix (`2af206b`): 68 identical. `/groups` differs only by a Flight module id shifted by one (`$L1c` against `$L1d`), the known harness noise; `/` by a relative time ("22 hours ago" against "23 hours ago").
  - With the Verse fix (`e1bec27`), two runs: 64 then 66 identical. Every extra difference is on the BASE side (main, unchanged code), on a page whose base build logged a 5 s `safeFetch` timeout (6 in the first run, 146 in the second; the head build had none). The base page then shows the fallback: an empty hall of fame, no "perfect scores" line, the home lists. The rest is the same noise: Flight ids, and "9h ago" against "10h ago" on `/leaderboard`. No difference touches a Verse output.
  - With the fonts (`bd0c9e3`, the pushed head): 67 identical, no build timeout. The 3 others are the same noise: a relative time on `/` ("just now" against "3 minutes ago") and Flight module ids on `/groups` and `/which-bts-member-are-you`.
  - The community pages, the only kpopquiz.org pages that use the changed TipTap renderer, are outside the harness list (their GET writes the daily debate). There, only a link of the disguised kind changes (unit tests above).
  - Earlier runs caught two real changes, now fixed: a test id `p-1` and the word `grayscale` in a TypeScript style string each made Tailwind add one rule to the shared stylesheet.
- **Twins check:** one violation, already on main (`blindtest/ux-v1/use-run.ts`).
- **Secrets check:** no secret; one false positive, the local test origin `http://localhost:3021`, already in a test on main.

## Exact values of existing tests changed (the owner's new mission)

- `lib/admin/admin-lock.static.test.ts` and `admin-lock.refusal.test.ts`: 48 admin routes, unchanged from main in number: #228, merged in here, removes one (references) and Cards adds one (the owner's photo review), plus that test's title.
- `lib/cards/subjects-credits.test.ts` (new in this PR): 41 to 24 photos too small for 2x, from the Commons originals (integrator review); each flag is now recomputed from the original's size in the test.
- `lib/site/contract.test.ts`: the lanes list adds `ADDED_LANES = ['CARDS']`; the BACKLOG list is unchanged.
- `lib/site/routing.test.ts`: extended with the Cards family closed by `NET_CARDS`; nothing removed.
- `components/cards/cards-layout.test.ts` and `cards-ui.test.ts` (new in this PR): each mocks the new font module, as the hub home and Kpopdle tests do (next/font runs only inside the Next compiler); no assertion changed.

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
- **Fonts (owner go 2026-11-12, decision 30):** the card lettering is Archivo and the card meta Martian Mono, as in the prototype, both through `next/font/google` with their width axis (self-hosted at build, no font file added by hand). Only the Cards pages load them; the page text stays in DM Sans.
- **Not built:** the PWA notification: no PWA yet.
- **Not exercised in a browser:** the signed-in flows (agents never sign in). They are covered by the SQL scenario on the real branch and the route tests.

Not merged. The owner merges.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
