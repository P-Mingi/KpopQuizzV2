# BLOCKED (message bus)

The worker writes here ONLY when it hits a real blocker (ambiguity it cannot
resolve from the spec/code, a gate it cannot pass honestly, or a decision that
belongs to the owner) and then STOPS. It never guesses through a gate.

Format for an entry:

```
## <step-id> - <one-line blocker>
- What is blocked: ...
- Why (the specific gate / ambiguity / owner decision): ...
- Options (each with its trade-off): 1) ...  2) ...  3) ...
- Recommendation: ...
- Proof / context: docs/proofs/<step-id>/ (if any)
```

When resolved, the worker clears the entry and continues.

---

w3-partA blocker CLEARED 2026-08-15: the owner applied migration 155, so
`plays.anon_id` and `battle_results.anon_id` both exist (verified live). PART A is
unblocked and not yet built.

w2-notify blocker CLEARED 2026-08-15: migration 154 is applied. Re-probed with
controls, `battle_beaten` inserts cleanly and a bogus type is still rejected
(docs/proofs/w2c-supply/partC-mig154-reprobe.txt).

w7b-orphans blocker CLEARED 2026-08-16 (W7c): all 64 are closed. 53 blindtest playlists
are now linked from /blindtest (the index links what it indexes); 3 unplayable ones were
removed from the sitemap instead (the-boyz 9 songs, miss-a 0, psy 0, against a 10-song
round); /trending, /new and /most-liked are linked from /quizzes. The other 8 were never
orphans at all: a sampled crawl that skipped index pages invented them. check:orphans now
passes UNSCOPED on a complete crawl of all 679 non-verse sitemap URLs, and the scope flag
was deleted rather than narrowed. See docs/proofs/w7c-orphans/.

## w7d-ci - the three gates cannot run in CI: the repo has no service-role secret

- What is blocked: PART 1, automating `check:indexability`, `check:metadata-dupes` and
  `check:orphans`. All three grade a RUNNING app, so CI must build and boot it, and the
  build needs DB credentials this repo does not hold. Per the mission I did not stub the
  check, did not point it at production, and did not commit a workflow that would fail on
  its first run.
- Why (owner decision): measured, not assumed. `.github/workflows/` holds 7 files, all
  content crons, and between them they reference exactly 5 secrets:
  `DISCORD_TOKEN`, `GUILD_ID`, `INDEXNOW_TOKEN`, `QUIZ_SUPABASE_URL`,
  `QUIZ_SUPABASE_ANON_KEY`. The app needs these to build and serve:

      NEXT_PUBLIC_SUPABASE_URL        <- QUIZ_SUPABASE_URL can supply this
      NEXT_PUBLIC_SUPABASE_ANON_KEY   <- QUIZ_SUPABASE_ANON_KEY can supply this
      NEXT_PUBLIC_SITE_URL            <- not a secret, can be a literal
      SUPABASE_SERVICE_ROLE_KEY       <- MISSING, and it is the one that matters

  `sitemap.ts` builds through `createServiceRoleClient()`. Without the service-role key
  the sitemap falls back to STATIC-ONLY, and `check:orphans` would then grade a sitemap
  with every quiz, group and playlist URL missing: a green that means nothing. That is
  the specific reason this is a block and not a "try it and see".
- What I DID do (safe, no fabrication): `check-indexability.mts` hard-required a
  `.env.local` FILE, which is gitignored and can never exist in CI. It now falls back to
  `process.env` when the file is absent. Same variables, read from wherever they live.
  This removes one blocker; the missing secret remains.
- Options (each with its trade-off):
  1) Add `SUPABASE_SERVICE_ROLE_KEY` as a GitHub Actions secret, then a nightly workflow
     builds the app, boots it on :3021 and runs all three gates. Trade-off: a
     service-role key in CI is a real secret-surface increase, and it is read-write. It
     would be used only by a scheduled job on this repo.
  2) Run the gates against the deployed production URL instead of a CI build. No secret
     needed for the HTTP checks. Trade-off: `check-indexability` still needs DB reads for
     its inverse test, and grading production tells you a page is already broken for
     users rather than catching it before merge.
  3) Leave them manual. Free, and it is what we have today. Trade-off: three missions of
     assertions that cannot fail anything, which is what this mission called a document.
- Recommendation: 1, nightly, plus the visibility answer below. If the service-role key
  in CI is not acceptable, 2 is a genuine second best for orphans + metadata-dupes (both
  are pure HTTP), and `check:indexability` stays manual.
- VISIBILITY, since a red nightly nobody looks at is the likely outcome: 6 of the 7
  existing workflows already have failure notification wired, and the repo has
  `DISCORD_TOKEN` plus the app has `DISCORD_FLEX_WEBHOOK_URL`. The nightly should post to
  the same Discord channel on failure ONLY, naming the gate and the offending URLs. A
  GitHub Actions email nobody reads is not a notification.
- Proof / context: docs/proofs/w7d/ci-env.txt

## w4b-item3 - the partner attribution log has nowhere to write

- What is blocked: spec section 9's `partner=` log. The parameter reaches the embed page
  and is already carried into the snippet's URLs, but there is no table to record it in,
  and this mission forbids DDL.
- Why (owner decision): probed live today, none of these exist: `embed_views`,
  `embed_log`, `partner_embeds`, `share_events`, `events`. Nothing else in the schema is
  an appropriate home: writing embed impressions into `plays` or `game_plays` would
  corrupt the play counts that feed /stats and the W5 data-PR play, which is exactly the
  asset the covenant protects.
- The exact shape, ready to apply:

    CREATE TABLE public.embed_views (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      quiz_id     uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
      partner     text NOT NULL,              -- sanitised to [a-z0-9-], max 32
      referer_host text,                      -- host only, never a full URL
      created_at  timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX embed_views_partner_idx ON public.embed_views (partner, created_at DESC);
    CREATE INDEX embed_views_quiz_idx    ON public.embed_views (quiz_id, created_at DESC);
    -- service-role writes only; no RLS insert policy, matching creator_notifications.

- Options (each with its trade-off):
  1) Apply the table above. The log becomes a real fire-and-forget insert on the embed
     render. Trade-off: one row per embed view, so it grows with success and will want a
     retention cron like notification-prune.
  2) Aggregate instead of logging rows: a per-partner counter table upserted on view.
     Cheaper to store, but loses the time series that makes "which partner actually sent
     traffic" answerable.
  3) Skip it and rely on the utm tags already on the outbound links. Free, and they
     already work, but it only measures partners whose readers CLICK, never how often the
     widget was merely rendered.
- Recommendation: 3 now, 1 when a real partner exists. The utm tags already answer the
  question that matters at zero partners, and an empty table with a retention job is
  cost before value. Worth saying plainly: this is the one item of W4b I would not build
  yet even if the DDL were free.
- Proof / context: docs/proofs/w4-embed/, spec section 9.

## w1-ctr - the new duplicate-metadata gate is RED on a duplicate quiz the code cannot honestly split

- What is blocked: `check:metadata-dupes` cannot go green on the quiz side. One collision is left
  after every template fix: `/q/seventeen-true-or-false` and `/q/seventeen-true-or-false-65` render
  the identical title `SEVENTEEN true or false · 7 questions | KpopQuiz`.
- Why (owner decision): both rows are `status = published`, both are literally titled "SEVENTEEN
  true or false", both have 7 questions. They differ only in difficulty (medium vs easy), plays
  (257 vs 351) and creation date (2026-03-23 vs 2026-04-01). No metadata template can invent a
  difference that is not in the data, and inventing one would break the honesty gate. This is a
  CATALOGUE decision, not a code one.
- Options (each with its trade-off):
  1) Retitle one quiz in the admin (e.g. "SEVENTEEN true or false: hard mode"). Cheapest, keeps both
     quizzes and both URLs, fixes the collision at the source. Loses nothing.
  2) Unpublish the weaker one (the older medium, 257 plays) and 301 it to the survivor. Best for
     crawl budget, but deletes a page that has real plays.
  3) Add difficulty to the `/q` title template for every quiz. Fixes this pair mechanically but
     lengthens all 400 titles for one collision, and two quizzes could still share a difficulty.
- Recommendation: 1. It is a 30-second admin edit and it fixes the actual problem (two pages telling
  Google the same thing) instead of papering over it.
- Also awaiting the owner, NOT blocking this sprint: 7 collision groups in `/verse/*`, including 228
  URLs that all render the space-level description "The ARMY home on KpopVerse: ...". Verse is
  paused and out of this mission's scope, so it was left untouched. It needs its own pass when Verse
  resumes.
- Proof / context: docs/proofs/w1-ctr/partD-dupes.txt · docs/proofs/w1-ctr/partD-q-collisions.txt

push-gate-1b blocker CLEARED: owner ruled the four conflict groups (L-084); the merge was
re-run and the rulings applied EXACTLY (merge commit ae93720), the gate re-proven at the merged
tip, main left strictly ahead of origin/main. See docs/proofs/push-gate-1/ + the step entry in
docs/loop/REPORT.md. One flagged fallback: the Pinterest manifest/csv regeneration timed out, so
remote's committed artifacts shipped as-is (refresh with scripts/generate-question-pins.mts).
