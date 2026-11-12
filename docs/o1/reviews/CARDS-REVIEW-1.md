# Bunnyverse Cards, adversarial review 1 (on bb5a39d) and what ORCH decided for each finding

8 major, 9 minor, no blocker. Every finding below is to fix unless the line says otherwise.

## Major

1. Bonus earned by a client insert. `cards_bonus_plays` counts `public.plays`, whose RLS lets anon insert
   (`supabase/migrations/003_rls.sql:49-50`, `record_play` callable with a client-chosen player id). FIX: earn bonus packs
   only from a table written by the service role (`cards_bonus_earned`: user, Paris day, source quiz or kpopdle, the play
   reference, unique), filled by a server route after its own check. Find the trustworthy server paths: the Kpopdle win is
   decided on the server (dle routes); for a kpopquiz.org quiz, use a server route that validates the completion if one
   exists. If no quiz completion is server-validated, earn bonus packs from Kpopdle wins only and add an owner decision
   line to `docs/o1/requests/CARDS.md` (ORCH copies it into CARDS-DECISIONS.md). The bridge line "+1 pack" shows only
   after the server recorded an earned bonus.
2. Tables open between 001 and 003. FIX: in 001, right after each `create table`, `enable row level security` and
   `revoke all ... from anon, authenticated` (and public). 101 refuses when `cards_catalog` or `cards_entities` holds a row
   that is not one of its own subjects (an id outside its slug list, or a photo outside `images/group-photos/`).
3. kpopquiz.org group block never matches: `lib/cards-bridge/group.ts` looks up `group:<QID>`; 101 writes `group:<slug>`
   and `idol:<slug>`; the image uses `storage_path` (a stem, null until the script runs). FIX: ids by slug (the group
   and the soloists or members whose card group line is this group), images through `cardImage()` of `lib/cards/catalog.ts`;
   make the fake database of `cards-bridge.test.ts` honour the filters it receives.
4. Group cards draw the prototype monogram instead of the photo (164 of 236 cards). FIX: `components/cards/card-art.tsx`
   uses the photo for a group when `card.img` exists, the drawing only as the fallback.
5. Card-less group entities (BLACKPINK for Jennie and Rose...) get 6 empty pockets and a binder run. FIX: skip entities
   with no card in `buildSlim` and everywhere pockets are made; a test with such an entity.
6. The admin Cartes tab cannot work: the photos admin is on the anime build, `lib/cards/admin-photos.ts` answers 404 off
   the hub. FIX: accept the anime build there (same database), and add to the tab: the reports inbox (open reports, the
   card and photo, the message, close), remove a photo (retires its cards), set a lock reason (incl. hiatus). Tests with
   SITE_ID 'anime'.
7. kpopquiz.org `/me` Collection is after the UX_V1 return. FIX: render it inside the UX_V1 branch (flag off: same tree).
8. A report from the footer link (no card, no photo) is refused with a 400. FIX: accept a general report (message
   required, card and photo optional); a retired photo id still accepted.

## Minor

9. A ticket of any age is accepted. FIX: grant only a ticket issued at least 10 seconds and at most 1 hour before (owner
   decision line: the 10 seconds). The missing server-side check of Google's rewarded event is inherent (say so in the
   report, no fix possible).
10. Cards API not behind PRIVATE_LAUNCH. FIX: while the hub's private launch is on, the Cards API answers only to the
    accounts the private launch allows (reuse `lib/private-launch/*`).
11. 101 can bind the wrong person when several active idols share the name. FIX: leave such a subject out as
    `ambiguous`, and print one notice per included person (subject slug, idol id).
12. Decision 18 not implemented. FIX: a soloist's group line is "Soloist" on the card face and the card page.
13. kpopquiz.org ships new code with every flag off. FIX: `BonusPackLine` in `results.tsx` and `dle-game.tsx` through a
    dynamic import behind the public flag; the hub `/passport` makes no extra `getUser()` with the flags off. Keep the
    markup identical with the flags off.
14. Ads: an unknown country must count as child-directed (fail closed). The attribute names marked unconfirmed stay
    isolated and listed for the owner.
15. SQL upkeep: 003 creates the bucket at 2 MB WebP only and does not touch an existing bucket (`on conflict do
    nothing`); delete `100-bucket-cards.sql` and its rollback (one file fewer for the owner) and fix the tests and the
    README lists; `001-schema.rollback.sql` refuses while `cards_reports` holds an open report or `cards_owned` holds a
    row; the bonus read uses an index (or reads `cards_bonus_earned`, which has one).
16. Counts after a photo removal: count owned cards only among the catalog's cards, and the recycle estimate must equal
    what the server recycles.
17. Small: the en dash at `docs/design/cards/bunnyverse-cards-prototype-v4.html:1376` becomes a hyphen; the Cards
    layout's fallback page gets its H1; bridge cards use 55/85; the bridge bonus cap uses the same maximum (20) as the hub.

## Checked and found sound (by the reviewer)

Server draw with crypto.randomInt, shown and drawn pools identical, no absent rarity drawn, fifth card rule, wallet row
lock, single-use tickets bound to their user, the ad limit, shards and recycle, concurrent double spends on real Postgres,
security definer functions executable by service_role only, RLS after 003, Paris midnight across both 2026 clock changes,
route guards (404 off, 401, 403 Team, same origin, no-store), no XSS sink, no ad code on kpopquiz.org, same tree with the
flags off, credits in four places, exact lock sentences, noindex card pages, one H1, the 59 photos only, 101 adult rule,
contiguous numbers and idempotence.
