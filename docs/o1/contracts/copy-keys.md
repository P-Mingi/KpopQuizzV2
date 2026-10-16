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
from (P 5.4 wireframes W1 to W5, Q B01, B06, B09, B13, BACKLOG lane cards).

### kpop (kpopquiz.org: everything below is behind a flag and invisible until L1 flips it)

| namespace | keys | S |
|---|---|---|
| `kpop.b6` | footer: line, linkLabel | S (O1, H1 compose the same line on their sites; Q0a allowlist) |
| `kpop.b6` | menu: heading, passport, level | S (Q0a: the kpop-only account menu DOM stays today's) |
| `kpop.b6` | settings: passportRow, passportOpen | |
| `kpop.b6` | llms: networkLine | |
| `kpop.p1` | welcome: title, body, start, howIAppear, privacy (arrivals from anime, NET_WELCOME) | |
| `kpop.b4` | land: opening, continue | S (B4 test: the land page names only its own brand) |
| `kpop.x1` | fact: tag, line, optInTitle, optInBody, optInYes, optInNo | S (D0 frames, X1 snapshot list) |
| `kpop.l1` | network: title, under5 (the /admin/network dashboard, admin only) | |

### anime (otakuquiz.org)

| namespace | keys | S |
|---|---|---|
| `anime.o1` | nav: home, series, blindTest, create, daily, search, signIn, menu | |
| `anime.o1` | tab: home, series, play, create, me | |
| `anime.o1` | footer: fanMade, about, editorialPolicy, privacy, terms, contact, network | S (`footer.fanMade`: legal pages and D0) |
| `anime.o1` | common: new, seeAll, loading, retry | S (`common.new`: rule 7, every anime lane shows "New" below a threshold with it) |
| `anime.o1` | home: h1, lede, dailyTitle, seriesTitle, openingsTitle, newQuizzesTitle | |
| `anime.o1` | notFound: title, body, home | S (Q0a 404 leak check) |
| `anime.o1` | search: placeholder, empty, seriesLabel, quizLabel | |
| `anime.o1` | about: h1, teamTitle, reviewerTitle, howMadeTitle | |
| `anime.o1` | editorial: h1, correctionsTitle | |
| `anime.o1` | daily: h1, lede, comeBack | |
| `anime.o2` | hub: start, sources, quizzesByArc, characters, openings, storyMap, facts, related, faq, nowAiring, community | |
| `anime.o2` | series: h1, lede, tierFilter, typeFilter | |
| `anime.o2` | mix: h1, lede | |
| `anime.o2` | trivia: h1, sourcesTitle | |
| `anime.o2` | oshi: button, count | |
| `anime.o3` | spoiler: safeForYou, covers, gatedQuestion, interstitialTitle, interstitialBody, showAnyway, setProgress | S (O2 and O5 render SpoilerShield; Q0a spoiler case) |
| `anime.o3` | shield: title, progressLabel, spoilerFree, showEverything | S |
| `anime.o3` | report: action, sent, covered | |
| `anime.o3` | results: keepPlaying, share, playAgain | |
| `anime.o4` | picker: title, search, requestSeries, mix | |
| `anime.o4` | focus: medium, upToArc, characters | |
| `anime.o4` | question: kind, spoilerTag, source | |
| `anime.o4` | rule: one key per S 3.4 rule code (the codes server and editor share are O4's) | |
| `anime.o5` | which: h1, start, result, retake | |
| `anime.o5` | nameAll: h1, start, giveUp, found | |
| `anime.o5` | tot: h1, pick, result | |
| `anime.o6` | bt: h1, start, round, reveal, result | |
| `anime.o6` | ootd: h1, lede, comeBack | |
| `anime.p1` | me: title, history, wholePassport | |
| `anime.p1` | u: since, also, joined, followers, xpTo, streak, mastered, made, plays, alsoOn, follow, seriesMastered | S (`u.alsoOn`: the stamp chip, B3 visibility tests) |
| `anime.p1` | team: chip, profileLine | S (rule 7: the Team badge and "Editorial account of OtakuQuiz", read by O1 /about and O2 bylines) |
| `anime.p1` | settings: profile, displayName, photo, bio, header, anime, yourSeries, oshi, watchingSince, look, notifications, appearance, account | |
| `anime.p1` | account: passportRow, signOutEverywhere, signOutHere | S (B7 sign-out tests click them) |
| `anime.p1` | oshi: rowTitle, pick, custom, refusedSpoiler | |
| `anime.p1` | welcome: title, body, start, howIAppear, privacy, newTitle, newBody | S (Q0a string leak test, D0 frames) |
| `anime.p1` | appear: title, body, change | |
| `anime.p1` | signin: saveScore, body, google, emailDivider, emailPlaceholder, emailCta, sent, network, privacy | S (B4 and B7 e2e) |
| `anime.p1` | onboarding: usernameTitle, usernameHint, usernameTaken | |
| `anime.p1` | keep: question, yes, notNow | |
| `anime.b4` | land: opening, continue | S |
| `anime.b6` | footer: line, linkLabel | S |
| `anime.b6` | menu: heading, passport, level | |
| `anime.b6` | llms: networkLine | |
| `anime.b7` | email: magicLink.subject, magicLink.heading, magicLink.button, signup.subject, signup.heading, signup.button, emailChange.subject, emailChange.heading, emailChange.button, reauth.subject, reauth.heading, ignore, footerNetwork, footerPrivacy | S (B7 byte and brand tests) |
| `anime.x1` | credit: line, linkLabel | S (O2's openings table slot) |
| `anime.e1b` | review: title, approve, edit, reject, sample, batchReturned | |

### hub (fanquiz.org)

| namespace | keys | S |
|---|---|---|
| `hub.h1` | nav: passport, settings, signIn | |
| `hub.h1` | home: h1, lede, sitesTitle, cardOpen, sharesTitle | |
| `hub.h1` | shares: one key per line of "What your passport shares" | S (H1 test: the home block equals the /privacy block word for word) |
| `hub.h1` | privacy: h1, updated, kpopParagraph | S (G16 texts) |
| `hub.h1` | passport: title, since, level, levelPrivate, change, memberships, membershipsHint, moreSites, cardShownOnly, open, otherSites, otherSitesVisit | |
| `hub.h1` | tabs: overview, quizzes, played, badges, friends | |
| `hub.h1` | filter: site, type, all | |
| `hub.h1` | feed: today, thisWeek, earlier | |
| `hub.h1` | u: passport, seeOn, showcase | |
| `hub.h1` | settings: tabSites, tabProfile, tabSecurity, tabData, sitesTitle, memberSince, interested, interestedHint, stampsTitle, stampLabel, stampHint, levelTitle, levelToggle, showcaseTitle, showcaseHint, menuTitle, menuAuto, menuAlways, menuNever, appearTitle, editOn, propagation | |
| `hub.h1` | security: methods, signOutHere, signOutEverywhere, activeSites | S (B7 sign-out tests) |
| `hub.h1` | data: download, leave, delete | |
| `hub.h1` | delete: freshSignIn, summaryLine, keep, remove, typeToConfirm, confirm, scheduled, cancel | S (B7 deletion e2e) |
| `hub.h1` | signin: title, google, emailPlaceholder, emailCta, sent, network | |
| `hub.h1` | common: new | S (rule 7) |
| `hub.h1` | notFound: title, body, home | S (Q0a 404 check) |
| `hub.b4` | land: opening, continue | S |
| `hub.b7` | email: (as `anime.b7`), deletionScheduled.subject, deletionScheduled.body, deletionScheduled.cancel | S |

## 4. Vocabulary that is not copy

Topic and member words (series, character, oshi, group, bias) come from `SITE.vocabulary` (registry.md), not from
copy files: a component that says "Your series" on anime and "Your groups" on kpop composes the registry word with
its own lane key. "worlds" appears only on fanquiz.org copy; kpopquiz.org and otakuquiz.org say "sites" (v2 decision 3,
default, pending).
