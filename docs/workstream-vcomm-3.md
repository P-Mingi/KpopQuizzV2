# V-COMM-3 - the community center v3 (threads + the cross-space feed)

## Claude Code Implementation Prompt

---

Per VERSE-ROADMAP-V3.md (V-COMM-3) and the routed V-PAGES finding
(discussions have no thread route or permalink). Owner decision locked:
real threads + permalinks AND the cross-space activity feed
(space-highlights-into-global). Runs AFTER V-PROFILE-ONE and REUSES its
identity resolver + activity model (do not rebuild them).

Hard rules: NO em dashes. Commit per step, do NOT push. No new deps. ONE
migration budget (threads + any feed opt-in), owner-run, stop-and-wait.
Real activity only, min-gated. Banned-terms + flags + block state apply
to every posting surface. No user-facing AI. Dual-skill design. Play
triple-proof.

## Steps

1. MIGRATION (the one): a thread model giving each discussion a real
   route + permalink (thread id/slug, title, space ref, created_by,
   timestamps) + reply linkage; per-space opt-in flag for surfacing
   highlights into the global feed. Reuse existing discussion rows where
   possible (migrate, do not orphan). CHECK prod for next free number.
   STOP, owner runs.
2. THREADS: every discussion becomes an addressable thread
   (/community or /verse/{group}/community/{thread}), shareable
   permalink, reply view, the existing comment machinery reparented,
   watchlist + notify on reply (existing rails). Bylines via the
   V-PROFILE-ONE resolver (role badges, profile links). Commit.
3. THE CROSS-SPACE FEED: the shared Community hub gains a live feed from
   the activity model (V-PROFILE-ONE): new pages, published essays,
   space events (comeback countdowns), top discussions: per-space opt-in
   controls what surfaces. Play-world community events (daily debate,
   war map) sit alongside Verse events: one community, two products.
   Min-gated. Commit.
4. CROSS-PROMO MODULES: a "your spaces" strip for members, a "claim a
   space" invite for non-members, the featured/newest discussion widget
   (duality: home-widget version). Commit.
5. STOP: owner review. Matrix: a thread with its permalink + replies,
   the cross-space feed (member vs logged-out), the space-highlight
   opt-in, the home widgets, mobile. 3 breakpoints x light/dark.
6. Closing sweep after approval: dual-skill audit, a11y (thread
   navigation, feed keyboard), SEO (threads indexable per policy, feed
   not a thin doorway), moderation proof (banned-terms + flags + block
   fire on threads), gate suites, Play triple-proof, full build, em-dash
   grep, check:routes. Commit.

## Verify

- [ ] Every discussion has a permalink that loads the thread directly
      (share test); old discussion rows migrated, none orphaned
- [ ] Cross-space feed is real activity via the shared model, min-gated,
      per-space opt-in honored (probe a non-opted space stays out)
- [ ] Bylines everywhere use the V-PROFILE-ONE resolver (no rebuild)
- [ ] Moderation: banned-terms, flags, block state all fire on threads
      and replies (gate tests)
- [ ] Play community events coexist with Verse events; Play byte-proof
      holds
- [ ] Widgets distinct + min-gated; suites green; tsc/build/routes
      green; zero em dashes; no new deps; exactly one migration

/caveman report per step; step 1 STOP (migration), step 5 STOP (owner).
