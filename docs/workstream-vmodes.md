# V-MODES - reader nav vs Build mode

## Claude Code Implementation Prompt

---

Per VERSE-V4-DIRECTIVES.md (V-MODES section + locked Q1/Q2). The 14-tab
nav shows builder scaffolding to readers; split the experience. Small
workstream, high leverage: every later screenshot benefits.

Hard rules: NO em dashes. Commit per step, do NOT push. No new deps, no
migrations. Dual-skill design. Play triple-proof. SEO invariants: pages
keep URLs; builder surfaces noindex; reader-nav hidden pages stay
reachable per the existing hidden-tab law.

## The model (locked)

- READER NAV (default, everyone incl. logged-out): Home, Members,
  Discography, Timeline, Songs, Photocards, Collectibles, Wiki, Community,
  About. (Template/tab-composer rules still apply on top; this is the new
  default set. Essays joins the reader nav ONLY when the space has
  published essays: min-gate.)
- BUILD MODE: a role-aware toggle beside the space identity, visible only
  to signed-in members with any build-relevant right. ON: the builder
  layer appears: Quests tab, Essays management, drafts, review queue
  entry, studio link, roles panel link: each item filtered to the
  viewer's actual role. The chrome takes a subtle editing accent (a thin
  accent top rule + the toggle state) so the mode is always legible.
  OFF by default on every visit (no sticky surprise); remembers per
  session only.
- Visitors/members without rights never see the toggle; their invitation
  stays the existing join/progression path (no dead affordances).
- Quest board page: noindex, out of sitemap, reachable only via Build
  mode nav (direct URL keeps working for members; logged-out gets the
  join pitch, not a 404, and not the board).

## Steps

1. The mode state + toggle component (role-aware visibility, session
   memory, editing accent). Commit.
2. Nav split: reader set vs build set per role; mobile More sheet gains
   the same split (build group appears only in Build mode). Commit.
3. Surface sweep: every builder affordance currently visible in reader
   context (quest CTAs on home for logged-out, essay-write buttons,
   studio links) relocates behind the mode or the role affordance
   component correctly. Zero dead ends: every relocated affordance's
   reader-side absence is verified per role. Commit.
4. SEO: quest board + builder surfaces noindex + sitemap-excluded
   (probe); reader pages unaffected (head-diff on 3 pages). Commit.
5. STOP: screenshot matrix: logged-out, member, contributor, curator x
   mode off/on, desktop + mobile, light + dark on the space home +
   quests + one entity page. Owner reviews.
6. Closing: dual-skill pass, a11y (toggle keyboard + announced state),
   gate suites, Play triple-proof, full build, em-dash grep,
   check:routes. Commit.

## Verify

- [ ] Logged-out sees a 10-tab reader nav, zero builder affordances,
      and the quest URL serves the join pitch
- [ ] Member/contributor/curator each see exactly their build set in
      Build mode; toggle invisible without rights
- [ ] Mode state announced to screen readers; keyboard toggleable
- [ ] Builder surfaces noindex + out of sitemap (probe); reader head
      tags unchanged (diff)
- [ ] No dead affordances introduced or left behind (role sweep)
- [ ] Suites green; Play triple-proof; tsc/build/routes green; zero em
      dashes; no new deps

/caveman report per step; step 5 is the owner gate.
