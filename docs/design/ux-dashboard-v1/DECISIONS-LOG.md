# Decisions log (owner rulings, append-only)

Running record of owner decisions during implementation. The worker treats every entry as binding.
Newest at the bottom.

---

## 2026-09-21 - Phase 0 close-out (5 answers)
See PHASE0-ANSWERS-AND-DATA-SAFETY.md. Summary: Q1 Intro mode KILLED + 301 to /blindtest; Q2 bt_players
canonical for blindtest progression, blind_test_plays stays history, bt_plays/players legacy untouched;
Q3 new rooms/room_messages in Phase 7, party_rooms left for party mode; Q4 Inter everywhere; Q5 keep
screenshots in git.

## 2026-09-21 - Phase 1 in-progress (2 answers)

**Q1 - Korean fallback: KEEP PRETENDARD.** The worker's finding is right and supersedes my earlier Q4
note. Pretendard is already loaded locally, is Korean-friendly, and costs no extra network fetch. Do NOT
add Noto Sans KR (it would be a redundant second CJK font, slower, for a worse result). Final type
stack: Inter for latin body AND display (via next/font/google, latin subset, display swap, weights
400-800), Pretendard kept as the CJK / Korean fallback (verdict stamps 대박 etc., level titles). Remove
DM Sans and Syne from the Tailwind `--font-body` / `--font-display` mapping; Inter replaces both. The Q4
"Noto Sans KR" instruction is void - it was written before we knew Pretendard existed.

**Q2 - Merge model: CONFIRMED, merge to main behind the flag.** This is what the contract already
locked (rule 7: flag default-off on main, rollback = flag not revert). Order:
1. Merge #42 first (Phase 0: docs + the unconsumed UX_V1 tokens + data-guard). It is pure docs plus
   dormant code, zero runtime effect, so it is safe to land on main immediately.
2. Rebase Phase 1 onto main, merge it to main with `NEXT_PUBLIC_UX_V1` default OFF (dark-launched).
Every phase lands on main this way. Rationale: main is actively shipping SEO content (the autopilot and
the W-series), so a long-lived parallel branch would diverge hard and force a painful end-of-project
merge; dark-launching keeps main current, gives a real Vercel production build per phase to test with
the owner's own account, and makes rollback instant.
Non-negotiable guardrail on this model: flag-OFF must be byte-identical to today. The existing-account
parity e2e (rule 9) + the data-guard before/after (rule 8) + the SEO before/after diff (rule 12) run on
every PR and are the gate. If the flag ever leaks half-built UI, that is a P0 blocker, not a note.

Reused-not-rebuilt (worker's two findings, both accepted):
- Night mode already exists (class-based `.dark`/`.light` on `<html>`, localStorage `theme`, FOUC-safe
  blocking script, ThemeInit, theme-toggle.tsx). REUSE it: wire the UX-v1 tokens into `html.dark` scoped
  under the flag, re-skin the existing toggle into the new top bar, add System/Light/Dark to /settings.
  Do NOT build the spec's parallel `[data-theme]` system. Contract-safe: the existing toggle keeps working.
- The map's "night mode: NEW" and the token system's `[data-theme]` attribute selector are both wrong;
  the real system is class-based. The verified map is the source of truth over DESIGN-SPEC 15.3 here.

Approved to proceed: the shell (232px sidebar, 64px top bar, mobile bottom nav, footer) wired into the
`(site)` server layout behind the flag, then the night-mode token wiring on the existing class system,
then the parity + visual e2e and the SEO before/after, into the Phase 1 PR.

## 2026-09-22 - Backups confirmed (contract rule 2 satisfied)
Owner verified in the Supabase dashboard: org is on the **Pro plan**; **daily scheduled backups are
active and COMPLETED** (physical, ~7-day retention visible, multiple points 16-21 Sep). This satisfies
contract rule 2 - migrations may be applied by the owner after checking the latest daily backup point.
PITR add-on is NOT enabled (optional; daily backups + the feature flag cover rollback, so PITR is not
required for this mission). Note: the org spend cap is ENABLED, so if the included quota is exceeded the
project can go read-only - do not apply a migration while near the quota. Gate for Phase 5 migrations:
CLEARED on backups.

Still owner-only, pending (blocks the parity e2e from actually running, NOT Phase 2-4):
- Create a throwaway normal test account on the site + play a couple of quizzes (data to compare).
- Add UX_V1_TEST_EMAIL / UX_V1_TEST_PASSWORD to Vercel (Preview scope) and GitHub Actions secrets.
These two are done by the human owner, not by any agent: creating an account with a password and
handling a plaintext password/secret are off-limits for Claude (this session and the worker alike),
even when authorized. The worker's parity spec already reads these from env and skips cleanly until
they exist, so nothing is blocked on the worker side.

## 2026-09-22 - Auth is passwordless -> parity e2e auth scheme changed
Finding: the site uses passwordless auth (Supabase email magic-link + OAuth Google/Discord). There is NO
password. So `UX_V1_TEST_PASSWORD` is dropped from the contract - it cannot exist.

Test fixture (owner-created, confirmed in auth.users):
- username `testtest`, email `grigetaudumeu-6713@yopmail.com`, UID `d0bd5372-8890-4149-a0ab-a3ee3390b9e0`,
  email confirmed. Data to compare: 2 plays, 1 badge, xp 20, following 1 (profiles.quizzes_played=2).

New parity-e2e auth scheme (worker picks the cleaner of the two, least privilege first):
1. PREFERRED if it exists and is non-prod-gated: the repo's `app/api/dev/login` route. If it can log in
   the test user by id/email behind a dedicated test secret, the e2e calls it on the preview and never
   needs the service role key in CI. Worker verifies it is disabled in production.
2. ELSE: Playwright global-setup mints a session with the Supabase SERVICE ROLE via
   `auth.admin.generateLink({type:'magiclink', email})` -> `verifyOtp(token_hash)` to get access+refresh
   tokens, then sets the app's Supabase SSR auth cookies on the browser context. No password anywhere.
Secrets/env (final):
- `UX_V1_TEST_USER_ID = d0bd5372-8890-4149-a0ab-a3ee3390b9e0` and optionally
  `UX_V1_TEST_EMAIL = grigetaudumeu-6713@yopmail.com` in Vercel (Preview) + GitHub Actions.
- The Supabase service role key is only added to CI if option 2 is used; option 1 avoids it. The service
  role key is never written to git and never printed. `UX_V1_TEST_PASSWORD` is void.
The parity spec keeps skipping cleanly until these env vars exist. This changes a contract detail
(rule 9 auth method) additively; no existing behaviour is touched.

## 2026-09-22 - Phase 2 progress + parity auth locked to option 2
Worker chose parity-auth OPTION 2: service role mints a magic-link OTP, verified through the app's own
@supabase/ssr client, exact auth cookies injected into the browser. No password, no redirect-allowlist,
no hand-encoded cookie. New env to add: `UX_V1_TEST_EMAIL` + `UX_V1_TEST_USER_ID` only (Supabase URL /
anon / service keys are reused from the existing SEO CI env, already present). Spec skips until set.
Map correction (logged): there are TWO QuizCard components, not one - `components/ui/quiz-card`
(dashboard, /quizzes, search, pt, popular) and `components/quiz/quiz-card` (SEO landings, profile,
group-feed, infinite-list). Both now delegate to `UxQuizCard` under the flag; both byte-identical
flag-off. The "re-skin quiz-card once" line in the map/spec was wrong; this supersedes it.
Phase 2 (branch feat/ux-v1-phase2, toward PR #44): shared card done + verified light/dark. Remaining:
dashboard, /quizzes chrome, /q/[slug] (H1/intro/FAQ/JSON-LD/canonical unchanged + SEO diff), visual e2e
(light+dark, 1440+390) + data-guard.

## 2026-09-25 - v10 "Air": top nav back, much more air, every page redone
Owner: "too heavy, I want the navbar at the top back, much more air, less overwhelming, 100% of the
pages, use several agents that correct each other and are critical".
Process: written direction -> 3 critic agents (visual, UX, fan/a11y/SEO) round 1 + cross-critique ->
arbitrated DIRECTION-FINAL -> build -> round 2 review of the build (60 findings) -> fixes -> round 3
verification (visual 11 fixed / 8 partly / 1 not; UX 15 / 5 / 0; fan 15 / 4 / 1) -> last fixes.
Decisions:
- Sidebar shell is dropped. Top bar 64px + mobile bottom tabs. Phase 1 shell (PR #43) must be redone on
  the top bar; Phase 2 card work stays valid but its skin follows section 16.
- Pink budget: links become ink with a quiet underline, one filled pink button per view.
- Split hub hero (no text over photos: contrast failed at 2.65:1 and photos are upscaled).
- Sign-in is a sheet that continues the action; guests can create, sign-in asked at Publish.
- One streak for the whole site (the blindtest streak is removed).
- Relaxed mode (no timer, not in the hall of fame) for WCAG 2.2.1.
- Kept against a critic: the photocard as it is (owner-approved), tier colours in the ranked ladder
  (identity for fans).
- Data truths found on the way: 90 visible groups (91 rows incl. quarantine), 422 published quizzes,
  groups.quiz_count is stale vs published counts. Real top titles per group now come from the DB.

## 2026-09-25 - v11: owner review of v10
Validated as is: home (except the hero), quizzes, groups + group pages, create, new thread, leaderboard,
ranked UI, community threads/blogs/debates/challenges. Changes asked and done in the prototype:
borders on every box; pink back (nav pink pill with icons, section icons, pink links, pink tab pills);
home header + a real quiz of the day card with a random question preview (no answer shown); blindtest in
day mode; all 79 group playlists under All K-pop and in Play by group; ranked must really work; heart
likes in comments; identity flair (name colour, font, bias tag) visible in Community; header picture by
upload or link; badges coloured by rarity; higher resolution photos (site's own public/idols files);
bordered About and results stats; centred timer number. Logo kept.
Data truths found: QOTD rotation stopped 2026-06-30 (qotd_log); ranked_plays has 0 rows (ranked not
live); daily debates and daily blindtests run fine (2026-09-25); blindtest plays from `songs` (4,120
active, 79 playable groups), not from blind_test_songs (349 rows); flair columns already exist on
profiles and are used by 5 to 23 users each.
Implementation: one orchestrated multi-agent run, see v11/WORKER-PROMPT-V11-MULTIAGENT.md.

## 2026-09-25 - v11.1: second pass on v11
Owner asks: much lighter borders everywhere; a smaller, calmer quiz of the day without the group tag and
the question preview; Play by group was a wall of chips, now popular six + a searchable 4-column index;
new badge medallions (no rabbit art) with a unique glyph per badge and a frame shape + colour per
rarity; guest preview fixed (auth rule used display:revert, which broke flex rows and the centring of the
"Save your score" line); header picture sheet can be closed (X, Escape, backdrop). Reference shots
recaptured: 38 states x 2 widths x 2 themes = 152, prototype-only controls hidden.

## 2026-09-25 - v11.2
Owner asks: bring back the live site's centred hero (ticker, "K-pop Quiz" eyebrow, pink italic accent)
while keeping "Good evening, Mingi" for signed-in fans; quiz of the day on a pink gradient; quiz cards
redone (photo flush with the card, group eyebrow, difficulty bars + plays footer) instead of the framed
inset photo; yellow "Did you know" bulb. Workflow: the prototype lives in the repo and at the published
artifact link (same build, `window.UX_VERSION`); no more zips. Checkers measure the repo copy.
Open question for the owner: the live ticker floors "fans playing now" with a random 12 to 27.

