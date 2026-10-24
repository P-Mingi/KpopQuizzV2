# Copy keys (o1-contract-v1)

Keys only: the text is never frozen (the owner approves the policy texts at G16; every other string is the owning
lane's, reviewed by R). Rule 10 applies to every string: English, no dash characters (U+2013, U+2014), no emoji,
nothing K-pop on otakuquiz.org, nothing anime on kpopquiz.org unless the user chose it (artist credits excepted).
Copy strings never go into the shared `lib/i18n` dictionaries. Test: `contract.test.ts` (file names, shape, banned
characters and words, for every copy file that exists).

## 1. Files and shape

- One file per site and lane: `apps/quiz/src/copy/<site>/<lane>.ts`, lane id in lower case (`copy/anime/o1.ts`,
  `copy/kpop/b6.ts`, `copy/hub/h1.ts`). A lane writes only its own files (ORCH assigns them, request F0-1).
- Shape (frozen):

  ```ts
  // apps/quiz/src/copy/anime/o1.ts
  export const COPY = {
    'nav.series': 'Series',
    'common.new': 'New',
  } as const satisfies Readonly<Record<string, string>>;
  ```

  The full key is `<site>.<lane>.<key in the file>`, e.g. `anime.o1.nav.series`. Keys inside a file match
  `^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+$` (an area, then one or more names, camelCase segments).
- Values are plain strings. Placeholders are `{name}` (camelCase), filled by the component; plurals are two keys
  ending `.one` and `.other`. No HTML, no Markdown: links and emphasis are composed in the component.
- A brand or a domain is never written in a copy string when the registry holds it: use `{brand}`, `{network}`,
  `{domain}` and fill them from `SITE.brand.name`, `NETWORK.name`, `SITE.domain`. A string that names another site
  does so only through a placeholder filled from `siteConfig(id)`.
- Banned in `copy/anime/*`: the word "K-pop" in any spelling (`/k-?pop/i`, which also catches KpopQuiz and
  kpopquiz.org). The leak suite of Q0a checks the rendered pages on top of this.
- Emails of B7 run in a Supabase Edge Function, which cannot import from `apps/quiz`: B7 keeps the same keys in
  `supabase/functions/send-email/copy/<site>.ts` (same shape), and the kpop branch keeps today's template bytes
  (no kpop email key exists).

## 2. Who may change a key

- **Lane keys**: every key of a lane's own files is that lane's. Adding, renaming or removing one needs no CR: the
  lane lists the change in its report, and D0's `copy-deck.md` follows at G5 (F0 decision; BACKLOG 5.2 allows new
  copy keys, this contract pre-approves them inside a lane's own namespace).
- **Shared keys** (marked S below): read by another lane's component, test or check. Renaming or removing one is a
  CR to ORCH; their text still belongs to the owning lane.

## 3. Initial keys per site and lane

Written as `area: name, name, ...` inside each `<site>.<lane>` namespace. These are the keys D0's copy deck starts
from (P 5.4 wireframes W1 to W5, Q B01, B06, B13, BACKLOG lane cards).

Rule 18 (TWINS.md): the keys of an anime or hub screen are the slots of its twin (TWINS.md), in the twin's order; a key
with no twin slot needs one of the row's codes or an approved CR. A slot the row's F code removes has no key. Keys
marked **pending** belong to a surface without a TWINS row (request F0-8): nothing renders them, they are not S, and
they become lane keys (or S) only when the owner approves a row or a CR; a refused CR removes them.

CR-002 to CR-006 were refused for O1 by the owner on 18 October 2026 (LEDGER D-027), backlog after launch: their keys
are removed and nothing is reserved for them (the anime and kpop welcome cards with `kpop.p1` and `anime.p1.welcome`,
"How I appear here" `anime.p1.appear`, "Keep anime in your passport?" `anime.p1.keep`, the post-result oshi row
`anime.p1.oshi.rowTitle`). A lane that adds one of these keys before a new CR is approved is a review finding.

### kpop (kpopquiz.org: everything below is behind a flag and invisible until L1 flips it)

| namespace | keys | S |
|---|---|---|
| `kpop.b6` | footer: line, linkLabel | S (O1, H1 compose the same line on their sites; Q0a allowlist) |
| `kpop.b6` | menu: heading, passport, level | S (Q0a: the kpop-only account menu DOM stays today's) |
| `kpop.b6` | settings: passportRow, passportOpen | |
| `kpop.b6` | llms: networkLine | |
| `kpop.b4` | land: opening, continue | pending (TWINS row 37: the land page renders no visible content; a visible one needs a row or a CR, request F0-8) |
| `kpop.x1` | fact: tag, line, optInTitle, optInBody, optInYes, optInNo | S (D0 frames, X1 snapshot list) |
| `kpop.l1` | network: title, under5 (the /admin/network dashboard, admin only) | pending (no TWINS delta row yet, request F0-8) |

### anime (otakuquiz.org)

| namespace | keys | S |
|---|---|---|
| `anime.o1` | nav: home, quizzes, series, blindTest, community, leaderboard (the twin `NAV_ITEMS` order; series through V) | |
| `anime.o1` | actions: search, create, streak, streakWeek, playToday, seePassport, notifications, markAllRead, seeAllNotifications, account, passport, myQuizzes, drafts.one, drafts.other, settings, signOut, signIn (the slots of the twin `ux-nav-actions.tsx`) | |
| `anime.o1` | tab: home, quizzes, blindTest, community, you (the twin `TAB_ITEMS` order) | |
| `anime.o1` | footer: tagline, madeBy, colPlay, daily, blindTest, allQuizzes, popularQuizzes, trivia, colExplore, series, trending, newQuizzes, colCommunity, feed, leaderboard, create, colSupport, help, about, editorialPolicy, contact, privacy, terms, dmca, topSeries, copyright, theme, fanMade (the twin `ux-footer.tsx` columns and rows in order; F removes Ranked, the data, article and news links, Fandoms, Discord, Reddit and the locale switcher, CR-007; the B6 network line renders from `anime.b6.footer`) | S (`footer.fanMade`, A6: legal pages and D0) |
| `anime.o1` | common: new, seeAll, loading, retry | S (`common.new`: rule 7, every anime lane shows "New" below a threshold with it) |
| `anime.o1` | home: h1, lede, qotdTitle, continueTitle, seriesTitle, seriesAll, trendingTitle, trendingAll, bestTitle, bestAll, newTitle, newAll, openingsBand, communityTitle, communityAll (one key per twin `UxHome` section, in its order) | |
| `anime.o1` | notFound: code, title, body, searchPlaceholder, searchLabel, popularTitle, home, browse, create (the twin `app/(site)/not-found.tsx`; F removes the Discord line) | S (Q0a 404 leak check) |
| `anime.o1` | search: placeholder, empty, seriesLabel, quizLabel | |
| `anime.o1` | about: h1, teamTitle, reviewerTitle, howMadeTitle | |
| `anime.o1` | editorial: h1, correctionsTitle | |
| `anime.o1` | faq, dmca: one key per section of the twin page (CR-001, TWINS rows 34 and 36) | |
| `anime.o1` | leaderboard: one key per slot of the twin `components/leaderboard/ux-v1/leaderboard.tsx` the row keeps (CR-001, row 35; F removes the fandom war board) | |
| `anime.o2` | hub: start, sources, quizzesByArc, characters, openings, storyMap, facts, related, faq, nowAiring, community | |
| `anime.o2` | series: h1, lede, filter (the one filter field of the twin `groups-browser.tsx`) | |
| `anime.o2` | mix: h1, lede | |
| `anime.o2` | trivia: h1, sourcesTitle | |
| `anime.o2` | oshi: button, count | |
| `anime.o2` | quizzes: one key per slot of the twin `quizzes-page.tsx` and `controls.tsx` (CR-001, row 31) | |
| `anime.o2` | lists: one title and one lede per twin list page: popularToday, popularThisWeek, popularThisMonth, new, mostLiked, trending (CR-001, rows 31b to 32c) | |
| `anime.o2` | triviaIndex: one key per section of the twin `/trivia` (CR-001, row 33) | |
| `anime.o3` | spoiler: safeForYou, covers, gatedQuestion, interstitialTitle, interstitialBody, showAnyway, setProgress | S (rendered only on the rows that list A5: 3, 5, 6, 9, 15, 23, 23b, 25 of TWINS.md; Q0a spoiler case) |
| `anime.o3` | shield: title, progressLabel, spoilerFree, showEverything | S |
| `anime.o3` | report: action, sent, covered | |
| `anime.o3` | results: keepPlaying, share, playAgain | |
| `anime.o4` | picker: title, search, requestSeries, mix | |
| `anime.o4` | question: kind, spoilerTag, source (A5: the spoiler tag and the source of each question) | |
| `anime.o4` | rule: one key per S 3.4 rule code (the codes server and editor share are O4's) | |
| `anime.o5` | which: h1, start, result, retake | |
| `anime.o5` | nameAll: h1, start, giveUp, found | |
| `anime.o5` | tot: pick, result (the bonus has no page and no h1) | |
| `anime.o6` | bt: h1, start, round, reveal, result | |
| `anime.o6` | ootd: h1, lede, comeBack | |
| `anime.p1` | me: title, history, wholePassport | |
| `anime.p1` | u: since, also, joined, followers, xpTo, streak, mastered, made, plays, follow, seriesMastered | |
| `anime.p1` | u: alsoOn (the stamp chip: row 17 has no network chip) | pending (a CR, request F0-8) |
| `anime.p1` | team: chip, profileLine | S (rule 7: the Team badge and "Editorial account of OtakuQuiz", read by O1 /about and O2 bylines) |
| `anime.p1` | settings: profile, displayName, photo, bio, header, anime, yourSeries, oshi, watchingSince, look, notifications, appearance, account | |
| `anime.p1` | account: passportRow, signOutEverywhere, signOutHere | S (B7 sign-out tests click them) |
| `anime.p1` | oshi: pick, custom, refusedSpoiler | |
| `anime.p1` | signin: saveScore, body, google, emailDivider, emailPlaceholder, emailCta, sent, network, privacy | S (B4 and B7 e2e) |
| `anime.p1` | onboarding: usernameTitle, usernameHint, usernameTaken | |
| `anime.b4` | land: opening, continue | pending (as `kpop.b4`) |
| `anime.b6` | footer: line, linkLabel | S |
| `anime.b6` | menu: heading, passport, level | |
| `anime.b6` | llms: networkLine | |
| `anime.b7` | email: magicLink.subject, magicLink.heading, magicLink.button, signup.subject, signup.heading, signup.button, emailChange.subject, emailChange.heading, emailChange.button, reauth.subject, reauth.heading, ignore, footerNetwork, footerPrivacy | S (B7 byte and brand tests) |
| `anime.x1` | credit: line, linkLabel | S (O2's openings table slot) |
| `anime.e1b` | review: title, approve, edit, reject, sample, batchReturned | |

### hub (fanquiz.org)

| namespace | keys | S |
|---|---|---|
| `hub.h1` | nav: home; actions: the slots of the twin `ux-nav-actions.tsx` the hub keeps (account, passport, settings, signOut, signIn); tab: home, you (TWINS row H-0: the twin shell, N removes the quiz items) | |
| `hub.h1` | home: h1, lede, sitesTitle, cardOpen, sharesTitle | |
| `hub.h1` | shares: one key per line of "What your passport shares" | S (H1 test: the home block equals the /privacy block word for word) |
| `hub.h1` | privacy: metaTitle, metaDescription, draftBanner, h1, updated, lede, controller, who.*, account.*, shared.*, keeps.*, audience.*, cookies.*, services.*, delete.*, retention.*, rights.*, children.*, law.*, contact.*, notice.*, delete.p5 (final text, owner 2026-10-24; D-108); legal: metaTitle, metaDescription, h1, sub, lede, publisher.*, director.*, host.*, data.*, form, siren, director (D-111) | S |
| `hub.h1` | passport: title, since, level, levelPrivate, change, memberships, membershipsHint, moreSites, cardShownOnly, open, otherSites, otherSitesVisit | |
| `hub.h1` | tabs: overview, quizzes, history, badges (the twin `passport.tsx` tabs) | |
| `hub.h1` | filter: site, type, all | |
| `hub.h1` | feed: today, thisWeek, earlier | |
| `hub.h1` | u: passport, seeOn, showcase | |
| `hub.h1` | settings: tabSites, tabProfile, tabSecurity, tabData, sitesTitle, memberSince, interested, interestedHint, stampsTitle, stampLabel, stampHint, levelTitle, levelToggle, showcaseTitle, showcaseHint, menuTitle, menuAuto, menuAlways, menuNever, appearTitle, editOn, propagation | |
| `hub.h1` | security: methods, signOutHere, signOutEverywhere, activeSites | S (B7 sign-out tests) |
| `hub.h1` | data: download, leave, delete | |
| `hub.h1` | delete: freshSignIn, summaryLine, keep, remove, typeToConfirm, confirm, scheduled, cancel | S (B7 deletion e2e) |
| `hub.h1` | signin: title, google, emailPlaceholder, emailCta, sent, network | |
| `hub.h1` | common: new | S (rule 7) |
| `hub.h1` | notFound: code, title, body, home (the twin 404; Bf: no mascot; N removes the quiz search, the popular quizzes and the browse and create links) | S (Q0a 404 check) |
| `hub.b4` | land: opening, continue | pending (as `kpop.b4`) |
| `hub.b7` | email: (as `anime.b7`), deletionScheduled.subject, deletionScheduled.body, deletionScheduled.cancel | S |

## 4. Vocabulary that is not copy

Topic and member words (series, character, oshi, group, bias) come from `SITE.vocabulary` (registry.md), not from
copy files: a component that says "Your series" on anime and "Your groups" on kpop composes the registry word with
its own lane key. "worlds" appears only on fanquiz.org copy; kpopquiz.org and otakuquiz.org say "sites" (v2 decision 3,
confirmed by the owner, G0, 2026-10-16).
