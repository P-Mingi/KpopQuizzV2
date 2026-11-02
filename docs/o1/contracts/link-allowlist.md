# Cross-site link allowlist (link-allowlist.md)

Contract `o1-contract-v1`, owner F0. Sources: BACKLOG 5.1 ("the cross-site link allowlist: footer link to fanquiz.org,
About lines, Team article, network page"), Q-bridges D0 (`check-network-links`), B01, B02, B03, B17, 7.1 and 7.2.
Machine form: `link-allowlist.json` (same rows, same order; `contract.test.ts` compares the two). Q0a's
`apps/quiz/scripts/o1/check-network-links.mts` and its leak suite read the JSON file before their own copy.

## 1. The rule

An anonymous visitor's page on one site of the network may carry a link to another site of the network (kpopquiz.org,
otakuquiz.org, fanquiz.org, their `www.` forms and dev hosts) only through a row of section 2. Every other cross-site
link a visitor can follow is a same-origin `/auth/passport/out` link (`bridgeHref`, robots-disallowed, signed in only)
and is not a cross-site link in this sense. On top of the rows:

1. No cross-site link of an anonymous page carries `via` or any other query parameter (`query: false` on every row).
2. No canonical or alternate head link points to another site of the network (Q 7.1: never a cross-domain canonical).
3. On otakuquiz.org the HTML (markup, metadata, JSON-LD, page data, scripts) never contains `kpopquiz.org` outside the
   allowlisted links, and on kpopquiz.org never `otakuquiz.org` (`domainText`). The network parent (`fanquiz.org`, the
   `parentOrganization` of each site's Organization) is allowed everywhere.
4. A row admits a link only from its sites, on its pages, to its targets, on its target paths, with its `rel`, at most
   `max` times per page and target. "followed" means the link must not carry `nofollow`; "nofollow" means it must.
5. Rows render behind their flag or their launch file: before launch no page carries any of them (Verrou 0), so the
   check is green on today's kpopquiz.org with no cross-site link at all.

## 2. Rows

| id | from | page | to | href | rel | query | max | source |
|---|---|---|---|---|---|---|---|---|
| footer | kpop, anime | * | hub | / | followed | no | 1 | Q B01, D1; flag NEXT_PUBLIC_NET_FOOTER |
| about-kpop | kpop | /about | anime | / | followed | no | 1 | Q B17, D6; kpopquiz.org/about, launch file |
| about-anime | anime | /about | kpop, hub | / | followed | no | 1 | Q B17, D6; otakuquiz.org/about (O1) |
| team-article | kpop | (none yet) | anime | / | followed | no | 1 | Q B17, D6; one Team article on kpopquiz.org, its path set by a CR at launch |
| network-page | hub | / | kpop, anime | / | followed | no | 1 | Q B02, D2; fanquiz.org home (H1) |
| directory | hub | /directory | kpop, anime | /** | nofollow | no | (none) | Q B03, D2; fanquiz.org/directory (H1, optional), noindex, follow |
| dle-daily | hub | /daily | kpop, anime | /** | followed | no | (none) | CR-013; the Terrier: yesterday's answers, the quiz of the group; the hub's anime site in the footer; with the flag on |
| dle-daily-fr | hub | /fr/daily | kpop, anime | /** | followed | no | (none) | CR-013; as dle-daily, in French |
| dle-game | hub | /kpopdle/** | kpop, anime | /** | followed | no | (none) | CR-013; a game page: yesterday's answer and the result, the quiz of the group; with the flag on |
| dle-game-fr | hub | /fr/kpopdle/** | kpop, anime | /** | followed | no | (none) | CR-013; as dle-game, in French |
| kpopdle-home | kpop | / | hub | /kpopdle | followed | no | 1 | CR-018; the Kpopdle module of the kpopquiz.org home, its Play link; flag NET_KPOPDLE_HOME with the hub's dailyGuess |
| kpopdle-home-daily | kpop | / | hub | /daily | followed | no | 1 | CR-018; the same module, its All daily games link; same flags |
| dle-otakudle | hub | /otakudle/** | kpop, anime | /** | followed | no | (none) | CR-017; /otakudle: yesterday's answer and the result, the quiz of the series; with the flag on |
| dle-otakudle-fr | hub | /fr/otakudle/** | kpop, anime | /** | followed | no | (none) | CR-017; as dle-otakudle, in French |
| kpopdle-quiz-end | kpop | /q/** | hub | /kpopdle | followed | no | 1 | CR-025; link 2: the Kpopdle row in Keep playing under Next quiz, drawn after a K-pop quiz; flag NET_KPOPDLE_QUIZEND with the hub's dailyGuess |
| kpopdle-group | kpop | /*-quiz | hub | /kpopdle | followed | no | 1 | CR-025; link 3: the Kpopdle card of a group page, /{group}-quiz; flag NET_KPOPDLE_GROUP with the hub's dailyGuess, shown only when the group has members in the game pool |
| anime-daily-home-otakudle | anime | / | hub | /otakudle | followed | no | 1 | CR-025; link 10: the Daily games module of the OtakuQuiz home, Play Otakudle; the hub's dailyGuess |
| anime-daily-home-one-piece | anime | / | hub | /otakudle/one-piece | followed | no | 1 | CR-025; link 10: the same module, Play One Piece; same switch |
| anime-daily-home-dragon-ball | anime | / | hub | /otakudle/dragon-ball | followed | no | 1 | CR-025; link 10: the same module, Play Dragon Ball; same switch |
| anime-series-one-piece | anime | /one-piece-quiz | hub | /otakudle/one-piece | followed | no | 1 | CR-025; link 11: the card The One Piece character of the day on the series page; the hub's dailyGuess |
| anime-series-dragon-ball | anime | /dragon-ball-quiz | hub | /otakudle/dragon-ball | followed | no | 1 | CR-025; link 12: the card The Dragon Ball character of the day on the series page; the hub's dailyGuess |
| anime-quiz-end | anime | /q/** | hub | /otakudle | followed | no | 1 | CR-025; link 13: Daily challenge, the mystery character, in Keep playing after an anime quiz; the hub's dailyGuess |

Page and href patterns: `*` any page, `/x/**` the path `/x` and everything below it, `/*-quiz` one path segment that ends with `-quiz` (CR-025: the group hubs, `/twice-quiz`, and nothing deeper), otherwise the exact path; `(none
yet)` is `null` in the JSON (the row admits nothing until a CR names the page). The copy of each line is Q's (B01, B02,
B17) and lives in the lanes' copy files (copy-keys.md); the anchors are brand names, never keywords (Q 7.1).

## 3. Changes

A new row, a new page on a row, a higher cap or a new target is a CR (CONTRACT.md): it is the run's only path to a
cross-site link Google can see, so R-ARCH reviews it against Q 7.1 and 7.2. Known candidates, each needing its CR when
its lane builds it: the Team article's path (X1 at launch), a hub `/privacy` link to a site's own policy (H1), the hub
`/u/{username}` stamps if H1 renders them as direct links instead of jump links (H1, noindex page), B15's webtoon hub and
B23's Cup page (later bridges, not in the run).

## 4. Who uses it

| lane | use |
|---|---|
| Q0a | `check-network-links.mts` and the link leak suite read `link-allowlist.json` |
| B6 | the footer line (`footer`), the Organization `parentOrganization` and the llms.txt line |
| O1 | the anime About line (`about-anime`) and the footer through B6's component |
| H1 | the network page (`network-page`), the optional directory (`directory`), and the Kpopdle module of the kpopquiz.org home (`kpopdle-home`, `kpopdle-home-daily`, CR-018), drawn only when the hub serves both pages ; the Kpopdle row of the quiz end and the Kpopdle card of a group page (`kpopdle-quiz-end`, `kpopdle-group`, CR-025), each behind its own flag; and the links of OtakuQuiz to the three anime games (`anime-daily-home-*`, `anime-series-*`, `anime-quiz-end`, CR-025), behind the hub's `dailyGuess` |
| X1 | the kpop About line and the Team article (`about-kpop`, `team-article`); every crossover link stays a signed-in jump link (`CrossoverLink`), never a row here |
