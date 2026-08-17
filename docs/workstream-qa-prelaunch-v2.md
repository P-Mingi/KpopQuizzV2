# QA-PRELAUNCH V2 - the final gate before THE PUSH

## Claude Code Implementation Prompt

---

Supersedes workstream-qa-prelaunch.md (which predates V3+V4). The last
gate before the ~115-commit stack ships. Everything built since the first
QA exists now: the Verser rebrand, V-HOME, the page universe (V-PAGES),
Build mode (V-MODES), three flagships (V-ATLAS, V-CARDS-MAX,
V-ESSAYS-MAX), V-PROFILE-ONE, V-COMM-3 threads, and the V-TRUST covenant.
Migrations 140-144 are applied to prod. This sweep FIXES only mechanical
failures; anything needing judgment gets REPORTED with severity. When in
doubt: report, do not decide.

Hard rules: NO em dashes. No new deps, no migrations, no schema changes.
NO push. Commit fixes in small labeled commits (qa: ...). Real data only;
if a number looks wrong, verify against a hand-run query, never adjust
data to match display. Play triple-proof (head byte-diff + layout probe +
screenshot) on every sweep that could touch chrome.

## Sweep 0 - the hard-won-bug-class audit (run these FIRST, everywhere)

This project learned specific failure classes the expensive way. Grep and
probe the WHOLE Verse surface for each, because each has bitten us more
than once:

1. ISR-BAKES-A-LIE: any page-defining server read (getSpace, quests,
   directory, awards, deck, profile, atlas graph) must THROW on query
   error, never fail-soft into a baked degraded page cached for an hour.
   Audit every server read on an ISR/static Verse route; list any that
   swallow errors.
2. FAIL-OPEN PRIVACY: any visibility/opt-in read (profile sections, card
   shelf, feed opt-in) that fails must default to PRIVATE, never
   republish protected content. Re-prove the V-PROFILE-ONE fix holds.
3. MIDDLEWARE ALLOWLIST: every public route (incl. every new one:
   /verse/promises, /verse/{g}/community/{thread}, wiki leaves, card
   pages, essay pages, atlas) must be reachable logged-out and NOT 301
   to home. Enumerate and probe all logged-out.
4. STORED XSS IN LD/HTML SINKS: any user-authored string reaching a
   JSON-LD script or dangerouslySetInnerHTML must be escaped at the sink
   (re-prove the V-COMM-3 fix; grep every jsonld caller + every raw HTML
   sink across Verse).
5. 1000-ROW POSTGREST CAP: any unscoped .in()/.select() over a table
   that grows unboundedly (verse_content, verse_page_links, discussions,
   plays) must be space-scoped or paginated. Grep for unscoped reads.
6. FABRICATED DATA: grep for any placeholder/seeded/fake user, count, or
   date reaching a public surface. Real data only; zeros min-gate.

Report each class as a table: surface, status, fix (if mechanical) or
severity (if judgment).

## Sweep 1 - routes + auth

- Enumerate EVERY route (check:routes). Fetch each logged-out AND as
  member/contributor/curator (the two dev accounts). Public pages 200,
  gated pages correct, zero public 301-to-home.
- Build mode: the toggle invisible without rights; builder surfaces
  (quests, studio, roles, review, essay-manage) noindex + reachable only
  in mode; logged-out sees the reader nav only.
- Dev accounts: all login variants 404 in the production build (re-prove).
- 404 + error pages branded, both worlds, all breakpoints.

## Sweep 2 - SEO (protect what ranks + the new volume)

- Head-tag byte-diff on the ranking Play pages (games home, /bts-quiz +
  3 hubs, /quizzes, /blindtest) vs LIVE prod: identical or a listed diff.
- The NEW indexable volume: sample song pages (~1400), wiki leaves, card
  pages, essay pages, the atlas Index view, /verse/promises. Each must
  carry unique signals (not thin doorways): title, real content, JSON-LD.
  Song pages especially: confirm credits/era/deck context make them not
  doorway pages. Report the thin-page risk honestly.
- Sitemap: every URL 200, no draft/unpublished/stub leak, the new
  surfaces present, counts sane. JS-off: the atlas Index + folded prose
  serve full crawlable HTML.
- robots/llms/canonicals correct; private profiles + drafts noindex.

## Sweep 3 - Verse integrity + the flagships

- Living-persons: grep + form proofs across every kind (wiki, essays,
  cards, threads): no excluded-content path.
- Publish gate: drafts/unsourced unreachable publicly (probe known drafts
  across pages, essays).
- Min-gate audit: crawl the 3 launch spaces + showcases; ZERO empty
  sections / ghost modules / dead widgets across ALL new surfaces
  (binder, shelf, atlas mini-map, feed, profile sections).
- CARDS: binder private to others (probe), shelf opt-in default OFF,
  counts-only (no names), no price/trade/upload path (grep).
- ESSAYS: hero one-per-space, series approve-gated, reactions one-per-user,
  no image-upload path.
- ATLAS: readers get zero wanted-node refs (probe), deterministic layout,
  neighborhood cap holds.
- PROFILE: fresh profile blank to strangers, every section default
  private (new profiles), cohort-default honored, stranger sees only
  opted-in.
- THREADS: every discussion has a working permalink; moderation
  (banned-terms + flags + block) fires on threads AND replies.
- Account-deletion cleanup covers ALL new tables (verse_binders,
  verse_profile_shelf, verse_profile_shelf_settings,
  profile_section_visibility, essay series/reactions, threads): seed ->
  delete -> gone, per table.

## Sweep 4 - Play regression (do not break the money)

- Full player journey: home, quiz, result, ResultLoop (incl. Verse
  cross-link), share. One quiz, one blindtest, one game.
- Community: feed, comment (delete test data), debate vote, rankings
  threshold-30 provisional.
- Creation: create a quiz as a normal user (title mandatory, group
  picker, share), then delete.
- The Play/Verse toggle: 6 sample URLs -> correct world; cookie
  deliberate-click only; deep landings never redirected. Play triple-
  proof holds.

## Sweep 5 - visual + a11y + perf

- Screenshot matrix: key templates (space home, idol, album, song, wiki
  leaf, atlas, binder, shelf, essays index, essay, profile, promises,
  community, thread) x 3 breakpoints x light/dark. Flag broken; fix only
  mechanical CSS.
- Contrast guardrail: re-prove across the 6 presets + a hostile-accent
  space (the ink-floor law); the atlas ink; the covenant page.
- A11y on every new interactive surface: binder drag keyboard fallback,
  atlas keyboard travel + announcements, thread nav, profile toggles,
  Build toggle aria-pressed, reduced-motion (atlas static).
- Perf: build symbols unchanged (static stays static); LCP/CLS spot-check
  on games home, a hub, a showcase space, a song page, the atlas; lazy +
  sized images (no CLS).

## Sweep 6 - platform hygiene

- Em-dash grep over apps/quiz/src AND all docs: zero.
- Migrations: local files 001-144 contiguous; prod schema matches (list
  applied, diff against files).
- Crons smoke: verse-refresh, monthly pulse, spotify-snapshot
  (quiet-skip): expected no-op/ok, no side effects.
- External hosts audit: grep every runtime fetch host; all on the known
  list (incl. coverartarchive.org, youtube-nocookie); flag any new.
- Console errors: zero on key templates.
- Test data: everything created during QA deleted; list + confirm.

## Sweep 7 - fresh eyes (report only, fix nothing)

Walk the 3 launch spaces + both showcases as a first-time fan from
Google, landing on a deep page (a song, a wiki leaf, an idol). 5 honest
bullets per space: what confused, what delighted, what looked empty or
broken, whether you would join and whether you would contribute. Owner
input for launch-copy; no fixes.

## Permitted loops (per LOOP-CHARTER)

QA SWEEP class: run checks, fix MECHANICAL failures, re-run · MAX 6 per
sweep · STOP IF a fix needs judgment/design/policy/schema · REPORT
iterations per sweep.

## Verify (the exit bar)

- [ ] All 8 sweeps run; every item pass or a listed exception with
      severity (blocker / launch-ok / post-launch)
- [ ] Sweep 0 bug-class audit: every class swept, every hit fixed or
      reported
- [ ] Zero blockers open, or each blocker reported with a proposed fix
- [ ] tsc, full build, check:routes green on the final commit; migrations
      001-144 contiguous and prod-matched
- [ ] The fix-commit list is small, labeled qa:, nothing non-mechanical

/caveman report per sweep: pass/fail table, the bug-class audit table,
fixes made (commits), exceptions with severity, the fresh-eyes bullets
verbatim, the head-tag diff verdict, the account-deletion cleanup proof
per table, screenshots. This is the last gate before THE PUSH:
thoroughness beats speed. If anything is ambiguous, STOP and report.
