# /caveman report - V-BUILDER-3 step 4 (members editor): DONE

Owner ruled the four governance questions (L-068) and applied migration 147
(idols.origin / created_by / detached_at). I built the flagship members editor to that
contract, proved the full lifecycle, committed step 4. Nothing pushed. One heads-up: a
concurrent chat is editing this same working tree (details at the end + in BLOCKED.md).

FIRST RECEIPT (before code): SELECT id, name, origin, created_by, detached_at, active,
needs_review FROM idols -> OK. Distribution: origin='curator'=0, detached_at NOT NULL=0,
legacy inactive (active=false, detached_at NULL)=86 (the untouched legacy set).

## What shipped

- ROSTER API `/api/verse/space-members` (curator-gated): GET {roster, detached, pending};
  POST create / attach / detach - the three IMMEDIATE governed writes.
    - CREATE: insert idol origin='curator', created_by, needs_review=true,
      review_reason='curator-created', active=false, ord=max+1. Its page 404s (getIdol filters
      active) until approved. No silent duplicates: rejects a slug that is already an active
      member (409) or steers a detached one to re-attach. Daily cap (50/curator).
    - ATTACH: re-activate THIS group's own detached idol (detached_at NOT NULL) -> active=true,
      detached_at=NULL. No cross-group attach; the 86 legacy inactive idols never appear.
    - DETACH: active=false, detached_at=now(). Row + page data survive.
- MEMBERS EDITOR `members-editor.tsx` (Content tab; style-panel branches on the members block):
  the live roster as reorderable rows (grip, avatar, name, Data/Edited badge, chevron) with an
  IN-PANEL ACCORDION - photo (step-3 image rail), display name + "revert to data", editable
  linked page. "Add member" = the entity picker (search first, always): re-attach a detached
  member OR create a new one; each op behind a confirm stating the consequence. "Retirer du
  widget" detaches with a confirm. Order + overrides ride the draft jsonb (the `rows` prop).
- ADMIN APPROVE QUEUE `/admin/member-review` (+ `idol_keep_hidden` action): "Idoles a valider",
  same admin rails as space-images, Approve (via `idol_activate`) / Keep hidden. The existing
  /admin/verse mismatch queue now excludes curator idols (they live in this dedicated queue).
- RENDER `MembersStrip`: applies draft order + photo/name/link overrides; EMPTY props render
  byte-identically; the link stays entity-keyed; photos resolve through the step-3 fail-closed
  gate. Only active members render (inactive = 404, the governance rule).
- SYNC GUARD (NEW CODE LAW): the Wikidata re-sync (refresh.ts) writes groups/albums, never
  idols; the sole re-activation site (`idol_activate`) now refuses a detached row (409).

## Acceptance receipts (docs/proofs/vbuilder3-step4/)

- columns receipt -> governance.txt (header).
- full lifecycle -> governance.txt (ALL PASS via service-role + getIdol): create -> unapproved
  page 404s -> approve -> page renders -> detach -> page 404s again, ROW SURVIVES -> sync guard
  refuses re-activate (409) -> re-attach -> renders again.
- attach-existing + create-new + dup guard + auth -> http-layer.txt: unauth create/roster/detach
  all 403; owner create 'ZZ HTTP Probe' -> 200 pending; create 'RM' -> 409 already a member.
- published parity -> render-parity.txt: /verse/bts 200, 7 canonical member links, Members
  heading intact, zero external/storage image urls.
- gates -> gates.txt: check:routes 338, verse-tokens clean, vbuilder1-parity, vpages 55/0,
  vtemplates, vb3-content, vb3-schema all green. a11y: aria-labels on grips/accordion/inputs,
  44px touch floor on the phone sheet. Em-dash clean. Test probe idols cleaned up.

## Two honest notes

1. EDITOR SCREENSHOT not captured this session. The MembersEditor is wired + tsc-clean and its
   entire backend is proven (above), and the published grid renders (render-parity.txt). But the
   live editor panel would not open interactively: the shared dev server was emitting continuous
   RSC/HMR fetch failures (a concurrent chat editing the same working tree), which broke the
   builder's client hydration. Not a step-4 code fault.
2. CONCURRENT-CHAT COLLISION. Another chat is working in this same working tree and committed
   3ea961d, which leaves ONE tsc error in src/app/games/name-them-all/page.tsx(96) - outside
   V-BUILDER, not mine to touch. Every step-4 file is tsc-clean. I staged ONLY my files. Worth
   coordinating so two chats do not share one worktree (this bit us before).

## STOP

Step 4 committed (source + proofs + REPORT + cleared BLOCKED + migration 147 for the record).
Nothing pushed. Stopping before step 5 (hero/identity editor) - checkpoint per the do-it-right
law, since step 5 is its own commit and the dev server is currently unstable.
