# REPORT - TIERLIST: foundation shipped, feature NOT complete. Stopped at a clean boundary. No push.

Repo guard: `git remote -v` = `https://github.com/P-Mingi/KpopQuizzV2.git`. The index.lock
was removed as the owner noted. No DDL applied, no DB writes, no push. Proofs:
`docs/proofs/tierlist/`.

## The honest headline

This is a multi-session feature (10 pixel-perfect screens, a full backend, a share/OG
pipeline, community integration, and an automated-test suite). It cannot be built to the
mission's bar in one session. Per the mission's own instruction - "a half-built, untested
feature merged is the worst outcome; STOP at a clean phase boundary and REPORT" - I built
and tested the BACKEND FOUNDATION and stopped there. The 10 screens, the maker, share,
publish and community are NOT built. This report says exactly what shipped and what did not.

## What shipped this session (tested, committed)

1. **Migration `supabase/migrations/146_tier_lists.sql`** (owner-gated, WRITTEN not applied):
   - `tier_lists` (id, slug unique, creator_id nullable, anon_id, subject_group_id ->
     groups(id), subject_kind check, title, tiers jsonb, placements jsonb, visibility
     check, views, likes, timestamps). RLS: public/unlisted world-readable, private
     creator-only, writes creator-only; a CHECK forbids an anonymous PUBLIC list.
   - `tier_list_assets` (custom uploads, status pending/approved/rejected) with
     read-approved-or-own RLS.
   - public storage bucket `tier-list-assets` (public read, service-role writes), mirroring
     the avatars bucket (migration 103).
   - Verified against the real schema (PART 0): groups.id is integer, profiles.id is uuid.
2. **The pure tier-list library** `apps/quiz/src/lib/tier-list/`:
   - `types.ts` (item/tier/placements/row shapes), `defaults.ts` (the design's tier
     palette S #E8457A / A #F5894D / B #EBB33E / C #5FA65A / D #4F9BD9, F available),
   - `serialization.ts` - the load-bearing invariant that every item sits in exactly one
     bucket across tiers + the unranked tray, surviving DB round-trips, remixes and tier
     edits,
   - `slug.ts` - slug generation + collision-safe uniqueness (DB unique is the final guard),
   - `aggregate.ts` - the "where the fandom agrees" consensus math (modal tier + agreement,
     unranked casts no vote), pure, ready to run under `unstable_cache`.
3. **Unit tests** `apps/quiz/scripts/check-tier-list.mts` (`npm run check:tier-list`): 24
   assertions over serialization, slug and aggregate. All green (`docs/proofs/tierlist/
   unit-tests.txt`). Written as a tsx assertion script because the repo has NO test harness
   (see PART 0), not vitest/playwright.

## What did NOT ship (named plainly, with the plan)

None of the user-facing feature exists yet. Remaining phases, each its own clean boundary:
- **Bank read layer**: the uniform `{id,kind,name,image_url}` reader over groups/idols/
  albums/songs per subject+what-to-rank (pure of DB tables it already has - buildable and
  unit-testable now; deferred only for time).
- **Discovery**: nav "Tier Lists" item after Games; Home CTA band (Home.dc.html); Hub page
  under `(site)` static/ISR (Hub.dc.html).
- **Create wizard**: CreateSubject (+ Start blank, first-class), CreatePool, ImportModal.
- **The maker**: desktop drag-and-drop + mobile tap-to-place (Main.dc.html / MakerMobile),
  toolbar, undo/redo, autosave.
- **Share**: the OG edge route (satori) for the 600px card + watermark, ShareSheet (Save
  PNG, Copy link, Web Share, 9:16 Story, Challenge), ResultCard.
- **Publish + community**: PublicView page (static/ISR) + the fandom-agrees aggregate wired
  into the existing Community surface + Remix/Make-your-own.
- **CRUD + moderation** server actions; **e2e** tests (need a harness - see below).

## Two owner gates (unavoidable) plus one decision

1. **Apply migration 146** (Supabase MCP refuses this session; DDL is the owner's). Until
   then no DB-backed path runs live and the CRUD/bank/OG tests stay gated.
2. **Push** (owner only; nothing pushed).
3. **NEW - the test-harness decision.** The mission assumes a Playwright/unit harness that
   does not exist in this repo (no vitest, no @playwright/test, no test script; only the
   tsx check:* gates). I did not add a harness dependency unilaterally (scope fence + "no
   new deps" posture). The owner must decide: add vitest + @playwright/test (a real dep
   addition) so the required e2e suite can exist, or keep the tsx-assertion idiom for unit
   logic and accept that browser e2e is out of reach without that dep. All future TIERLIST
   phases' testing depends on this call.

## Deviations / flags

- Design "six default tiers S-D" is internally inconsistent (S-D is five rows; the artboard
  renders five). `defaults.ts` follows the RENDERED five (S,A,B,C,D) with F as an addable
  colour, noted in the code and here.
- The mission's migration numbers (154/155, 067/068) did not match the repo; real max is
  145, so the file is 146. Named so the owner is not surprised.
- No SEO gates were run this session: no route, sitemap, metadata or page shipped, so there
  is nothing for indexability/orphans/metadata-dupes to newly cover. They must run once the
  discovery/public pages exist (a later phase).

## Proofs (docs/proofs/tierlist/)

- `unit-tests.txt` - 24/24 green.
- `part0-findings.txt` - schema + harness reality, verified not assumed.
- No emoji in the shipped tier-list source (grep over the emoji codepoint ranges: 0 hits).
- No em dashes in anything written this session.

---

STOP. Foundation only: the owner-gated migration (correct shape, verified schema), the pure
tier-list library, and green unit tests. The feature itself - every screen, the maker, share,
publish, community - is NOT built and is named above as remaining. Nothing applied, nothing
pushed. This is a clean boundary, not a finished feature.
