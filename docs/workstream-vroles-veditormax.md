# V-ROLES-CLEAR + V-EDITOR-MAX - the contributing product's final form

## Claude Code Implementation Prompt

---

V3 step 4. Read: VERSE-ROADMAP-V3.md (both sections), the W4 roles stack
(space_members, contrib_xp, suggest queue), the W3 editor, V-PAGES routes.
The mission: make WHO-CAN-DO-WHAT visible and warm everywhere (competitors
bury rights in Special: pages; we sell progression), and make the editor so
simple a first-time fan succeeds cold. Also closes the V-PAGES verify gap:
the real two-account journey.

Hard rules: NO em dashes. Commit per step, do NOT push. No new deps. ONE
migration budget IF needed (candidate: role-change log); STOP if a second
appears. Dual-skill design everywhere. Play byte-untouched. Min-gate + no
dead affordances, ever.

## Step 0 - debt

The anchor-behavior unification noted at V-PAGES close (verse-cite external
links vs same-tab mention chips): internal = same tab, external = new tab
with rel, consistently, one shared renderer rule. Commit.

## Step 1 - the second seed account (closes the V-PAGES gap)

Extend the dev-seed pattern: a second local-only account (contributor role
on the founding spaces, own contrib_xp), same gating as dev login
(NODE_ENV + DEV_LOGIN_ENABLED, RFC-2606 email, prod-404 proven). Then RUN
the full two-account journey and record it: contributor drafts a wiki page
-> submits -> curator (owner account) reviews -> publishes -> attribution,
XP, watchlist notification all real. This proof was owed; deliver it
stepwise in screenshots. Commit.

## Step 2 - edit affordances per role, explained at contact

- Every editable surface shows the CURRENT viewer's true state: visitor
  sees "Suggest an edit" (working, never dead); member sees suggest +
  their path ("Contributors can edit directly. You are 40 XP away - here
  is how XP works" linking the ladder); contributor+ sees Edit;
  locked sections show the lock + why + who can.
- One shared affordance component so the truth is consistent everywhere
  (entity sections, wiki pages, infoboxes). Prove states by role in
  screenshots (the two accounts + logged-out).
- Commit.

## Step 3 - roles made visible

- Role badges: profile, member directory, revision history, discussion
  bylines (subtle, on the V-DESIGN system; a badge, not a costume).
- The PROGRESSION PATH on the space join surface: the ladder rendered as
  a real path (member -> contributor -> curator -> space admin) with the
  actual thresholds from config, what each rung unlocks, and the
  viewer's own position + distance when signed in. Real numbers only.
- Commit.

## Step 4 - the space admin Roles panel

- One surface (curator+): members list with role, XP, join date, pending
  suggestions count; promote/demote with mandatory reason; the ROLE LOG
  (who changed whom, when, why) - if this needs a table, THIS is the one
  migration: spec, STOP, owner runs; if an existing rail fits (e.g.
  creator_notifications pattern or a jsonb log is inappropriate - justify
  properly), decide and defend.
- Charter link + block-from-space (W4.8 rails) surfaced here too: one
  panel, no scattered controls.
- Commit.

## Step 5 - V-EDITOR-MAX: the usability war

- Script the 10 cold tasks (edit a section, add a source, @-mention,
  create a wiki page from a red link, suggest as visitor, review+publish
  as curator, resolve an edit conflict, undo a revision, edit an infobox
  fact with source, mobile: fix a typo). Run them COLD as each role;
  log every friction (extra click, unclear label, missing feedback);
  fix mechanical frictions; re-run until the 10 flow. Report the friction
  log + iterations honestly.
- FIRST-EDIT TOUR: 3 inline steps on first editor open (blocks, sources,
  where drafts live), dismissable, never returns, keyboard accessible.
- SECTION TEMPLATES: era-story, album-note, idol-lore, culture-guide
  starter skeletons (structure prefilled, prose empty, zero AI text).
- MOBILE SHORT-EDIT PASS: fix-a-fact, add-a-source, approve-a-suggestion
  must be honestly good on a phone; long-form stays desktop-first.
- Commit per block.

## Step 6 - STOP: owner review

Screenshot matrix: affordance states x 3 roles + logged-out, the
progression path, the Roles panel, the tour, a mobile short-edit, the
two-account journey strip. 3 breakpoints x light/dark on the key surfaces.

## Step 7 - closing sweep (after approval)

Dual-skill audit; a11y (roles panel + tour keyboard-complete, badges have
text equivalents); the 51-gate V-PAGES suite re-run (nothing regressed);
Play byte-diff; full build; em-dash grep; check:routes; dev accounts
prod-404 re-proof. Commit.

## Permitted loops (per LOOP-CHARTER)

BUILD-VERIFY-FIX per step · GOAL tsc + full build + check:routes + suites
green · MAX 8 · STOP IF second migration / design ambiguity / any
affordance that would show a user a dead end.

## Verify

- [x] Two-account journey proven end to end with screenshots (the owed
      V-PAGES gap closed) - step 6 matrix shots 04 and 15; the pending
      suggestion was approved by the owner's own hands
- [x] Affordance truth: every state per role correct, zero dead buttons,
      distance-to-next-rung uses real thresholds - step 7 audit found and
      fixed three false claims, a dead Block button and a dead sign-in
      link (b067ac9); signedIn now splits the visitor copy
- [x] Role changes logged with reason; log visible to curators+ - reason
      mandatory at the API, log rides verse_revisions, shown in shot 03
- [x] 10 cold tasks flow; friction log + iterations reported honestly -
      7 frictions found, 7 fixed, iteration counts in 6b1fff4
- [x] Tour: shows once, dismissable, keyboard-complete, never blocks -
      trusted-key CDP proof: Tab reaches Next, Enter advances, Escape
      closes, focus returns to the editor, editor stays interactive
- [x] Templates insert structure only (zero generated prose) - suite
      25/25
- [x] Mobile short-edits honestly usable (screenshots) - typo fix,
      source add and suggestion approve all done at 375px; every compact
      control now has a 40px floor on phones (v-tap/v-toolbar)
- [x] Dev accounts 404 in prod build (re-proof: all three login variants
      404 on the production server); V-PAGES gates 55/55 (grown from 51),
      templates 25/25, fold 8/8; Play byte-untouched (three proofs: head
      byte-diff vs 209ab01 identical on / and /games, layout probe 12/12,
      matrix shot 05); tsc/build/routes green (315 routes); zero em
      dashes; no new deps; migration budget UNSPENT

/caveman report per step; step 6 is the owner gate.

## CLOSED (2026-07-31)

Steps 0-7 complete: 4476ab3 .. b067ac9. Step 7 ran as a 5-agent audit
fan-out (gates, play probe, statics, a11y, design) + inline live keyboard
and layout proofs. Owner's addendum answered: the JSON-LD double-emission
is DEV-ONLY (production renders each block exactly once on /, /verse/bts
and /quizzes, and stays deduped across client navigations) - logged as
cosmetic, no pre-push fix required.

Deferred, noted for a future pass (audit CHECK items, no owner ruling
yet): in-editor link preview styles every link as verse-cite even for
internal hrefs (published output is correct); the section-surface role
microcopy renders as unboxed text pending a box-law ruling; editor
toolbars are role=group with all-tab-stops (a roving-tabindex toolbar
would be the richer pattern); the tour's document-level Escape listener
could steal an Escape aimed at an open mention popup.
