# Workstream W - identity-first homepage + onboarding

## Claude Code Implementation Prompt

---

The positioning change made real: the homepage stops selling "a quiz website" and
starts selling "the home of every K-pop fan". Owner-approved prototype decisions
locked below. Trial build: owner reviews the result and may revise, so favor clean
reversibility (the old home sections are REORDERED and REFRAMED, not deleted).

Hard rules: NO em dashes. Real `<Mascot>` + real assets. REAL DATA ONLY, every
module hides on empty (house pattern). Home MUST stay static/ISR (the TopNav
island lesson: anything personal = client island, zero cookies in the server
tree). Commit per step, do NOT push. check:routes green. Dual-skill
/ui-ux-pro-max + /frontend-design before + after.

## Owner decisions locked
- Signed-out hero example card = REAL fans' public passports, rotating. Never a
  fabricated demo card.
- TODAY checklist = exactly 3 items: quiz of the day, blindtest daily, daily
  debate. GOTD game stays elsewhere on the page, not in the checklist.
- Onboarding wizard = 3 steps (ult groups -> bias -> name color), SKIPPABLE at
  every step, at signup/claim time; profile-strength meter on /me afterward.
- Play-first philosophy: no signup walls anywhere. CTA = "Start playing free" +
  the kicker "No account needed. Your passport starts counting anyway."

## W0 - Audit first (report before building)
Map the current home: every section, its data source, static/island split, and
what the v2 layout keeps/moves/reframes. Flag anything the prototype missed
(activity ticker, streak nudge, battle CTA, Discord strip, games teaser, group
pills - each needs a decided home). Deliver the keep/move/reframe table, wait
for NO owner approval - proceed directly after reporting it (trial build), but
the table anchors the diff review later.

## W1 - Signed-out home (the pitch)
Order: hero -> daily two-up (existing) -> war-map teaser strip -> trending ->
games teaser -> groups -> community/Discord strips (existing sections below the
new top; nothing deleted).
- Hero: eyebrow KPOPQUIZ, headline selling identity (prototype copy: "Every fan
  has a story. Yours gets a passport." - polish allowed, no em dashes), one-line
  sub (real counts: groups, quizzes), the REAL fan-card element, CTA "Start
  playing free" -> the daily quiz, kicker line under it.
- The real fan-card: server-side pick from a small curated pool of ACTIVE public
  profiles (opt-out respected if any flag exists; use profiles with flair set +
  recent activity, e.g. top weekly creators/players), rendered with the existing
  fancard/passport visual language at small size, caption "a real fan's
  passport, earned by playing". Rotates per ISR revalidation (not per request -
  home stays static). If the pool is empty (thin day), the hero falls back to
  the site's own aggregate card (real totals: "87 groups, N quizzes, N fans") -
  never a fake person.
- War-map teaser: one line, real weekly leader + link (query exists).

## W2 - Signed-in home (the cockpit)
Personal bits = ONE client island fed by /api/auth/me + existing personal
endpoints (batch into one fetch if needed; no new hot-path queries; degrade
gracefully signed-out = render nothing, server HTML unchanged).
- Identity strip: avatar, name in flair accent, LV + XP bar, streak flame
  (at-risk state after 18:00 local if daily not done: subtle "streak at risk"
  tint - honest, time-based, no push), fandom-rank chip (only when ult charted,
  war-map data), next-badge nudge (REAL math only, reuse the Q publish-nudge
  logic family).
- TODAY checklist: the 3 rituals with done-states (reuse hasPlayedDaily marks +
  debate voted state). Struck-through + score when done. Each row links.
- Continue card: nearest-to-mastery group (player_group_mastery, threshold
  math), "26/30 plays". Hide when nothing in progress.
- Ult-first sections: the existing content sections reorder so the user's ult
  groups' fresh content leads ("New for {group} fans"). Light: sorting existing
  queries' output client-side in the island where cheap, or a small parameterized
  variant - NO new feed engine.
- Everything below (community, trending, groups) unchanged.

## W3 - Onboarding wizard
- Trigger: after signup/claim completes (the existing username-claim moment),
  once ever (localStorage + a profiles flag if one exists cheaply - prefer
  localStorage-only v1, no migration).
- 3 steps, each skippable, all writing through the EXISTING update-profile API:
  1. Pick your groups (searchable picker from Q-B1, max 3 ults)
  2. Your bias (existing bias field, free text)
  3. Your name color (existing flair accents, live PersonCard preview from F2c)
- Finish: celebrate mascot + "your passport is live" -> /me.
- /me profile-strength meter: N of 6 set (avatar, ults, bias, color, stan since,
  header) with one-tap links to settings. Honest count, quiet styling, dismisses
  when complete.

## W4 - Consistency + verify
- Home build symbol UNCHANGED (static/ISR) - the whole point of the island
  split; verify in build output and report it explicitly.
- Mobile 430px + desktop, dark/light, reduced-motion; anon/signed-in/fresh-
  account/empty-pool states all screenshotted.
- Metadata: home title/description updated to the identity positioning (this is
  also the head-term "kpop quiz" page - keep the keyword prominent; no em
  dashes).
- Analytics: existing events only (cross_promo_click from='home' for hero CTA +
  checklist links).
- tsc, build, check:routes green; zero em dashes; no new dependency; no new
  migrations expected (flag loudly if one becomes necessary and stop).

/caveman report per step: W0 table first, then screenshots per state, the
island/static proof, and deviations.
