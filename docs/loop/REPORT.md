# REPORT - TIERLIST phase 3: the DB half (publish + public page + community + fandom-agrees + CRUD + moderation). No push.

Repo guard OK (origin = P-Mingi/KpopQuizzV2). PART 0 passed: migration 146 is now APPLIED
(tier_lists + tier_list_assets + the public bucket all resolve; full column set confirmed). Built
and proven on `next build` + `next start` (:3021), never dev. Every live check seeded rows through
the service role and TORE THEM DOWN (DB + bucket left clean). No DDL applied by the worker, no
push, no em dashes. Proofs: `docs/proofs/tierlist-p3/`.

## PART 0 - gate confirmed

Read-only probe: `public.tier_lists` and `public.tier_list_assets` both return 200 with the full
146 column set; the `tier-list-assets` bucket exists with public read. Proceeded.

## PART A - publish, CRUD, the persisted public page

- **Write layer** `POST /api/tier-list/save`: a signed-in creator writes their own rows through the
  cookie client (creator RLS); a logged-out guest may save a PRIVATE or UNLISTED board via the
  service role with an `anon_id` + anon cookie (the plays precedent), but a PUBLIC list requires a
  signed-in creator (the 146 constraint + a 401 gate). Every board is sanitised before write
  (`sanitizeBoard`: exactly-once ids across buckets, capped size, valid tiers) so the invariant
  holds at the persistence boundary; a unique slug is assigned via `makeUniqueSlug` checked against
  the DB (with a 23505 retry). Update is owner-only (creator or matching anon). On write the slug
  page + hub + sitemap `revalidatePath`; the cached reads carry a 300s TTL.
- **Like / view** `POST /api/tier-list/engage` + the `PublicEngage` island: the 146 counters
  (`likes` / `views`) bump through the service role, deduped per browser (localStorage). See the
  "no 147" note below.
- **The public page** `/tier-list/l/<slug>` (`PublicView.dc.html`): indexable SSG/ISR
  (`generateStaticParams` over PUBLIC slugs, `notFound()` in `generateMetadata` for unknown/private
  slugs = true 404, self-canonical, `revalidate=3600`), mirroring the published-quiz page so it
  inherits the decided soft-404 posture (L-219/220). The ranking renders REAL photos (bank +
  approved custom assets); a "where the fandom agrees" strip (PART B); "Make your own version" and
  "Remix this list" doors (remix reopens the same set via `?d=`). UNLISTED lists render but are
  `robots noindex` and out of the sitemap; PRIVATE returns 404 to anyone but the creator.
- **ShareSheet publish** wired (was the disabled stub): a visibility toggle (public/unlisted/
  private), logged-out public -> sign-in prompt, private/unlisted -> saved; after publish the sheet
  links the persisted slug page.
- **Sitemap**: published PUBLIC lists + their subject pages added in a guarded block (mirrors the
  verse block), unlisted/private absent.

## PART B - community + where the fandom agrees

- **Subject page** `/tier-list/subject/<group>/<kind>`: every PUBLIC list of that subject + the
  fandom-agrees consensus rendered as a board, a "Community lists" grid, and a "Make your own"
  door. Indexable SSG/ISR (`generateStaticParams` over public subjects), unique title/description,
  self-canonical, `notFound()` for an unknown subject or one with zero public lists.
- **Fandom-agrees**: `fandomAgrees()` (already unit-tested) over every public list sharing the
  subject, read through the cookie-free client under `unstable_cache` (the `tier_lists_subject_idx`
  makes it cheap). NO counter table, NO new migration - compute-at-read as 146 was designed.
- **Wired into existing surfaces**: the hub's "Trending this week" now lists real published lists
  (honest empty until the first publish), and the public + subject pages cross-link, so nothing is
  orphaned. (The tier-list hub is the feature's own community surface; the shared /leaderboard
  CommunityContent was left untouched to keep blast radius contained - named, not a gap.)

## PART C - custom-upload storage + moderation (and the closed seam)

- **Upload** `POST /api/tier-list/asset` (multipart): stores the cropped image to the public
  `tier-list-assets` bucket via the service role (avatars/space-image precedent) and ledgers a
  `tier_list_assets` row (`status='pending'`), owner = a signed-in user or an anon session; returns
  the `*.supabase.co` public URL + `custom:<id>`. On row-insert failure the object is removed (no
  orphan). ImportModal now uploads on "Add to pool" (falling back to a client-only blob if the
  upload fails - a purely local draft).
- **Moderation gate**: a PUBLIC list may only use APPROVED assets (enforced in the save gate +
  proven on the public read path: RLS returns only approved assets to anon, so a pending custom
  face falls back to initials on a public page); a private/unlisted list may use a pending asset.
- **Admin queue** `/admin/tier-list-assets` + `/api/admin/tier-list-assets/action` (isAdmin,
  service-role status flip), reusing the member-review admin rails. Approve/reject flips `status`.
- **Seam closed (L-223) with no OG change**: a stored asset lives at a `*.supabase.co` URL, already
  on `isConfiguredImageHost`, so `og-faces` fetches and embeds an approved custom face. Verified end
  to end: the OG card for a board with an approved custom asset shows that custom face as a real
  photo beside the bank faces (`seam-custom-og.png`).

## Tests (all green - now LIVE, since 146 is applied)

Unit (vitest, 34): + `publish.test.ts` (sanitizeBoard exactly-once/oversize/colour; customAssetIds;
publishGate: public needs a creator (401), public blocks a pending asset (409), approved allows,
unlisted allows a pending asset, any rejected asset blocks (409)); + share-state subject round-trip.
fandom-agrees / serialization / slug / bank / og-faces still green.

e2e (Playwright, 23 passed + 7 skipped desktop-only-on-mobile): the whole phase-2/2.5 suite still
passes; + the share sheet offers a publish control with public/unlisted/private options; + a
logged-out PUBLIC publish is refused 401 needsAuth and writes no row (asserted on the real endpoint,
so it is deterministic). Config gains `retries: 2` because the feature specs hit a shared LIVE
Supabase and a transient slow round-trip can flake a run.

Live integration (seeded via service role, then torn down; `partAB-live-verify.txt`,
`partC-seam-verify.txt`): publish auth posture; the public slug page renders static with the
ranking + real photos; the list appears on its subject/community page; fandom-agrees shows real
aggregated data across two published lists; remix reopens the set; visibility (public indexable,
unlisted noindex + out of sitemap, private 404, unknown 404); a pending custom asset is hidden from
a public page and blocked from a public publish, approved is allowed and embedded in the OG card.
The signed-in-creator + admin UI paths were exercised through the real routes with seeded sessions/
rows rather than a Playwright login (no live-auth session is wired for e2e) - stated plainly.

## Render modes + SEO

`route-modes.txt`: `o /tier-list`; `● /tier-list/l/[slug]` and `● /tier-list/subject/[group]/[kind]`
(SSG/ISR, indexable, self-canonical, in sitemap); `f` for create/new/share + the admin queue + every
route handler. No existing URL changed; the new routes are covered by the existing /tier-list, /api
and /admin allowlist prefixes (routes gate PASS, 369 reachable). `gates.txt`: docs-secrets + routes
PASS; indexability / metadata-dupes / orphans report only the SAME pre-existing, non-tier-list
offenders as before (grep for tier-list in each failure = none). A published list/subject is
self-canonical with a unique title from its subject + creator and is linked from the hub + public
pages, so it adds no dupe and no orphan.

## Why NO new migration (147) was written

146 was designed for compute-at-read, and fandom-agrees needs no counter table (PART B). The only
thing that would want a table is server-enforced, cross-device idempotent likes/views (the duel-vote
`voter_hash` precedent). I did NOT add a 147: likes/views bump the existing 146 integer columns
through the service role, deduped per browser (localStorage), which keeps the whole phase running
live on the applied 146 and avoids shipping a half-applied migration. If the owner wants
cross-device one-per-user idempotency, a `147_tier_list_engagement.sql` (a likes join table + a
views table + SECURITY DEFINER RPCs, mirroring 067/068) is the clean follow-up - say the word and I
will write it (owner-applied, as always). This is the one honest limitation of the phase.

## Adjacent (named, not fixed - scope fence)

The pre-existing gate offenders remain: `/katseye-trivia`, `/q/katseye-quiz`,
`/q/bts-true-or-false-bet-you-cant-get-100` (orphans), the verse-inflation metadata dupes. Unrelated
to tier lists.

## Owner gates

1. **Push** - local main is ahead of origin; nothing pushed (including this report).
2. (Optional) apply a `147` ONLY if you want server-enforced like/view idempotency; not needed for
   anything shipped here.

---

STOP. The whole tier-list feature is now complete end to end (Phase 1 -> 3): make (bank + custom
upload), rank (desktop drag / mobile tap), share (real-photo OG card), PUBLISH to an indexable
public page, browse a subject's community + where the fandom agrees, remix, and moderate custom
uploads - all on the applied 146, tested (34 unit + 23 e2e + live integration), nothing pushed. The
single deferred nicety (cross-device like/view idempotency) is named with its 147 recipe.
