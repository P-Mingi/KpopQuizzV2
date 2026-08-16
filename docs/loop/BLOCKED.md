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

## w7b-orphans - the gate found 64 MORE orphans, in two classes this mission did not scope

- What is blocked: taking `check:orphans` GREEN unscoped, and therefore wiring it into CI
  as a blocking gate. It currently exits 1 on 64 real orphans. The group-hub class this
  mission fixed is fully closed (7 detected before, 0 after), so the gate is honest and
  the remaining 64 are a genuine, previously unmeasured finding.
- Why (owner decision): fixing them is outside this mission's stated scope ("the new
  directory route, the home rail link, the new CI script, sitemap registration, route
  allowlist"), and the biggest class needs a product call, not a mechanical edit.
- The classes, measured in the served HTML:
  1) **53 blindtest playlists** (`/blindtest/*`). Cause confirmed, not guessed: `/blindtest`
     serves 45 links and **zero** of them point at any `/blindtest/` playlist. The index
     page does not link its own children in HTML at all. This is the same shape as the
     group-hub bug and it is bigger.
  2) **5 name-all playlists** (`/games/name-all/name-all-{babymonster,got7,nct-dream,nmixx,treasure}`).
     Their siblings are linked, these five are not.
  3) **6 landing/index pages**: /trending, /new, /most-liked, /kpop-quiz-2026,
     /guess-the-kpop-idol, /data/pulse/2026-07.
- Options (each with its trade-off):
  1) Link playlists from `/blindtest` (and name-all from `/games/name-all`), the same
     structural fix as /groups. Closes 58 of 64 at the source and is the one I would do.
     Trade-off: it is a real design change to two index pages, not a one-line edit.
  2) Add a nav/footer link for the 6 landing pages. Cheap, but a footer link is the
     weakest kind of internal link and it does not touch the 58.
  3) Drop the orphans from the sitemap instead. Fastest way to green and the worst
     outcome: it hides the problem by un-advertising real pages.
- Recommendation: 1 for the two index-page classes, then 2 for the remaining 6, then the
  gate can go green unscoped and become blocking. Until then it is wired as a script and
  can be run scoped (`ORPHANCHECK_SCOPE='^/[a-z0-9-]+-quiz$'`) to block on the class that
  is already fixed, so the ratchet only tightens.
- Proof / context: docs/proofs/w7b-directory/gate-unscoped-after.txt (all 64 by URL),
  gate-RED-before.txt (71 before), PROOFS.md.

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
