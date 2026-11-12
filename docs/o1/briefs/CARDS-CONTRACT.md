# Bunnyverse Cards: the shared contract of the four lanes (ORCH, 2026-11-12)

Source of truth: `docs/design/cards/CARDS-PLAN-v3.md` (rules) and `docs/design/cards/bunnyverse-cards-prototype-v4.html`
(design, approved as is), both copied into this branch. This contract fixes the interfaces so the lanes can work in parallel.
Anything the plan does not say is NOT invented: it goes to `docs/o1/briefs/CARDS-DECISIONS.md` as an owner decision, with
the default the code uses until the owner rules.

Integration branch `o1/cards` (worktree `.claude/worktrees/o1-cards`). Lanes branch from it and never push.

| Lane | Branch / worktree | Owns |
|---|---|---|
| D DATA | `o1/carddata` (`o1-carddata`) | `apps/quiz/scripts/cards/**` (data run, census, catalog generator), `out/cards-tool/**` (owner's upload script, local only), `docs/design/cards/data/**` (the catalog dataset, no birth date), the catalog SQL files `docs/pending-migrations/cards/1xx-*.sql`; local only, never in git (the repository is public): `out/cards-data/**` (raw data run with birth dates, the census, `VERIFY-MEMBERS.md`) |
| C CORE | `o1/cardcore` (`o1-cardcore`) | `apps/quiz/src/lib/cards/**` (except `lib/cards/ui-*`), `apps/quiz/src/app/api/cards/**`, schema SQL `docs/pending-migrations/cards/0xx-*.sql`, SQL proofs |
| U UI | `o1/cardui` (`o1-cardui`) | `apps/quiz/src/app/sites/[site]/(hub)/cards/**`, `apps/quiz/src/components/cards/**`, the Cards section of the hub `/credits`, the report form, `apps/quiz/src/lib/cards/ui-*.ts` |
| B BRIDGES | `o1/cardbridge` (`o1-cardbridge`) | kpopquiz.org home block, group page block, quiz-end and Kpopdle-win bonus, profile menu and passport Collection section, ads (flag off), consent banner, analytics calls |

A lane that needs a file another lane owns writes a request in `docs/o1/requests/CARDS-<lane>.md` and stops on that point.

## 1. Rules (from the plan, exact)

- Stack: up to 5 packs (`CAP = 5`). Refill: 1 pack every 10 minutes (`PERIOD = 600 s`) while the stack is under 5. At
  00:00 Europe/Paris (summer time included) the stack is topped up to 5 and the ad counter goes back to 0. No daily gift.
- Pack: 5 cards, each drawn on its own. Rarity odds: C 60, U 24, R 10, SR 4.5, UR 1.2, L 0.3 (percent). The fifth card is
  Uncommon or better: it is drawn with the same table and a Common becomes an Uncommon (the prototype's rule,
  `rollR(min)`). So the fifth card is U 84, R 10, SR 4.5, UR 1.2, L 0.3. The odds page shows both lines, exactly.
- Kind of a card, given its rarity: idol 75, group 15, event 10, among the kinds that have at least one active card of that
  rarity (prototype `KW`, `rollK`). Groups exist only in C, U, R, SR; events only in C, U, R; so UR and L are always idols.
  Then one card uniformly among the active cards of that kind and rarity.
- Editions: idol C Standard (photo 1), U Stage (photo 1), R Holo (photo 1), UR Gold (photo 1), SR Era (photo 2, another
  event), L Full Art (photo 3). 1 photo = 4 cards, 2 = 5, 3 = 6. Group: C, U, R, SR (4). Event: C, U, R (3).
- Shards for a duplicate: C 1, U 2, R 5, SR 12, UR 30, L 80. 50 shards open a pack at once. Duplicates become shards only
  through "Recycle extras" (the binder button: every copy above one, all at once), as in the prototype.
- Rewarded ad: one ad = one pack, up to 10 a day (a setting), button hidden when no ad is available.
- Locked pockets: one of five sentences, exactly these (prototype `REASONS`):
  - `one`: "Only one free photo of this idol exists so far."
  - `sameday`: "All free photos come from the same day, so they can't make different editions."
  - `newg`: "New group: free photographers haven't caught up yet."
  - `hiatus`: "On a break, so no new public appearances to photograph."
  - `crop`: "Only appears in group shots, too small to crop for Full Art."
- Card face: stage name, group, debut year, edition, set number `BV1-0001`. Credit on the back and under the card in its
  detail view: `Photo by <author>, <licence>, via <source>, cropped` with the photo's number for that idol; a CC BY-SA
  photo makes the card CC BY-SA and the credit says so.
- Bonus packs (decision 1): the end of a quiz on kpopquiz.org and a Kpopdle win each earn one bonus pack, opened on
  Bunnyverse. Allowance of a Paris day = min(`CARDS_BONUS_PER_DAY`, quizzes completed + Kpopdle wins that day, read from
  the existing play tables) minus the bonus packs already opened that day. Nothing is granted by a client call alone.
- Opening a pack needs a signed-in account (the passport). The collection lives with the account, the wallet on the
  server. Team accounts (lib/editorial/team-refusal.ts) never open packs.

## 2. Schema (C CORE writes it; D DATA fills the catalog)

All tables in `public`, RLS on, writes by the service role or by `security definer` functions only. Prefix `cards_`.

```
cards_entities  (id text pk            -- 'idol:<QID>', 'group:<QID>', 'event:<slug>'
                 kind text check in ('idol','group','event'),
                 name text not null,    -- stage name / group name / event name
                 group_id text null,    -- for idols: 'group:<QID>'
                 debut_year int null,   -- the group's debut year (idol and group cards); the event year for events
                 qid text null, sort_key text not null,
                 lock_reasons jsonb not null default '{}'  -- {"SR":"one","L":"crop"}: why a missing edition is missing
                 active boolean not null default true)
cards_photos    (id bigint pk, entity_id text fk, slot int check 1..3,
                 source text check in ('commons','koreanet','flickr','dvids'),
                 source_page text not null, file_url text not null, author text not null, author_url text null,
                 licence text not null,  -- 'CC0','PD','CC BY 2.0','CC BY 4.0','CC BY-SA 2.0','CC BY-SA 4.0','KOGL Type 1', ...
                 licence_url text not null, share_alike boolean not null, checked_at date not null,
                 event_name text null, event_date date null,
                 focal_x int 0..100, focal_y int 0..100,  -- the crop: object-position of the cover crop
                 storage_path text null,  -- set when the owner's script has uploaded it (bucket 'cards', public)
                 status text check in ('auto','pending','approved','rejected','removed'),
                 review_note text null, modified text not null default 'cropped, frame and text added')
cards_catalog   (card_no int pk, num text unique,  -- 'BV1-0001'
                 entity_id text fk, rarity text check in ('C','U','R','SR','UR','L'),
                 edition text check in ('std','stage','holo','era','gold','full'),
                 photo_id bigint fk null, in_packs boolean not null default true)
cards_wallets   (user_id uuid pk, stock int, anchor timestamptz, paris_day date, ads_today int,
                 bonus_today int, shards int, version int, updated_at timestamptz)
cards_owned     (user_id uuid, card_no int, copies int, first_at timestamptz, last_at timestamptz,
                 favorite boolean default false, pk (user_id, card_no))
cards_packs     (id uuid pk, user_id uuid, source text check in ('stock','ad','shards','bonus'),
                 cards int[] , opened_at timestamptz)
cards_ad_tickets(id uuid pk, user_id uuid, issued_at timestamptz, used_at timestamptz null)
cards_reports   (id bigint pk, photo_id bigint null, card_no int null, role text check in
                 ('person','photographer','agency','other'), message text, contact text, created_at, status text)
```

Functions (service role only, `security definer`, `set search_path = public`), each with an injectable `p_now`
for the proofs:
- `cards_wallet(p_user, p_now)`: STABLE, read only: computes refill and the Paris midnight on the stored row and returns the
  state without writing (kpopquiz.org reads it for the home block). Only `cards_apply_pack` and the other writers persist.
- `cards_apply_pack(p_user, p_source, p_cards int[], p_ticket uuid, p_now)`: in one transaction, locks the wallet row,
  checks and spends the source (stock, ticket + `ads_today < limit`, 50 shards, bonus allowance), checks the 5 cards
  exist with `in_packs` and the fifth is not C, upserts `cards_owned`, inserts `cards_packs`. Returns the pack.
- `cards_recycle(p_user)`, `cards_favorite(p_user, p_card_no, p_on)`, `cards_issue_ticket(p_user, p_now)`.
- The draw itself is in TypeScript (below), with `crypto.randomInt`, so a large draw is testable in vitest.

Files: `docs/pending-migrations/cards/0NN-<what>.sql` + `.rollback.sql`, additive, ONE `do $cNN$ ... end $cNN$;` block
each (the SQL Editor rule, pinned by a test like `lib/dle/editor-safe-sql.test.ts`), `-- Verify` lines at the end, a
header (what, why, rows, verify, undo). The catalog is cut into files of at most 1,000 rows (`1NN-catalog-part-K.sql`).
No XP, level, streak or badge is ever recomputed.

## 3. Server API (C CORE)

All under `/api/cards/*`, hub build only (404 elsewhere and when the flag is off), JSON, `cache-control: no-store`,
signed-in (401) and not Team (403) except `GET /api/cards/catalog`.

| Route | In | Out |
|---|---|---|
| `GET /api/cards/state` | | `{ stock, cap, nextAt, midnightAt, adsLeft, adsEnabled, shards, bonusLeft, owned: [{n, copies, fav, at}] }` |
| `POST /api/cards/open` | `{ source: 'stock' \| 'shards' \| 'bonus' }` | `{ pack: { id, cards: [{ n, isNew }] }, state }` |
| `POST /api/cards/ad/ticket` | | `{ ticket }` or `{ error: 'limit' \| 'disabled' }` |
| `POST /api/cards/ad/grant` | `{ ticket }` | like `open` with source 'ad'; a replayed or unknown ticket is 409 |
| `POST /api/cards/recycle` | | `{ recycled, shards, state }` |
| `POST /api/cards/favorite` | `{ n, on }` | `{ ok }` |
| `POST /api/cards/report` | `{ photoId?, n?, role, message, contact? }` | `{ ok }` (no sign-in needed; rate-limited by the existing IP-hash pattern) |
| `GET /api/cards/catalog` | | the public catalog JSON (cards, entities, photo credits), cached |

TypeScript types live in `apps/quiz/src/lib/cards/types.ts` (C writes them first; U and B import them):
`Rarity`, `Edition`, `CardKind`, `CatalogCard { n, num, entity, kind, rarity, edition, name, group, debutYear, photo }`,
`PhotoCredit { id, slot, author, authorUrl, licence, licenceUrl, source, sourcePage, shareAlike, modified }`,
`WalletState`, `OpenResult`. Pure helpers in `lib/cards/rules.ts`: `RARITIES`, `ODDS`, `FIFTH_ODDS`, `SHARDS`,
`KIND_WEIGHTS`, `EDITIONS`, `LOCK_SENTENCES`, `creditLine(photo, idolPhotoNumber)`, `drawPack(pool, rng)`,
`walletAt(state, now)` (the TS twin of the SQL wallet, for the countdown and the proofs), `nextParisMidnight(now)`.

## 4. Flags (registered in `lib/site/registry.ts`, all off by default)

| Flag | Scope | Effect |
|---|---|---|
| `NET_CARDS` | server, hub | `/cards`, `/cards/binder`, `/cards/c/[num]`, the Cards part of `/credits`, `/api/cards/*`. Off: a 404 like any unknown URL |
| `NET_CARDS_BRIDGES` | server, kpop and hub | the kpopquiz.org home block, the group block, the quiz-end and Kpopdle-win bonus, the profile link and the passport section |
| `NET_CARDS_ADS` + `NEXT_PUBLIC_NET_CARDS_ADS` | server + public, hub only | the rewarded ad button, the binder banner, the consent banner |
| `CARDS_ADS_PER_DAY` | server | default 10 |
| `CARDS_BONUS_PER_DAY` | server | the bonus pack cap per day (owner decision; default 3 until he rules) |

Everything also stays behind `PRIVATE_LAUNCH` on the hub. kpopquiz.org never loads an ad script.

## 5. URLs (hub, bunnyverse.org)

`/cards` (Packs), `/cards/binder` (Binder, `?view=pages|grid&sort=rarity|number|newest`), `/cards/c/[num]` (one card,
`noindex`), `/credits` (existing page, gains a Cards section), `/cards/report` (the form, `noindex`). Route allowlist,
`docs/o1/contracts/routes.md` rows and the sitemap rules: the card pages are noindex and out of the sitemap; `/cards` and
`/cards/binder` are indexable only once the owner says so (default: noindex while private).

## 6. Measurement (existing enums of `lib/analytics.ts`, nothing new)

`game_start` and `game_complete` with `{ site: 'hub', game: 'cards', mode: 'classic', kind: 'cards_standard' }` at the
pack open and after the fifth card is revealed. Bridges use `cross_promo_click` with the existing `from` values. A new
property (pack source, rarity) is an owner decision, not added.

## 7. Laws for every lane

No em or en dash anywhere. One H1 per page. No invented number: every count comes from the database or the dataset.
No image from another site, never Fandom, kprofiles, AniList or Pinterest. No new npm dependency. Ratchet law. Commit
with `git -c o1.agent=CARDS`; never push, never `gh`, `supabase` or `vercel`, no connector, no write to production.
tsc, the touched tests and the full suite green before reporting.
