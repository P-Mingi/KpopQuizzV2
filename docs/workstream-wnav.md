# W-NAV - Play/Verse separation + context-aware switcher

## Claude Code Implementation Prompt

---

Split kpopquiz.org into two worlds sharing one identity: PLAY (games/quiz product,
untouched) and VERSE (fandom platform), joined by a segmented Play|Verse toggle in the
shared top nav. Owner-approved design (prototype validated). Read the current TopNav,
mobile-tab-bar, and the Verse routes first.

Hard rules: NO em dashes. This changes CHROME ONLY - never content, never URLs, never
head tags. The games home is the converting page (24.5% CTR) and every ranked URL keeps
its exact title/meta/H1/JSON-LD - PROVE it with a byte-diff. Commit per step, do NOT
push. check:routes green. Dual-skill /ui-ux-pro-max + /frontend-design. Three breakpoints
(mobile/tablet/desktop), light+dark, both worlds.

## The model (locked)

- CONTEXT-AWARE, never a redirect: the toggle highlights the world the current URL
  belongs to and is a door to the other. A first-time SEO visitor landing on /bts-quiz
  is in PLAY (Verse = the door); on /verse/bts is in VERSE (Play = the door). Nothing
  intercepts or redirects a landing visitor, ever.
- World detection by route: Verse world = /verse/* (+ its sub-entities). Play world =
  everything else in the app. Community = SHARED (reachable from both nav bars, belongs
  to neither exclusively).
- Root / stays the games home (Option A, already decided) with the toggle present.
- PREFERENCE COOKIE: a DELIBERATE toggle click sets a cookie (world=play|verse). On a
  later visit to / ONLY, the cookie may open the preferred world's home. It NEVER
  overrides a deep landing (a Google visitor to /bts-quiz always gets Play regardless of
  cookie) and NEVER causes a redirect that a crawler would see - the cookie is read
  client-side or via a non-SEO-affecting mechanism; if there is ANY risk it changes what
  Googlebot sees at /, do NOT apply it to bots (treat crawlers as no-cookie). Justify the
  implementation's crawler-safety in the report.

## Visual identity

- PLAY keeps its exact current identity (pink #E8457A family) and its exact current tabs
  (Home/Quizzes/Games/Blindtest/Community). UNCHANGED.
- VERSE gets a DISTINCT identity (darker, violet #7c5cfc family) so the two worlds feel
  different. Per-space theming (W-CUSTOM later) layers on top of this Verse base.
- The toggle: segmented pill after the logo, current world highlighted (pink in Play,
  violet in Verse), the other world a quiet door. Same component both worlds, themed.

## Nav content

- PLAY nav: unchanged.
- VERSE nav (launch set): Fandoms (the /verse directory) · Community (shared) · plus the
  profile/notification/search cluster. Discover and Idols tabs are FUTURE (the Verse
  discovery home is later work) - launch with Fandoms + Community; leave clean extension
  points for Discover/Idols. Do not build empty Discover/Idols tabs now.
- MOBILE: the toggle lives in the header (both worlds); the bottom tab bar swaps its tabs
  by world (Play keeps its 5; Verse shows Fandoms/Community + profile). Community appears
  in both.

## Cross-backlinks (content, not chrome)

- Verify/ensure the existing content cross-links: a group's game result -> its Verse
  space (ResultLoop, already added in W2.8); a Verse space -> its quizzes/blindtest
  (game widgets, W2.7). Add any obvious missing pair (e.g. a group hub /X-quiz -> its
  /verse/X space and back). These are real <a> links, additive, SEO-positive.

## Steps
1. World-detection + shared TopNav shell that renders the correct world's nav + the
   toggle (server-derived from the path so it is correct on first paint, no flash).
   Commit.
2. Verse nav + Verse visual identity (violet base tokens, distinct from Play). Commit.
3. Mobile: header toggle + world-swapped bottom bar; Community shared in both. Commit.
4. Preference cookie (deliberate toggle only, crawler-safe, never overrides deep
   landings). Commit.
5. Cross-backlink audit + fill gaps. Commit.
6. Verify: byte-diff the head tags of the games home + /bts-quiz + /verse/bts before vs
   after (identical); world detection correct on 6 sample URLs; toggle never redirects
   (network tab: clicking Verse from a Play page navigates, does not 3xx the current
   page); cookie crawler-safe (Googlebot UA sees no cookie-driven change at /); three
   breakpoints x 2 modes x 2 worlds screenshots; check:routes, tsc, build green; zero em
   dashes; ISR/static symbols unchanged on all touched pages. Commit.

/caveman report per step: screenshots (both worlds, 3 breakpoints, light/dark), the
head-tag byte-diff proof, the crawler-safety justification for the cookie. This is
chrome-only - if any step risks content or SEO, STOP and report.
