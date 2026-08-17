# Home repositioning - identity frame, two states (owner-approved design)

## Claude Code Implementation Prompt

---

Reframe the homepage from "a quiz website" to "the home of your fandom" WITHOUT
breaking what works: play-first conversion, SEO head-term ranking, static/ISR.
The homepage does NOT become the passport. Same page, two states, identity as
the frame. Owner-approved mockup: signed-out = hero rewrite + one promise band;
signed-in = a personal day strip crowning the existing feed.

Hard rules: NO em dashes. Real data only (every number in the strip real).
Commit per step, do NOT push. Home MUST stay static/ISR (○) - all personal
content = client islands on the existing /api/auth/me + light endpoints
pattern. Dual-skill /ui-ux-pro-max + /frontend-design. check:routes green.

## State 1 - signed out (the SEO visitor)

1. HERO REWRITE (copy only + one secondary CTA):
   - H1 keeps the head term for SEO but gains the promise. Pattern:
     "K-pop Quizzes: Prove Your Fandom" (verify against the CTR-sprint title
     work - do not regress the home title that already earns 24.5% CTR; the
     on-page H1 and the <title> can differ, title stays as the sprint set it).
   - Sub-line: "Play daily, build your streak, collect all {real count} groups."
   - Primary CTA unchanged (today's quiz). Secondary: blindtest.
2. PASSPORT PROMISE BAND (new, one compact card under the hero):
   - Mini fan-card visual (REAL Fan Card render scaled down or a faithful
     static image of one - real assets, never a drawn approximation),
     "Every play builds your fan passport" + streak/badges/mastery words +
     one "Start" CTA to signup (fires existing cross_promo_click, from='home',
     to='signup-passport').
   - Server-rendered, static, no personal data.
3. Everything below unchanged: dailies, trending, games teaser, groups,
   community strip.

## State 2 - signed in (the fan's day)

One new client island at the top of home (above the dailies), replacing the
signed-out hero + promise band for authenticated users:

- Greeting + streak chip (real, from the existing streak endpoint).
- Daily tick row: today's Quiz / Blindtest / Debate with done/undone state
  (reuse hasPlayedDaily localStorage + server state where it exists; a tick
  only when truly done).
- Fandom line: "{ult group} is #{n} this week" from the war-map data (reuse
  the your-standing pattern; hides if no ult or unranked).
- "Continue where you left off": the most recent in-progress quiz draft or
  last-played-unfinished item IF such state exists in localStorage (the quiz
  player keeps per-question progress? VERIFY - if no resumable state exists,
  show "Jump back in: {last played category}" from local history instead;
  never fabricate a resume point).
- The island renders nothing until auth resolves (no flash); signed-out
  visitors never fetch personal endpoints.

## Guards

- Home build symbol stays ○ static/ISR - verify before and after.
- LCP: the island must not become the LCP element; hero text stays LCP.
  Measure CLS on the island mount (reserve height, skeleton).
- The <title> from the CTR sprint is untouched. H1 change is deliberate and
  keeps "K-pop Quiz(zes)" in it.
- No removed sections: this is additive + hero copy swap only.
- pt locale: mirror the copy changes with proper pt strings.
- Mobile 430px first; the day strip is one screen-width card, not a wall.

## Steps
1. Hero rewrite + promise band (static, both locales). Commit.
2. Signed-in day strip island (auth-gated, real data, skeleton height). Commit.
3. Verify: build symbol ○, CLS unchanged (0.001 baseline), signed-out never
   calls personal APIs (network tab proof), ticks truthful (play a daily,
   watch it tick), pt parity, dark/light, screenshots of both states, tsc +
   build + check:routes, zero em dashes. Commit.

/caveman report per step, both-state screenshots mandatory.
