# V-AUDIT: the full Verse UX/UI audit

Date: 2026-07-31. Audit only; nothing in src was changed. Both mandated lenses
ran at the start (ui-ux-pro-max, frontend-design) and every page was judged
through both. Scope: 33 Verse surfaces captured at 1280 / 768 / 375, light and
dark, as logged-out recruit, contributor (Test Fan) and owner, via a headless
Chrome harness; 8 parallel audit passes plus 6 scripted navigation journeys
(click counts, dead ends, orientation checks at every hop). Roughly 140
screenshots live under the session scratchpad (vaudit/*), referenced below.

/caveman: light theme broken by one token. Homepage empty by design, not by
data. Imagery exists, pages do not use it. Dark mode already good. Fix ink,
fix CTAs, put art on the pages, seed five stories, Verse becomes real.

## 0. The one-sentence verdict

The owner's complaint is confirmed and it has a mechanical core: the Verse
side is not ugly, it is UNLIT. One token (light-mode --verse-ink, derived from
the space accent with no contrast floor) washes every heading, title, link and
CTA on every BTS-space page to roughly 1.9:1, and a second token
(--verse-accent-text assumed white) makes the primary buttons invisible. Dark
mode, where the derivation cannot fail, reads composed on almost every page.
On top of that mechanical failure sit three real design debts (no imagery on
image-rich subjects, dead right columns at desktop widths, one hero repeated
at full height on every sub-page) and a thin-content layer that is emptiness,
not design, and must not be redesigned.

## 1. Method and honesty notes

- The dev server was the audit target (localhost:3021). Production may differ
  in ISR behavior; the V-HOME empty-fallback finding was observed live 4 of 12
  loads and traced in code, so it is real, but the frequency number is a dev
  observation.
- The BLACKPINK "THE ALBUM region JP" finding is flagged from the rendered
  page; the DB row was not inspected. Verify before correcting.
- Contrast numbers were measured from computed styles and screenshot pixels
  (not eyeballed). The systemic ink figure 1.87 to 1.9:1 was independently
  measured by four separate audit passes.
- Scores grade the DEFAULT face: light theme, logged out, no curator skin.
  Dark mode is consistently 1 to 2 points better on beauty; that gap is the
  ink bug, not a different design.
- One scope miss: only 3 wiki exemplars exist (Borahae, Life Goes On, ARMY
  Bomb); the workstream doc said 4. Nothing else was skipped.

## 2. Per-page scorecards

Scores 1 to 5: Readability / Beauty / Navigation. Judged on the default face.

| Page | R | B | N | The single worst thing | The single best thing |
|---|---|---|---|---|---|
| V-HOME /verse | 3 | 2 | 4 | Half-empty beige fold; 4/12 loads showed the dead "Spaces are being prepared" fallback | The hero copy block with verse-scoped search is a genuinely good opening |
| /verse/promises | 4 | 2 | 4 | The covenant page is an IOU while V-HOME actively routes recruits to it | Honest, plainly written placeholder with clear exit |
| Verse 404 | 5 | 4 | 4 | Search CTA exits into Play chrome | "This corner of the Verse isn't mapped yet" is the best editorial moment on the side |
| Search (from Verse) | 4 | 3 | 2 | Silent world switch to pink Play chrome, no space results | Populated results are lively and credible |
| Space home: BTS (default) | 2 | 2 | 4 | Ink washout kills every heading below the hero | The licensed 7-portrait member grid |
| Space home: Stray Kids | 4 | 4 | 4 | Dead right rail below IN NUMBERS | Dark hero with marquee + masthead quote is screenshotable |
| Space home: ATEEZ | 4 | 3 | 4 | Six releases all stamped OTHER | Dark plum hero with hearts carries the soft identity |
| Idol: Jungkook | 2 | 2 | 4 | Ink washout inverts hierarchy | Real portrait + member photo strip |
| Idol: Lisa | 2 | 2 | 4 | Even less content, over in one scroll | Native Thai name + per-space tint |
| Album: MOTS:7 | 2 | 1 | 3 | No cover art anywhere on an album page | Complete honest 19-track list with sourcing chip |
| Album: THE ALBUM | 2 | 2 | 3 | Region reads JP on the KR flagship (verify data) | Per-track Play links where audio exists |
| Wiki leaf: Borahae | 2 | 2 | 4 | Article chrome at 1.9:1 reads as disabled | Real fan voice + provenance row |
| Wiki leaf: Life Goes On | 2 | 2 | 4 | Song story with zero album art | @mention pills make it a real hypertext |
| Wiki leaf: ARMY Bomb | 2 | 2 | 3 | A lightstick page that never shows the lightstick | Inline Soompi citation + [source] discipline |
| Wiki editor (draft) | 3 | 2 | 4 | Tip strip Next button at 1.1:1; strip collapses at 375 | Kind-aware covenant guidance in the rail |
| Wiki index | 2 | 2 | 3 | H1 headlines the emptiness ("3 pages in the ARMY home") | Credible taxonomy: search, counts, kind chips |
| Song Deck | 3 | 2 | 3 | Album name re-printed on all 197 rows, no art | Facet chips with live counts |
| Content router | 3 | 2 | 3 | Seven identical cards duplicating the tab bar | "Pick a door" microcopy has real voice |
| Members index | 4 | 4 | 3 | No page header at all | The only page a fan would screenshot |
| Timeline (eras) | 2 | 2 | 4 | "No story yet" repeated 15 times | The era spine bones are genuinely good |
| Collectibles | 2 | 2 | 3 | The ARMY Bomb renders as a blank gray tile | Collector framing microcopy |
| Awards | 2 | 3 | 4 | Sourced dataset rendered as a ghost | WON/NOMINATED badges + per-row source |
| Photocards | 2 | 2 | 3 | Dead-end empty state, no CTA | Correctly hidden from nav while empty |
| Community | 2 | 2 | 3 | Three stacked empty modules in three styles | Member chips with role badges are real social proof |
| Discussion | 2 | 2 | 2 | No thread route, no permalink, cannot be shared | The comment row pattern is sane |
| Quest board | 2 | 2 | 3 | Identical row stamped 16 times | 23 real quests from real discography data |
| Essays | 1 | 2 | 3 | One dashed void is the whole page | Role-aware honest CTA |
| Curate studio | 2 | 2 | 3 | Save settings invisible in light mode | Member manager rows are dense and honest |
| Customization studio | 3 | 3 | 3 | Accepts the near-white accent that broke the space | Draft preview + publish confirm + rollback loop |
| Wiki creator (new) | 3 | 2 | 3 | Both entry CTAs invisible in light mode | Kind picker microcopy teaches the culture |
| Join ladder (/about) | 3 | 3 | 4 | The whole persuasion layer washes to fog | The ladder content itself is convincing (dark proves it) |
| Members (spaces avg) | 4 | 4 | 3 | Inconsistent hangul captions | Licensed portraits |
| Verse search absence | - | - | 1 | There is no Verse-scoped search surface at all | The 404 shows what in-world voice sounds like |

Screenshots per row: scratchpad/vaudit/{vhome,spaces,entities,wiki,indexes,collect,community,studio,journeys}/.

## 3. Ranked findings

Deduplicated: 170 raw findings collapse to the list below. Format:
severity x cause x effort.

### Blockers

1. BLOCKER x design x S. THE INK FLOOR. Light-mode --verse-ink is
   color-mix(accent 74%, #1a1714) with no contrast floor (globals.css ~4904).
   BTS's published accent is #E6F1FB (near-white), so every heading, page
   title, era name, quest title, ladder role, stat numeral, chip and link
   keyed to verse-ink lands at 1.87 to 1.9:1 in light mode, across every page
   of the space. Hierarchy inverts (body text darker than titles); the whole
   side reads bleached, which IS the "AI website" feel's largest single cause.
   Dark mode is immune by construction. Fix once: clamp the derived ink until
   it clears 4.5:1 against the page background (or fall back to the curated
   accent-text pair for high-luminance accents). This one token repairs
   roughly 40 of the 170 findings.
2. BLOCKER x design x S. THE ACCENT-TEXT ASSUMPTION. Accent-filled controls
   hardcode white-ish label text, so with a pale accent the primary CTAs are
   invisible: wiki "New page" (1.1:1), creator "Create the draft", editor tip
   "Next", curate "Save settings", V-HOME-routed join pills. Derive label
   color from accent luminance (dark-on-light accents) and give accent-filled
   buttons a minimum-contrast fallback.
3. BLOCKER x design x M. STUDIO GUARDRAIL MISSING. The customization studio
   accepted and published the near-white accent with zero warning, and its
   preview only renders the curator's current theme. Add an accent-luminance
   validation (warn + refuse or auto-adjust when derived ink falls below
   4.5:1) and a light/dark toggle in the preview. This prevents every future
   space from re-shipping finding 1.
4. BLOCKER x both x M. V-HOME DEAD-SITE BAKE. safeFetch + revalidate 3600
   means one failed directory fetch bakes "Spaces are being prepared. Check
   back soon." into the ISR cache for up to an hour (observed 4 of 12 loads).
   Failure and true emptiness share the same copy. Throw to the error
   boundary or keep last-good; give loading its own treatment.
5. BLOCKER x design x M. ALBUM PAGES HAVE NO COVER ART. The single most
   image-obligated page type renders zero imagery (no img element in the
   template). Licensed art exists.
6. BLOCKER x emptiness x L. TIMELINE IS PURE SCAFFOLD. 0 of 15 BTS eras have
   a story; "No story yet" repeats fifteen times. Content work, not
   redesign: seed HYYH, LOVE YOURSELF and MOTS:7 with credited starter
   stories, and collapse story-less eras to compact rows meanwhile.

### Major (grouped)

7. major x design x M. DEAD RIGHT REGIONS AT DESKTOP. Same skeleton on many
   pages: V-HOME (40% of every screen), space homes (rail exhausted by
   ~1000px), albums (max-w-3xl in a 1360 canvas), Song Deck (stops at 68%),
   awards (source link 900px from the title), about (dead left rail). One
   layout pass: sticky rails, interleaved modules, or honest narrower
   canvases per page type.
8. major x design x M. THE HERO TAX. The full ~550px space hero plus 12-tab
   nav precedes every sub-page; on mobile the content a visitor came for
   starts 1.5 to 2 screens down (leaf pages, essays, editor: ~1150px). Build
   the compact hero variant (name row + tabs) for leaf, index, editor and
   tool pages.
9. major x both x L. IMAGERY IS THE MISSING ORGAN. Licensed portraits prove
   the pipeline (Members grid is the audit's best page), yet V-HOME has zero
   images, albums none, Song Deck none, timeline none, collectibles a gray
   tile, quest rows none. This is the second half of the AI-site feel.
10. major x design x S. THE FOLD MISFIRES. splitTipTapForFold cuts after
    paragraph one on two-paragraph articles and orphans headings from their
    bodies (Life Goes On: "Live history" heading visible, body hidden).
    Never break between a heading and its first block; skip the fold when
    the remainder is under ~4 blocks.
11. major x design x M. NO VERSE SEARCH. Every Verse search entry (header,
    footer, 404 CTA) silently lands on Play-branded /search with quiz-first
    categories and no space results. Journeys confirmed the world switch
    costs orientation (chrome turns pink, tab bar swaps). Add a fandom-space
    result type and keep Verse referrers in Verse chrome.
12. major x design x S. WORLD EXITS ARE SILENT. The Verse footer links to
    /leaderboard and /search (Play world); the world toggle from any deep
    page resets to the world root, losing your place (by design, but
    unannounced). Keep Verse footers in-world; consider the toggle
    remembering the last space.
13. major x design x M. REPETITION READS AS GENERATED. V-HOME's three
    sections re-show the same fandoms (ARMY twice in two screens); Song Deck
    prints the album name 197 times; quest board stamps one row 16 times;
    timeline repeats one apology 15 times. Dedup, group, and vary: these are
    presentation fixes on real data.
14. major x design x L. DISCUSSIONS HAVE NO ADDRESS. No thread route, title,
    or permalink exists (one flat component on Community); the page promises
    a debate archive the architecture cannot hold. Needs a thread model
    before any community push.
15. major x design x S. DEAD AFFORDANCES FOR THE WRONG ROLE. Curate tools row
    links two /admin/verse/* routes that 403 for non-staff curators;
    logged-out discussion composer is enabled with no sign-in path; Photocards
    empty state has no CTA at all.
16. major x emptiness x M. THE SEED-CONTENT GAP (do NOT redesign these):
    essays 0, photocards 0, collectibles 1 item, idol facts 2 rows, era
    stories 0, discussion comments 0, the covenant unwritten, "What ARMY
    know" lore empty. Every one has a fine design waiting for content. One
    curated seed wave (see the plan in section 4) transforms nine pages.
17. major x design x S. ORIENTATION GAPS. Members index has no header block;
    About has no breadcrumb while every sibling shows one; /content calls
    itself Browse and no tab is active; "members" means idols in the hero
    and fans in Community on the same screen; mobile More sheet opens 43
    links with concatenated labels (Jin김석진, BE2020 · album) and no
    current-section state.
18. major x emptiness x S. DATA TRUST DENTS. THE ALBUM region JP (verify),
    three eras all "TO NOW", COVERAGE says 50% while its sub-line reads
    0/15 + 0/7, releases stamped OTHER six in a row, identical seed dates
    2026-07-31 everywhere. Each is small; together they undercut the
    "sources on every fact" pitch.

### Polish (representative; full list in the working digest)

19. polish x design x S. The auth slot renders as an empty gray pill until
    hydration on every page (server-render "Sign in" or skeleton it).
20. polish x design x S. Nav clips "Community" to "Comm" at 768.
21. polish x design x S. Quest "Show more" looks like a caption; 15 of 23
    quests hide behind it. The 50% meter reads as a moon icon.
22. polish x design x S. [SOURCE] chip styled as dev markup; wd chip is
    insider shorthand; auto badges are curator jargon shown to visitors.
23. polish x design x S. Wiki leaf measure runs 95 to 100ch, past the
    system's own --v-measure 66ch token.
24. polish x design x S. Mobile infobox order: facts render below the
    article on wiki leafs; scanners want them first.
25. polish x design x S. Studio uses Play-pink active states inside the
    violet identity; Publish is the only green in the system.

## 4. The V-HOME content plan (the owner's direct ask)

Wireframe-level, top to bottom, honest data only. Everything listed exists
today or is one cheap computation away.

1. HERO, image-led. Left: the existing headline + verse-scoped search (keep;
   it is good). Right (the current void): a 2x3 collage of licensed idol
   portraits and album art tinted per-fandom, refreshed per visit from the
   spaces directory. One line under it: real totals ("21 fandoms, 118 idols,
   348 releases documented").
2. TODAY IN K-POP strip. Computed from dates we hold: debut anniversaries,
   member birthdays (the SKZ marquee already proves the data), release
   anniversaries. Five chips, each linking into the owning space. This is
   the "alive" signal the page lacks, at zero content cost.
3. FLAGSHIP SPACES row. Three imagery-forward cards (portrait collage
   background, fandom wordmark, member/release counts, one-line masthead
   quote where written). These are the three launch spaces; no duplication
   with the directory below.
4. NEWEST FROM THE WIKI. Latest 4 published pages across all spaces (title,
   space chip, opening line as excerpt, relative date). Real rows exist
   today; the strip grows itself.
5. LIVE FROM THE COMMUNITY. Latest quiz plays with pass rates (the Play-side
   data the search results already show), latest suggestion approved, newest
   member count delta. Three lines, computed.
6. THE DIRECTORY ("All fandoms"). The one complete grid, deduped from the
   rows above, image-chip per card with a contrast-floored name, honest
   min-gated counts.
7. THE RECRUITMENT BLOCK, with visual weight. The claim band copy is already
   good ("You own your work and your name is on it"); give it a full-bleed
   accent-tinted band, the curator ladder in miniature, and route it to a
   WRITTEN covenant (seed v0: five plain-language promises, labeled draft).
8. GATEWAY QUIZZES, tastefully last. Three quiz cards max, framed as "prove
   your fandom", visually distinct from Verse content so the worlds stay
   legible.

Personalization (signed-in): one client-side strip under the hero ("Your
spaces / continue building"), since the ISR shell cannot personalize.

## 5. Signature moments (3 to 5 things a visitor remembers)

1. THE ERA SPINE, LIT. Timeline chapters colored by era, each with album art,
   the current era glowing at top, story excerpts inline. Where: /timeline +
   a mini-spine module on space home. Why ours: eras are K-pop's native
   narrative unit; no wiki renders them as a designed spine. Effort: M
   (bones exist; needs art, color mapping, 3 seeded stories).
2. THE LIGHT-UP JOIN. Joining a space "lights your stick": the join pill and
   your member chip take the fandom accent (contrast-clamped), and the space
   header shows a subtle count tick. Where: space hero + About ladder. Why
   ours: lightstick culture is the fandom's own symbol of presence. Effort:
   S once the token fixes land.
3. OVERSIZED VITALS. One editorial stat band per space in display type (7
   MEMBERS / 17 RELEASES / 197 TRACKS / EST. 2013), tabular numerals,
   accent-ruled. Where: space home under the hero; V-HOME variant with
   network totals. Why ours: the numbers are real and sourced; saying them
   loud is the covenant as design. Effort: S.
4. THE MEMBER WALL. The Members grid is already the best page; promote the
   pattern: portrait-led walls as the visual language for idols everywhere
   (V-HOME collage, quest rows, era chapters reuse the same crop system).
   Why ours: we hold licensed imagery competitors cannot ship. Effort: M.
5. CITATIONS AS JEWELRY. Restyle source marks from [SOURCE] brackets into a
   small superscript orbit-mark chip, consistent inline and in infoboxes,
   with the hover naming the outlet. Where: all wiki leafs and fact cards.
   Why ours: sourcing is the covenant; make its mark the brand's signature
   punctuation. Effort: S.

## 6. Top 10 fixes (the proposed V-POLISH feed, in order)

1. Ink contrast floor: clamp light-mode --verse-ink to 4.5:1 (one token,
   ~40 findings die). [S]
2. Accent-text derivation + minimum-contrast fallback for accent-filled
   CTAs (New page, Create the draft, Next, Save settings, Join). [S]
3. Studio guardrail: accent-luminance validation + light/dark preview
   toggle, so no future space ships finding 1. [M]
4. V-HOME rebuild to the section 4 plan (incl. the ISR empty-fallback bake
   fix as step one). [L]
5. Album template: cover art + tinted header, linked tracks, rail with
   credits and era link. [M]
6. Compact hero variant for leaf, index, editor and tool pages (kills the
   hero tax on 12+ pages). [M]
7. Fold repair: no heading orphans, skip folding short articles. [S]
8. Song Deck grouped by album with sticky headers and per-group art; year
   chips chronological. [M]
9. Verse-scoped search results (space result type; Verse referrers keep
   Verse chrome) + in-world footer and 404 CTA. [M]
10. The seed wave (content, not code): 3 era stories, 1 flagship essay, the
    covenant v0, photocard starter set, lightstick versions, idol fact
    backfill (position, debut, agency), discussion starters. [L, parallel]

## 7. Reference anchors (veto by name)

- Album pages and the era spine: Pitchfork album reviews (art-led header,
  confident type), Bandcamp artist pages (cover-forward catalog rows).
- Song stories and the mention mesh: Genius song pages (annotation-first
  hypertext, without the clutter).
- Oversized vitals and stat bands: Spotify Wrapped editorial typography,
  Apple Music artist "essentials" headers.
- Indexes that stay readable at density: NTS Radio show archive, Resident
  Advisor event listings (dense, scannable, no card soup).
- Timeline storytelling: The Pudding's music data essays (data as
  narrative, restrained color).
- Community warmth without noise: Letterboxd member and activity rows
  (avatars + one-line provenance as social proof).

## Appendix: journey notes

- Fact hunt (logged out, Play home to Jin's birthday): world toggle, space
  card, Members tab, idol page; 4 clicks, birthday NOT visible above the
  fold on the idol page (facts card holds only Born + Nationality, below
  the hero).
- The world toggle is a plain link pair to the world roots; from deep pages
  it discards your location (no 404 involved; the earlier 404 flash was a
  dev-transition artifact and was re-verified clean on an idle server).
- Verse footer: /leaderboard and /search exit the world silently; all
  links return 200 (no dead footer links).
- Mobile More sheet: 43 in-space links revealed at once; labels concatenate
  name+hangul and title+year; no current-section state.
- About (mobile, idle server): h1 and world toggle present; breadcrumb
  absent (only sibling page without one).
