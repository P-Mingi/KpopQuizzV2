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

w7d-ci blocker RESOLVED 2026-08-16 (W7-CLOSE) WITHOUT a service role key. Measured table
by table: anon returns identical counts to service role for everything the non-verse
sitemap batch needs (quizzes 400=400, groups 88=88, games 24=24, tot_categories 20=20,
pulse_reports 1=1, songs 4120=4120). The non-verse sitemap and check:indexability now run
on the anon key, and .github/workflows/seo-gates.yml runs all three gates nightly on the
two secrets the repo already had. NO new key requested. Outcome (b): coverage is 684 of
705 non-verse URLs. See docs/proofs/w7-close/.

CORRECTION to what the w7d-ci entry claimed: it said "6 of the 7 existing workflows
already have failure notification wired". That was WRONG. The grep matched DISCORD_TOKEN,
which is those workflows' own bot credential, not a failure hook. NO workflow in this repo
notifies on failure. The new workflow posts to a Discord webhook on failure and no-ops
when the secret is absent.

## graphify-trial - the tool is not installed, so the trial cannot run

- What is blocked: the whole GRAPHIFY TRIAL mission. The mission opens "The owner installed
  Graphify", and on this machine it is not installed. I did not install it myself: that is
  the owner's decision, the previous bus listed "whether to trial Graphify" as owner-pending,
  and last session the permission classifier blocked me from even checking the prerequisites.
- Why (evidence, all negative, docs/proofs/graphify-trial/not-installed.txt):

      graphify binary        not on PATH, absent from ~/.local/bin, ~/.cargo/bin,
                             /opt/homebrew/bin, /usr/local/bin
      uv                     NOT INSTALLED (the README's recommended installer)
      pipx                   present, but holds only certbot
      python package         import graphify -> ModuleNotFoundError
                             pip show graphifyy -> not found
      skill registration     none under ~/.claude/skills; the project's 12 skills
                             include no graphify; not mentioned in ~/.claude/settings.json
                             or ~/.claude/CLAUDE.md
      build artefact         no graphify-out/ or .graphify/ in the repo

- What unblocks it, two commands, owner-run:

      brew install uv          # or: pipx install graphifyy, since pipx is already here
      uv tool install graphifyy
      graphify install         # registers the skill with Claude Code

  Note the README's recommended path needs `uv` first and `uv` is absent, so this is three
  steps rather than two. `pipx install graphifyy` skips that, since pipx already works.
- One thing worth deciding before it runs, because the mission asks and it is cheap to get
  wrong: `graphify-out/` should be **gitignored**. It is a derived artefact of a codebase
  that changes every commit, so a tracked copy is stale the moment anyone merges, and a
  stale graph that nobody notices is exactly the failure mode this trial exists to test for.
  If it is ever tracked, it needs a freshness gate the way check:docs-secrets guards docs,
  not a human remembering to rebuild.
- Recommendation: install via pipx (one command, no new installer), then re-issue the trial
  unchanged. The answer key in the mission is good and I would rather run it than rewrite it.
- Proof / context: docs/proofs/graphify-trial/not-installed.txt

## w5-report-figures - two figures in the shipped draft do not match the report's own window

- What is blocked: pitching the report, and the owner's push of this page while it says
  these two things. NOT the build: the page is built and the draft is shipped verbatim as
  instructed. I did not fix either figure, per the mission.
- Why this matters more than usual: both are checkable by anyone who clicks the dataset
  link the report itself provides, and the second one is internally inconsistent with the
  sentence it sits in. A Tier 1 journalist can be approached once.

**1. The perfect-score and zero-score shares are all-history, not the window.**

    Draft: "Across the whole window, one attempt in five is a perfect score, and 2.1%
            score zero."

    Recomputed just now against the live table:
      May-Aug (the report's window, n=17,435):  perfect 35.9%   zero 0.6%
      All history (n=59,417):                   perfect 20.6%   zero 2.1%

  20.6% and 2.1% are the all-history figures from dataset section G5. The report's whole
  method section is about excluding 70.7% of that history, so quoting a statistic computed
  on it contradicts the paragraph three sections above. In-window, "one attempt in five" is
  actually closer to one in three.

**2. "published quizzes per group run from 3 to 27" does not hold for 21 groups.**

    Draft: "Across the 21 groups compared here ... published quizzes per group run from
            3 to 27."

    Recomputed: across those 21 groups the range is 3 to 152. The maximum is general-kpop,
    a catch-all bucket rather than a group, with 152 published quizzes. Excluding it the
    range is 3 to 27, but that is 20 groups, not 21.

  So the sentence is right about the numbers or right about the count, not both. Dataset
  section Q lists all 21 rows including general-kpop at 152.

- Options: 1) Correct both in the draft and I re-ship it verbatim: "roughly one in three"
  and "0.6%", and either "20 groups" or "3 to 152". 2) Keep the all-history framing but say
  so explicitly, e.g. "across our whole history". 3) Ship as-is and accept that the dataset
  published alongside contradicts the report in two places.
- Recommendation: 1. Both are one-line edits in the draft, both are yours to make since the
  content is not mine to change, and 3 spends a Tier 1 approach on a piece with a
  self-refuting number in it.
- Proof / context: docs/proofs/w5-part1/draft-figure-check.txt, dataset sections G5, N and Q.

## w5-docs-pii - two personal email addresses are in ALREADY-TRACKED docs, and already on origin

- What this is: an owner decision, not a blocker on W5-DOCS. The allowlist work is done and
  none of the 101 files I added contains a personal address. This is about files that were
  already tracked before this mission.
- The finding, by LOCATION not by value (the standing rule this incident created):
  `docs/VERSE-WORKING-SYSTEM-V2.md:112` and `:114` carry two owner email addresses, and
  `docs/VERSE-LEDGER.md:97` carries one of them. They are used as Supabase ORG identifiers,
  in notes explaining which org a token can reach, not as contact details.
- Why it matters now: this mission exists because a doc with a private address must not
  become tracked in a repo that will be pushed. Two already are, and
  `VERSE-WORKING-SYSTEM-V2.md` is in `origin/main` history via commit bbce579, so they are
  already on the remote. The repo is private today; if it is ever made public they go with it.
- Why I did not fix it: removing the strings from the working copy would not remove them
  from history, so it would look fixed while not being fixed. Actually clearing them needs a
  history rewrite (git filter-repo or BFG) plus a force-push, which is far outside a mission
  whose scope is `.gitignore` and which forbids pushing.
- Options (each with its trade-off):
  1) Leave them. The repo is private and they are org labels, not credentials. Zero work,
     and the exposure is real only if the repo ever goes public.
  2) Replace them in the working copy with a placeholder like `<owner-org>` and commit that.
     Cheap, stops them spreading into new docs, but history still holds them.
  3) History rewrite + force-push. The only option that actually removes them. It rewrites
     every commit hash and needs coordination, and there are 44 unpushed commits sitting on
     top right now, so this is the worst possible moment for it.
- Recommendation: 2 now, and only consider 3 if the repo is ever going public. Doing 2 costs
  a minute and means no future reader copies the address into a new doc.
- Proof / context: docs/proofs/w5-docs/, and `git log origin/main -- docs/VERSE-WORKING-SYSTEM-V2.md`

## w7-close-2-degrade - createServiceRoleClient throws instead of degrading (candidate mission)

- What this is: a candidate, not a blocker. Recorded because W7-CLOSE-2 measured it and was
  told not to widen scope.
- The finding: `@supabase/supabase-js` throws `supabaseKey is required.` at CONSTRUCTION
  when the key is absent, and `createServiceRoleClient()` is called as a bare statement
  outside any `safeFetch` in two public pages: `src/app/pt/games/page.tsx:36` and
  `src/app/blindtest/leaderboard/page.tsx:69`. Measured with the variable absent, both
  return HTTP 500 while the rest of the site serves 200, and `/pt/games` is in the sitemap.
- Why it is not urgent: production always has the key, so both pages serve 200 there
  (verified this mission). CI is covered by the placeholder in the workflow env.
- Why it is still worth doing: a missing env var should degrade a section, not 500 a public
  page. The same shape exists anywhere else a bare `createServiceRoleClient()` sits outside
  a guard.
- Size: it touches every caller of the factory, which is why it was not done inline.
- Proof / context: docs/proofs/w7-close-2/part1-ci-condition.txt

## w7-close-1 - the nightly will be RED on its first run, for a reason you already own

- What is blocked: `check:metadata-dupes` going green in CI. Under CI conditions it
  reports exactly 1 collision group, and it is the SEVENTEEN duplicate already recorded
  in `w1-ctr` below: /q/seventeen-true-or-false and /q/seventeen-true-or-false-65 render
  the identical title. (Locally it reports 8, because 7 more are /verse pages that fall
  out of the sitemap under anon.)
- Why (owner decision): no metadata template can invent a difference that is not in the
  data. It is a catalogue edit, not a code one, and it is your call, exactly as w1-ctr
  says.
- Why it matters MORE now than when it was filed: a nightly that is red from day one for
  a known reason is how a team learns to ignore a red nightly. The gate would be
  training people to skip it before it ever catches anything real.
- Options: 1) retitle one quiz in the admin (30 seconds, fixes the cause, w1-ctr's own
  recommendation). 2) merge the workflow anyway and accept a red nightly until then.
  3) hold the workflow until w1-ctr is cleared.
- Recommendation: 1, then the nightly is green on its first run. If that cannot happen
  before the push, 3 over 2: an unmerged workflow is honest, a permanently red one lies.
- Proof / context: docs/proofs/w7-close/gates-under-anon.txt

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
