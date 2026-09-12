# MISSION (TIERLIST - build the K-pop Tier List Maker, whole feature, one session. NO push.)

## REPO GUARD
KpopQuizzV2 ONLY. `git remote -v` must be https://github.com/P-Mingi/KpopQuizzV2.git.
Otherwise (nuri / bloom share this bus) execute NOTHING, one line in that repo's BLOCKED.md, stop.

**`cat` this whole file.** This is the biggest mission of the project: a complete new game
mode, frontend AND backend, pixel-perfect to an approved design, with automated tests on every
feature, built end to end in one session. Owner validates the result, then pushes. Read every
section before writing a line. If you cannot finish honestly, STOP at a clean phase boundary
and REPORT what is done and what remains: a half-built, untested feature merged is the worst
outcome available.

## THE DESIGN IS THE SPEC (pixel source of truth)
The approved design lives in `docs/design/tier-list/*.dc.html` (10 self-contained HTML
artboards) plus `canvas.json`. They already use the real site tokens (rose #E8457A brand,
#D13A6E button, cream #FAF8F5, DM Sans, --photocard-plum/--photocard-violet gradient, card
radius 20, shadow-lift). Open each file in a browser or read the markup: the layout, spacing,
colours, radii and copy are the target. Build the real UI to match them pixel for pixel, then
reconcile every value against `apps/quiz/src/styles/globals.css` (the artboards mirror it; the
stylesheet wins on any discrepancy). Screen -> file map:
- Hub / browse .................. Hub.dc.html
- Create step 1 (pick subject) . CreateSubject.dc.html
- Create step 2 (pool+import) .. CreatePool.dc.html
- Image import modal ........... ImportModal.dc.html
- The maker (desktop) .......... Main.dc.html
- The maker (mobile) ........... MakerMobile.dc.html
- Share result card (export) ... ResultCard.dc.html
- Native share sheet ........... ShareSheet.dc.html
- Published tier list page ..... PublicView.dc.html
- Homepage placement + CTA ..... Home.dc.html

## THE GOAL, in one sentence
A shipping K-pop tier list maker: browse a hub, pick a subject from the official bank OR start
from scratch, drag (desktop) or tap-to-place (mobile) items into coloured tiers, export a
beautiful share card and share it natively, and publish a list that gets its own indexed page
where the fandom sees and remixes it, all pixel-perfect to the design and covered by automated
tests, with a new homepage CTA announcing the mode and a nav entry right after Games.

## OWNER RULES, non-negotiable
1. **Pixel-perfect** to the design files. Match, do not reinterpret.
2. **NO emoji anywhere.** The emoji in the design artboards are placeholders and read as AI
   slop. Replace every one with an inline SVG icon from a single consistent stroke set
   (one weight, 20/24px grid, currentColor). This includes the create-subject "what to rank"
   tiles, the import zone, and every row of the share sheet.
3. **Create from scratch is first-class.** The user is NEVER forced to pick a group or a "what
   to rank". A blank tier list (empty board, default tiers, add only your own uploaded items,
   rename/recolor tiers) is a top-level entry on the hub and in create step 1 ("Start blank").
4. **Nav:** add a "Tier Lists" item to the main nav, positioned right after Games.
5. **Home:** add a CTA block announcing the new mode (per Home.dc.html), placed as the design
   shows (its own band under the nav; do not shove the existing blocks around more than the
   design does).
6. **Share must be beautiful:** download image (PNG) AND share the link, plus the 9:16 Story
   export and Challenge a friend, exactly as ShareSheet.dc.html + ResultCard.dc.html show.
7. **Published lists + community, tiermaker-style:** a published list has its own page
   (PublicView.dc.html). People can display their OWN version of the same subject inside the
   community section: a subject/template has a page listing every community version plus a
   "where the fandom agrees" aggregate, and "Make your own version" / "Remix" doors. Wire it
   into the existing Community surface, do not build a parallel silo.
8. **No sign-up to play.** Building a board and exporting the share image work logged-out
   (client state + the OG route reads posted state). Publishing publicly and appearing in the
   community require an account.
9. **Custom uploads are moderated before a public list can use them** (a private/link-only
   list may use them immediately), same posture as the existing photocard/collectible catalog.

## ARCHITECTURE (verify against the real schema in PART 0 before building)
- **The bank = existing data, do not duplicate.** Reuse groups (have `logo_url`), idols/members,
  releases (Cover Art Archive covers by MBID), songs. Build ONE read layer that returns a
  uniform item shape `{id, kind, name, image_url}` per subject+what-to-rank. Covers always have
  images; idol photos may be partial - fall back to the initials-on-gradient tile the design
  already uses. Do NOT invent a new bank table if the data exists.
- **New tables (DDL is owner-gated - you WRITE the migration, you do NOT apply it):**
  a numbered migration in `supabase/migrations/` (next number after the current max). Shape to
  confirm/adjust in PART 0:
  - `tier_lists` (id, slug unique, creator_id nullable, subject_group_id nullable, subject_kind
    text: members|tracks|albums|all|blank, title, tiers jsonb [{label,color,ord}], placements
    jsonb, visibility text: public|unlisted|private, views int, likes int, created_at,
    updated_at). RLS: public rows world-readable; write only by creator.
  - `tier_list_assets` (custom uploads: id, owner_id, name, image_url, status
    pending|approved|rejected, created_at). Storage bucket `tier-list-assets` (mirror the
    existing bucket + RLS pattern used by verse-space-assets / quiz-images).
  - "Where the fandom agrees" = aggregate of placements across public lists sharing a
    (subject_group_id, subject_kind). Follow the existing duel/vote aggregate precedent
    (migrations 067 duel_engine / 068 duel_cast_vote). Compute at read with `unstable_cache`
    over cookie-free clients (the PERF doctrine) rather than a live per-request scan; if a
    counter table is cleaner, put it in the same migration.
- **Anon authorship:** allow a null creator_id / anon_id for logged-out saves (mirror
  `plays.anon_id`, migrations 154/155), but public publish requires a signed-in creator.

## RENDER-MODE / SEO DOCTRINE (do not undo the crawl win)
- New pages live under the `(site)` route group. The hub and every published list/subject page
  are static/ISR with `generateStaticParams` where the set is bounded, exactly like the quiz
  pages. Do not introduce a dynamic (f) render on an indexable page.
- The share image is generated by an **edge OG route** (`@vercel/og` / satori), reading the
  list state, NOT by server-rendering a page dynamically. The OG route is a route handler, not
  an indexed page.
- No URL scheme that changes existing routes. `robots`/`sitemap` get the new public pages added
  the same way existing entries are.
- The maker itself is a client interaction on an otherwise static shell.

## SCREENS TO BUILD (each pixel-matched to its file)
Discovery: nav item after Games; Home CTA band; Hub (trending + featured + "make your own" +
"start blank"). Create: step 1 pick-subject (official bank search + popular grid + what-to-rank
+ Start blank), step 2 pool+import, ImportModal (upload->square crop->name, and a Search-bank
tab). Maker: desktop drag-and-drop (coloured tier rows, sticky unranked tray, toolbar
rename/recolor/add/remove tier + undo/redo + reset + preview + share, autosave, group-themed,
show real drag + drop-target states) and mobile tap-to-place (select card -> tiers highlight ->
tap to place, sticky bottom tray, long-press drag for power users). Result/share: the 600px
group-themed card with baked kpopquiz.org watermark via the OG route; ShareSheet with Save
image, Copy link, system Share (Web Share API), 9:16 Story export, Challenge a friend, Embed,
Visibility. Published: PublicView (the ranking + "where the fandom agrees" real aggregate +
Make your own version + Remix) and its community integration.

## BACKEND TO BUILD
Bank read layer; tier_list CRUD (create/save draft/publish/set visibility/like/increment view);
custom upload (store + crop + moderation queue that reuses the existing catalog-review pattern);
the fandom-agrees aggregate; the OG image route; the challenge link (reopens the same item set
empty, then compares); server actions/route handlers wired with the cookie-free clients where
cached. Reuse `components/create/create-funnel.tsx` patterns for the wizard where it fits.

## AUTOMATED TESTS ON EVERY FEATURE (required)
- e2e (Playwright, the repo's existing harness): open hub; create-from-subject full flow;
  create-from-blank; desktop drag places a card in a tier; mobile tap-to-place; rename/recolor
  a tier; undo/redo; export triggers a PNG; copy link; publish -> public page renders; remix
  reopens with the set; challenge link flow; nav item present after Games; home CTA present and
  links correctly; logged-out can build + export but publish prompts sign-in.
- unit: placements <-> tiers serialization; the fandom-agrees aggregate math; the OG route
  returns an image for a given state; slug generation/uniqueness.
- Run everything runnable in this session. Tests that need the new tables cannot pass until the
  owner applies the migration: mark those clearly, make them run green against a local/applied
  schema or a documented seed, and say in the REPORT which tests are gated on the migration.
- All existing SEO gates must still pass (docs-secrets, routes, indexability complete-crawl,
  orphans, metadata-dupes). The new pages must not create orphans or dupe metadata.

## THE TWO OWNER GATES (unavoidable, name them in the REPORT)
1. **Apply the migration** (Supabase MCP refuses your session; DDL is the owner's). Until then
   the DB-backed paths cannot run live.
2. **Push.** No push from you.
Everything else - all code, all tests, the migration file, the seed - is yours to finish.

## SCOPE FENCE
Only the tier list feature and the two small host touches the owner asked for (nav item after
Games, home CTA). No redesign of unrelated pages. No DDL apply, no DB writes to existing tables,
no push. No "while I am here". If you find a real adjacent bug, name it in the REPORT as a
candidate, do not fix it.

## PROOF BATTERY (docs/proofs/tierlist/, prove on `next build` + `next start`, never dev)
1. Pixel parity: a screenshot of each built screen beside its `docs/design/tier-list/*.dc.html`
   reference; call out any intentional deviation.
2. No emoji: `grep` proof that no emoji codepoint ships in the tier-list source (icons are SVG).
3. Render mode: the route table showing hub + public list pages as static/ISR (o / dot), the
   maker as its client shell, and the OG route as a route handler; the `(site)` group intact.
4. Create-from-blank works with zero bank items (the forced-choice path is not the only path).
5. Share: the exported PNG (attach it) with the kpopquiz.org watermark; Web Share invoked;
   9:16 variant.
6. Published + community: a public list page renders static, appears in the community surface,
   and the fandom-agrees aggregate is real data (show the query).
7. Tests: the full run output; green for everything not gated on the migration, with the gated
   set named.
8. All five SEO gates green. No URL changed. No em dashes anywhere.

## WHEN DONE
Update `docs/loop/REPORT.md` describing exactly what shipped, what each test covers, which two
owner gates remain (apply migration, push), and any part you did not finish (say so plainly and
why). Recompute every number before you write it. Do not push. No DDL applied. No em dashes.
