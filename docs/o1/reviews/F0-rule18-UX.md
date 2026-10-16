# F0 rule 18 audit, profile UX (special audit, not a merge review)

| field | value |
|---|---|
| audit | rule 18 (owner, 16 October 2026): same product, new skin. LEDGER D-018, D-019 |
| profile | UX |
| reviewer | R (fresh instance, read only: nothing edited, nothing committed in either worktree) |
| contract lane | `o1/F0` at e5b51a5fb6cdd1c9a3ea4f6df1bd68d70a3222f7 (e5b51a5), tree ce6408561881e90e1a03d893b7353d7bd3f982dd, worktree `.claude/worktrees/o1-F0`, `git status --porcelain` empty before and after |
| spike | `o1/F0s` at a74c82f69571ca8a1c18916f0d68be5297d0e666 (a74c82f), tree 83b3b5b5c3b66f8b04fd46381cbeceafd026594c, worktree `.claude/worktrees/o1-F0s`, never merged, `git status --porcelain` empty |
| base | merge base of both: ffdc9aa (`o1/integration` is now at b4fcdca; diffs read with `git diff o1/integration...HEAD`) |
| evidence folder | none for these shas (no gate run since rule 18); this audit relies on no gate output, only on the trees and two read-only probes run from the scratchpad |
| inputs | `briefs/COMMON.md` rule 18, `briefs/REVIEWER.md` point 9, `briefs/F0.md`, `briefs/TWINS-draft.md`, `reviews/REVIEW-LOG.md`, `LEDGER.md` D-018 and D-019 |
| date | 2026-10-16 |
| verdict | FIX (2 blockers, 6 majors, 6 minors) |

## 1. What the two branches add, and which of it is UI

`o1/F0` (21 files, 4667 added lines): `apps/quiz/src/lib/site/{types,registry,routing,index}.ts`, three test files,
the contract docs `CONTRACT.md`, `naming.md`, `registry.md`, `routes.md`, `tokens.md`, `copy-keys.md`, `cookies.md`,
`flags-env.md`, `defaults.md`, `manifest.md`, `schema.sql`, `schema.base.sql`, the report and the requests. It adds
no page, layout, component, CSS file or copy file. Its rule 18 surface is the contract: the screen list (routes),
the shell and screen copy slots (copy keys), the theme channel (tokens, per-site sheets and their checker) and the
registry.

`o1/F0s` (30 files) is `o1/F0` plus 9 files: five under `apps/quiz/src/app/sites/[site]/` (`layout.tsx`, `page.tsx`,
`not-found.tsx`, `[...rest]/page.tsx`, `robots.txt/route.ts`), the routing edits of `next.config.ts`,
`middleware.ts`, `lib/route-allowlist.ts`, and `docs/o1/contracts/spike-checks.tsv`.

No file in either branch mentions a twin or rule 18 (`grep -rni "twin\|rule 18"` over `docs/o1/`, `lib/site/`,
`app/sites/`: no hit). `docs/o1/contracts/TWINS.md` and `twins.json` do not exist yet (D-019: F0 sliced out before
rule 18; the brief asks for them first in the next slice).

## 2. The spike pages under rule 18

- None of them forks, copies or rewrites a shared component: they import only `next/navigation`, `next/link`,
  `@/lib/site/registry` and `@/lib/site/routing`, carry no `className`, no `ux-*` or area class, and no CSS ships
  with them (attack 1).
- `layout.tsx`, `page.tsx` and `not-found.tsx` render minimal markup, so they qualify as routing placeholders, but
  none of them says it is one: `layout.tsx` line 2 says "O1 and H1 start from this file", `page.tsx` lines 2 and 3
  say O1 and H1 "replace the body", `not-found.tsx` presents itself as "the 404 of the anime and hub builds", and
  `routes.md` line 123 hands the 404 to O1 "from the spike". In that state they are templates that differ from the
  twins (no shell, a rewritten 404). Once relabelled as below (comments and two contract lines, no markup change
  needed), they comply: a routing placeholder that renders minimal markup and is documented as a placeholder is
  compliant, and I record it so.
- `[...rest]/page.tsx` (renders nothing, calls `notFound()`) and `robots.txt/route.ts` (a route handler, not a
  screen; the kpop twin is `app/robots.ts`) comply as they are.

## 3. Files audited and verdicts

### Spike `o1/F0s` (a74c82f)

| file | screen or component under rule 18? | forks or copies shared code? | verdict and exact change |
|---|---|---|---|
| `apps/quiz/src/app/sites/[site]/layout.tsx` | the layout of every anime and hub screen (twin: `app/(site)/layout.tsx`, TWINS row 28) | no | REWORK. Line 2: replace "O1 and H1 start from this file." with "Routing placeholder (rule 18): the guard, the static params and the metadata reset are the routing pattern ORCH wires; the chrome is not here. The real layout renders the twin chrome of `app/(site)/layout.tsx` (UxShell and the site JSON-LD from the registry), TWINS.md row 28." Line 54: return `<>{children}</>` or comment the `div data-site` as spike only (tokens.md 3.2 puts `data-site` on `<html>`, set by B1; a site sheet selector never matches this div). |
| `apps/quiz/src/app/sites/[site]/page.tsx` | anime home (twin row 1) and hub home (twin row H-1) | no | REWORK (comment only). Lines 1 to 3: "Routing placeholder only (rule 18). O1 builds the anime home from `app/(site)/page.tsx` (UxHome, TWINS.md row 1), H1 builds the hub home from row H-1; nothing in this body is a template." Drop the `<main>` (minor m2). |
| `apps/quiz/src/app/sites/[site]/not-found.tsx` | the 404 of anime and hub (twins rows 27 and H-8) | no fork, but a rewrite of the twin's structure | REWORK. Lines 1 to 3: "Routing placeholder (rule 18): proves that an unmatched path renders the site's own 404, never the kpop one. The real 404 is built from the twin `app/(site)/not-found.tsx` (TWINS.md rows 27 and H-8), never from this file." With blocker B2's contract changes. |
| `apps/quiz/src/app/sites/[site]/[...rest]/page.tsx` | routing only, renders nothing | no | KEEP |
| `apps/quiz/src/app/sites/[site]/robots.txt/route.ts` | route handler, not a screen | no | KEEP |
| `apps/quiz/next.config.ts` | routing, no UI | no | KEEP |
| `apps/quiz/src/middleware.ts` | routing, no UI | no | KEEP |
| `apps/quiz/src/lib/route-allowlist.ts` | routing, no UI | no | KEEP |
| `docs/o1/contracts/spike-checks.tsv` | route checks | no | KEEP (if ORCH's ruling on M1 adds twins of the browse pages, no line here changes: none of them is listed) |

### Contract lane `o1/F0` (e5b51a5; the same files ride on the spike)

| file | rule 18 surface | verdict and exact change |
|---|---|---|
| `docs/o1/contracts/copy-keys.md` | the copy slots of every anime and hub screen | REWORK: blockers B1 and B2, majors M5 and M6, minor m3. Add to section 3: "Rule 18: the keys of an anime or hub screen are the slots of its twin (TWINS.md), in the twin's order; a key with no twin slot needs one of the row's codes or an approved CR." |
| `docs/o1/contracts/routes.md` | the screen list of each site | REWORK: B2 (line 123), M1 (section 3 and 5), M4 (section 1 item 2), minor m6 |
| `docs/o1/contracts/tokens.md` | the theme channel | REWORK: M2 (3.1 lines 78 and 79, new rule 6 in 3.3, lines 50, 51 and 185 named as the only shared-class rules) |
| `docs/o1/contracts/naming.md` | folders | REWORK: line 51, "per-site CSS: `styles/sites/<site>/tokens.css` and one sheet per lane for its listed blocks only (tokens.md 3.3 rule 6)"; line 50, add "built from their twin (TWINS.md), never from the spike" |
| `docs/o1/contracts/CONTRACT.md` | the contract index | REWORK: M3, add rows `TWINS.md` and `twins.json` (cited by D0, O1 to O6, P1, H1, E1b, Q0a, R; status pending) |
| `docs/o1/contracts/registry.md` | brand, vocabulary, theme, features | KEEP for T, B and V (brand, vocabulary and theme are exactly the allowed codes). Lines 54 to 57 (anime features off): add "pending the rule 18 ruling of request F0-8" (M1) |
| `docs/o1/contracts/flags-env.md` | flag `NEXT_PUBLIC_NET_WELCOME` (line 39) | REWORK (one cell): "the welcome card, pending a TWINS row or CR (rule 18)" (M6) |
| `docs/o1/contracts/cookies.md` | `anime.oshi.pending.v1` (line 116) | REWORK (one cell): "pending the CR of TWINS row 8 (post-result oshi row)" (M6) |
| `docs/o1/contracts/defaults.md`, `manifest.md`, `schema.sql`, `schema.base.sql` | no screen, no component | KEEP |
| `apps/quiz/src/lib/site/contract.test.ts` | the per-site sheet checker | REWORK: M2 (enforce rule 6; the accepted fixture at lines 194 and 196 restyles `.ux-btn-primary` and sets `display: grid` on a generic class: replace with block-class examples; add the planted cases of attack 4 as bad inputs). Stricter only: no existing assertion is weakened |
| `apps/quiz/src/lib/site/routing.ts` | `KPOP_ONLY_SAMPLES` (lines 205 to 212) freezes the twin browse pages as must-404 | KEEP pending M1; if ORCH adds their twins: remove `/quizzes`, `/new`, `/most-liked`, `/trending`, `/trivia`, `/faq` (and any other the ruling keeps) from the list |
| `apps/quiz/src/lib/site/registry.ts` | anime `routes.allow` (lines 159 to 167), `ogTemplate` (lines 141, 219) | KEEP pending M1 and m4; if ORCH adds the twins, the patterns join `routes.allow` |
| `apps/quiz/src/lib/site/types.ts`, `index.ts`, `registry.test.ts`, `routing.test.ts` | no screen, no component | KEEP |
| `docs/o1/reports/F0.md` | the plan and decisions | REWORK: M3 (plan of slices, lines 12 to 20: TWINS first in slice 4), decision 4 (line 178): "the site's `not-found.tsx` takes its structure from TWINS rows 27 and H-8", decision 8 (line 184): "pending the rule 18 ruling (F0-8)" |
| `docs/o1/requests/F0.md` | requests | REWORK: F0-2 narrowed (M2); new F0-8 (M1, M6) |

## 4. Attack attempts

1. **Search the spike for JSX that mirrors `components/ux-v1/page.tsx` or `panel.tsx`.** Listed the UI-typed files of
   the spike diff (`\.(tsx|css|scss)$|components/|styles/|copy/`): only the four `app/sites/[site]/` tsx files. Grepped
   their added lines for `className`, `ux-`, area prefixes (`p1-` to `p8-`) and kit tags: the only markup is
   `<div data-site>`, `<main>`, `<h1>`, `<p>`, `<Link>`; no class. `UxPage` (`page.tsx` line 28) renders
   `div.ux-page` with width and shell data, `Panel` (`panel.tsx` line 27) renders `section.ux-panel` with a heading:
   nothing in the spike reproduces either. Result: no fork, no copy. Side result: the spike's `page.tsx` line 13 and
   `not-found.tsx` line 11 render `<main>`, while the shared client shell already renders the page's
   `<main id="main" className="ux-main">` (`components/layout/ux-v1/ux-client-shell.tsx` line 54): this markup cannot
   be the body of a twin page, which confirms it is placeholder material (minor m2).
2. **Check that no new shared component name appears in the contract.** Grepped every contract doc for
   `components/` and `.tsx` paths (only page file paths of the route map, `app/layout.tsx`, `mascot.tsx` and
   `components/this-or-that/bonus.tsx`, all existing) and for PascalCase names. Component-like names found:
   `SpoilerShield` (copy-keys line 81, cookies line 115: the A5 block, allowed), `NetLink`, `NetFooterLine`,
   `NetSitesMenu` (B6: the flagged kpop deltas, one shared component on both sites), `CrossoverFact`,
   `CrossoverLink` (X1: the NET_FACTS kpop delta and the A4 credit slot). None is an anime version of a kpop
   component and none replaces one. Result: compliant, with minor m3 on where SpoilerShield may render.
3. **Check the copy keys list for screens without a twin row.** Mapped every `<site>.<lane>` area of copy-keys.md
   section 3 to a TWINS-draft row and compared its keys with the slots the twin really renders. Result: the shell
   keys describe another nav, tab bar and footer (B1), the 404 keys follow the spike instead of the twin (B2), seven
   areas presume controls or pages the twin lacks (M5), and eight surfaces have no TWINS row at all (M6). Details in
   the findings.
4. **Plant a site sheet that rewrites shared components and run the frozen checker on it.** Copied the checker of
   `contract.test.ts` lines 1 to 119 into the scratchpad (vitest import removed, imports pointed at the worktree)
   and ran it with the worktree's `tsx` on a sheet scoped to `html.ux-v1[data-site="anime"]` that sets
   `.ux-panel { display: grid; grid-template-columns: 1fr 1fr; padding: 40px; border-radius: 0 }`,
   `.p3-h1 { font-size: 64px; text-align: center }`, `.ux-tabbar { flex-direction: column }`,
   `.p1-home > * { order: -1 }`, `.ux-btn-primary { background: var(--ux-accent2) }`,
   `.ux-sec:nth-of-type(3) { display: none }`. Output: `[]` (zero problems). Control: the unscoped
   `.ux-panel { display: grid; }` gives `selector ".ux-panel" is not scoped to anime`, so the probe runs the real
   checker. Result: the contract accepts a CSS fork of the shared kit (M2).
5. **Check the anime route map against the links the twin shell and home render.** Extracted every `href` of
   `lib/ux-v1/a0/nav.ts` (NAV_ITEMS, TAB_ITEMS), `components/layout/ux-v1/ux-footer.tsx`,
   `components/home/ux-v1/ux-home.tsx` and `components/layout/ux-v1/ux-nav-actions.tsx`, and asked
   `isKnownRouteFor('anime', href)` (contract code, scratchpad script). Unknown on anime: nav and tab `/groups`,
   `/leaderboard`, `/profile`, `/quizzes`; home actions `/groups`, `/most-liked`, `/new`, `/quizzes/popular-this-week`;
   nav actions `/profile`; footer `/articles`, `/data/knowledge-report-2026`, `/data/pulse`, `/dmca`, `/faq`,
   `/groups`, `/leaderboard`, `/new`, `/news`, `/quizzes`, `/quizzes/popular-this-week`, `/stats`, `/trending`,
   `/trivia`, `/verse`. `/groups` and `/profile` are covered by V and the registry (`/series`, `/me`); `/verse` is F.
   The rest has no twin route and no F code (M1).
6. **Check the report's and the spike's claims about the spike pages against the brief.** `briefs/F0.md` line 90
   says O1 and H1 build the real pages from the twins, never from the spike, and that TWINS.md says the spike pages
   are routing placeholders. No spike file and no contract file says placeholder (`grep -i placeholder` over
   `app/sites/`, `routes.md`, `CONTRACT.md`, `reports/F0.md`: only the registry's PLACEHOLDERS list and copy
   placeholders), and `layout.tsx` line 2 says the opposite. The brief itself still carries the pre-rule-18 sentence
   at line 75 ("the spike pages stay on `o1/F0s` as the template for O1 and H1"). Result: M4 and minor m5.

## 5. Findings

### Blockers

**B1. The anime shell keys describe another nav, tab bar and footer than the twin.**
Where: `docs/o1/contracts/copy-keys.md` lines 66 to 68.
Proof: TWINS row 28 says the shell is "the same files, configured by the anime registry entry" (T B V C F N A6).
The twin's items: `lib/ux-v1/a0/nav.ts` lines 19 to 26 (NAV_ITEMS: home, quizzes, groups, blindtest, community,
leaderboard) and lines 28 to 34 (TAB_ITEMS: home, quizzes, blindtest, community, you);
`components/layout/ux-v1/ux-footer.tsx` lines 18 to 52 (four titled columns Play, Explore, Community, Support). The
contract's anime keys: `nav: home, series, blindTest` plus actions, so quizzes and community are gone;
`tab: home, series, play, create, me`, three of five tabs replaced by items the twin tab bar does not have;
`footer: fanMade, about, editorialPolicy, privacy, terms, contact, network`, one column of support links without the
column titles. Community is on for anime (`registry.ts` features, `routes.md` line 116), so F does not explain its
removal. This is the frame of every anime page, and D0's copy deck starts from these keys (copy-keys.md line 47).
Change: `nav: home, quizzes, series, blindTest, community` (NAV_ITEMS order, Groups through V) with the action keys
named after the slots of `ux-nav-actions.tsx`; `tab: home, quizzes, blindTest, community, you` (TAB_ITEMS order);
`footer:` one title key per twin column and one key per twin link kept, then `fanMade` (A6) and `network` (B6).
Leaderboard and any other twin item absent on anime only under ORCH's ruling of M1, recorded as F in TWINS.md.

**B2. The anime and hub 404 is taken from the spike, whose structure is a rewrite of the twin.**
Where: `docs/o1/contracts/routes.md` line 123 ("O1 (from the spike)"); `copy-keys.md` lines 71 and 132
(`notFound: title, body, home`, marked S); spike `app/sites/[site]/not-found.tsx` lines 9 to 17.
Proof: the twin `app/(site)/not-found.tsx` lines 17 to 75 renders the mascot (think pose), the 404 numeral, a title,
a body, a search form, a "Popular quizzes" heading with a list, three links (Home, Browse all quizzes, Create a
quiz) and the Discord line. TWINS rows 27 and H-8 allow T B C F (no Discord line) and Tn Bf C. The spike renders an
h1, one paragraph and one link, and the copy keys freeze exactly those three slots. The standing bar
(REVIEW-LOG: "an invented screen ... is a blocker") applies: the contract designates a non-twin screen as the source.
The keys are S, so after the freeze a rename is a CR.
Change: routes.md line 123 owner cell "O1; the 404 follows the twin `app/(site)/not-found.tsx` (TWINS rows 27 and
H-8); the spike's `not-found.tsx` is a routing placeholder"; copy keys `notFound: code, title, body,
searchPlaceholder, searchLabel, popularTitle, home, browse, create` on anime and hub; spike header as in section 3.
Note for ORCH: the twin is a page file with hard-coded K-pop groups and copy, so importing it without copying needs
its owner to move the body into a shared component with props (a request to that owner, under parity).

### Majors

**M1. The anime screen list drops the twins of pages the twin shell and home link to, and freezes them as 404.**
Where: `routes.md` section 3 (anime map, lines 99 to 123) and section 5 (lines 155 to 161);
`lib/site/routing.ts` lines 205 to 212 (`KPOP_ONLY_SAMPLES` lists `/quizzes`, `/new`, `/most-liked`, `/trending`,
`/trivia`, `/faq`, `/stats`, `/leaderboard`, `/dmca` as must-404 on anime); `registry.ts` lines 159 to 167;
`registry.md` lines 54 to 57 and report decision 8 (features off: leaderboards, ranked, news, articles, dataPages,
trueFalse, dailyBlindTest).
Proof: attack 5. The twin home's section actions (`ux-home.tsx` line 66 `/quizzes/popular-this-week`, and the Most
liked and See all new actions to `/most-liked` and `/new`), the twin nav and tab Quizzes item, and the twin footer
link to pages that do not exist on anime. TWINS' F code lists the features that may be off (image quizzes, fandom
war, MV pulse, live rooms, Verse, Discord, cover art); browse pages, help, stats, leaderboard, articles and news are
not in it, and TWINS-draft has no row for `/quizzes` and its family. A faithful twin shell then links to 404s, which
is what pushed the copy keys to a different nav (B1). F0 cannot add a difference or a route by itself.
Change: F0 files request F0-8 to ORCH for a ruling per path: either twin rows and routes (5.2 allows new anime
routes; then `routes.allow`, routes.md section 3 and `KPOP_ONLY_SAMPLES` follow), or an F entry in TWINS.md naming the
slot removed in nav, tab bar, footer and home. Until then registry.md lines 54 to 57 and decision 8 say "pending the
rule 18 ruling (F0-8)".

**M2. The per-site sheets are a channel to restyle and re-lay-out the shared kit, and the frozen checker accepts it.**
Where: `tokens.md` lines 78 and 79 ("one sheet per lane for that lane's component rules and overrides"), section 3.3
(lines 99 to 109, no rule on what a selector may target); `naming.md` line 51; request F0-2 (sheets for P1, B6, E1b,
O5, O6 and the others as "their component CSS"); `contract.test.ts` lines 190 to 197 (the accepted fixture
restyles `.ux-btn-primary` and sets `display: grid`).
Proof: attack 4, a sheet that changes the layout of `.ux-panel`, the tab bar and the home order and hides a section
passes `checkSiteSheet` with zero problems. Rule 18: "When a shared component needs a difference, its owner adds a
prop or a theme token, on request"; only the token values and the listed anime blocks change.
Change: tokens.md 3.1 lines 78 and 79 read "one sheet per lane for the classes of the anime or hub blocks its TWINS
rows list (A1 to A7, H1 to H4); never a rule on a class of `components/ux-v1/**` or of an area component". New 3.3
rule 6: "After the site scope, a selector names only the lane's own block classes; the only rules a site sheet may
write on a shared class are the token swaps this file lists (`.p4-ans.is-no .p4-k`, `.p6-ans.is-no .p6-k` reading
`var(--ux-on-no)`, the `.ux-app :focus-visible` outline colour), each setting one colour from a token". The checker
enforces rule 6 and its fixtures change accordingly (stricter only). F0-2 gives a lane sheet only to the lanes whose
rows list a block: O1 (tokens, A6, A7), O2 (A1 to A4, A7), O3 (A5), O4 (A5 in create), O5 (A5 in name-all),
O6 (A4), X1 (A4 credit slot), H1 (tokens, H1 to H4); none to P1, B6 or E1b, whose rows list no block.

**M3. The twins contract is absent and unplanned.**
Where: `docs/o1/contracts/` at e5b51a5 has no `TWINS.md` or `twins.json`; `CONTRACT.md` lines 14 to 34 (file table)
do not list them; `reports/F0.md` lines 12 to 20 (plan of slices) has no slot for them, slice 4 being the type
generator.
Proof: `briefs/F0.md` deliverable 4 ("do this first in your next slice"); COMMON rule 18 names the file as the
reference of every anime and FanQuiz screen; Q0a's `twins.mts` and every gate's `twins` step read `twins.json`.
Context: D-019 records that F0 sliced out before rule 18 arrived, so this is an omission to fix, not a departure.
Change: slice 4 becomes TWINS.md, twins.json and their agreement test; the other slices move down; CONTRACT.md gains
the two rows; LANES.md (slice 7) cites TWINS.md for every UI lane. When writing TWINS.md, carry the corrections this
audit implies into requests to ORCH (M1, M6), never as added differences.

**M4. The spike layout and home are presented as templates for O1 and H1.**
Where: spike `app/sites/[site]/layout.tsx` line 2 and line 54; `page.tsx` lines 1 to 3; `routes.md` section 1
item 2 (lines 12 and 13), which describes the layout only by its guard.
Proof: the twin layout `app/(site)/layout.tsx` lines 31 to 54 (Organization and SiteNavigationElement JSON-LD) and
lines 58 and 59 (`UxShell` with UX v1 on) carries the chrome of every page; the spike layout renders
`<div data-site={site}>{children}</div>`. A lane that "starts from this file" starts without the shared shell.
Change: the comments of section 3; routes.md section 1 item 2 gains "The layout also renders the shared chrome as
`app/(site)/layout.tsx` does with UX v1 on (UxShell, the site JSON-LD from the registry), TWINS row 28. The spike's
layout renders no chrome: it is a routing placeholder."

**M5. Copy keys that presume controls or pages the twin does not have.**
Where and proof, each against the twin it names:
- `copy-keys.md` line 70, `anime.o1 home: h1, lede, dailyTitle, seriesTitle, openingsTitle, newQuizzesTitle`: the twin
  UxHome renders header, quiz of the day, continue playing, groups rail, Trending this week, All time best, New
  quizzes, blind test band, From the community (`ux-home.tsx` lines 44 to 100). Trending, best, continue playing and
  community have no key; community is on for anime. Change: one key per UxHome section in its order.
- line 75, `anime.o1 daily: h1, lede, comeBack`: the twin `/daily` is a redirect (`app/(site)/daily/route.ts`,
  TWINS row 10, differences "none"; `routes.md` line 110 agrees). A key set with an h1 is a daily page with no twin.
  Change: drop.
- line 77, `anime.o2 series: tierFilter, typeFilter`: the twin `groups-browser.tsx` has one filter field
  (lines 40 to 47), row 2 lists no filter. Change: drop both; keep one `filter` key for the twin field.
- line 86, `anime.o4 focus: medium, upToArc, characters`: the twin `details.tsx` fields are title, about, type,
  group, difficulty, language, cover (lines 41 to 133); A5 in row 9 is a spoiler tag and a source per question.
  Change: drop `medium` and `characters`; `upToArc` only if it is the per-question A5 tag, else a CR.
- line 91, `anime.o5 tot: h1, pick, result`: this or that has no route (`routes.md` line 109, the bonus of row 8).
  Change: drop `h1`.
- line 95, `anime.p1 u.alsoOn` (the stamp chip): row 17 allows T B V C F N, no network chip (world stamps are H3,
  hub only). Change: pending a CR, not S until approved.
- line 122, `hub.h1 tabs: overview, quizzes, played, badges, friends`: the twin tabs are overview, quizzes,
  history, badges (`components/profile/ux-v1/passport.tsx` lines 103 to 107); H3 has no friends tab. Change: drop
  `friends`; `played` is the twin's `history` slot.

**M6. Surfaces with no TWINS row at all, frozen as shared keys and flags.**
Where: `copy-keys.md` line 100 (`anime.p1 welcome`, S), 101 (`appear`), 104 (`keep`), 99 (`oshi.rowTitle`), 105 and
133 and 58 (`b4 land` on anime, hub and kpop, S), 117 (`hub.h1 nav`), 57 (`kpop.p1 welcome`), 60 (`kpop.l1 network`);
`flags-env.md` line 39 (NET_WELCOME); `cookies.md` line 116 (`anime.oshi.pending.v1`).
Proof: TWINS-draft has no row for the welcome card, "How I appear here", "Keep anime in your passport", the land
page or a hub shell, says the post-result oshi row "needs a CR" (row 8), and its list of flagged kpop deltas (footer
line, Your sites menu, settings Account row, crossover tag and fact line) has no kpop welcome card, land page or
`/admin/network`. LEDGER "Change requests" is empty.
Change: mark each of these keys and the two contract cells "pending rule 18: TWINS row or CR"; do not mark them S
until approved; request F0-8 asks ORCH for the rows (a hub shell row built on the shared UxShell, the kpop deltas
list) or the CRs.

### Minors

**m1.** Spike copy is hard-coded in page files ("This site is being built.", "Page not found", "Back to {brand}":
`page.tsx` line 15, `not-found.tsx` lines 12 to 14). Rule 10 puts copy in per-site, per-lane files. Acceptable on a
never-merged placeholder once it is labelled as one (section 3).

**m2.** Spike `page.tsx` line 13 and `not-found.tsx` line 11 render `<main>`; the shared client shell owns the main
landmark (`ux-client-shell.tsx` line 54). Drop the element, or keep it and note that a twin page body never renders
`<main>` (two main landmarks once the shell is in).

**m3.** `copy-keys.md` line 81: "O2 and O5 render SpoilerShield". A5 is allowed on rows 3, 5, 6, 9, 15, 23 and 25,
not on row 4 (`/anime-mix-quiz`) or row 14 (Which character). Name the rows instead of the lanes.

**m4.** `registry.ts` lines 141 and 219 (`ogTemplate: '/api/og/site'`) and `routes.md` line 122
(`app/api/og/series/`) name OG routes that do not exist; TWINS row 30 says "the same route code, registry brand"
(twins `app/api/og/[slug]`, `app/api/og/group/`). Name the twin routes, or state that a new path's handler imports the
twin's renderer and only reads the registry brand.

**m5.** `briefs/F0.md` line 75 (ORCH's file) still says "the spike pages stay on `o1/F0s` as the template for O1 and
H1", which contradicts line 90 and rule 18; the spike's line 2 follows it. ORCH: reword line 75 to "the routing
pattern for ORCH's wiring; the pages are placeholders".

**m6.** `routes.md` lines 105, 107, 108 and 111 introduce internal folders (`which-character/[series]`,
`blindtest/[playlist]`, `name-all/[series]/[set]`, `opening-of-the-day/page.tsx`) whose twins are
`personality/[group]`, `blindtest/[mode]` (group branch and daily mode) and `name-all/[group]` (one level). Fine as
routes, but write the twin file next to each so O5 and O6 do not read a new folder as a new screen; the extra `{set}`
level of name-all has no set picker in the twin and none may be added without a CR.

## 6. What complies

- No fork, copy or rewrite of `components/ux-v1/**` or of an area component in either branch (attack 1).
- No new shared component in the contract that is an anime version of a kpop one (attack 2).
- The registry's brand, vocabulary and theme fields are exactly the allowed T, B and V; the token names are the
  existing 75 plus 4 new ones, all values, no new design token concept.
- `[...rest]/page.tsx`, `robots.txt/route.ts` and the routing edits carry no UI.
- The three spike pages are compliant routing placeholders once they are documented as such (section 3).

## 7. Verdict

FIX. Order for F0's next slice: M3 (TWINS.md and twins.json first), then B1, B2, M5 and M6 in copy-keys.md, M2 in
tokens.md, naming.md, the checker and F0-2, M4 and the spike comments, then request F0-8 to ORCH for M1 and M6. The
spike needs comment changes only; no markup of it may be carried into an anime or hub screen.
