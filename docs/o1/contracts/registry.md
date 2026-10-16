# Site registry (o1-contract-v1)

Code: `apps/quiz/src/lib/site/types.ts` (shape), `registry.ts` (values), `index.ts` (entry `@/lib/site`).
Tests: `registry.test.ts`. Owner after the freeze: B1 (kpop wiring), O1 (anime values), H1 (hub values), each through
the CR rules of `CONTRACT.md` (values of anime and hub are 5.2: extendable; the shape is 5.1: frozen).

## The site of a build

- `NEXT_PUBLIC_SITE_ID` names the site; `SITE_ID` is accepted as a server alias; both unset or empty = `kpop`.
- `resolveSiteId(env)` throws on an unknown value and when the two disagree: a build fails rather than serving the
  wrong site.
- `SITE_ID` and `SITE` (the entry) are module constants. `process.env.NEXT_PUBLIC_SITE_ID` is written out in full so
  Next inlines it in client code. A non-kpop build also inlines its resolved id through `next.config.ts` `env`, so a
  project that sets only `SITE_ID` gives client code the same answer (spike, wired by ORCH).
- `siteConfig(id)` reads any entry (the hub reads all three).

## `SiteConfig` (BACKLOG 5.1, exactly these fields, in this order)

| field | type | kpop (today's literal, source) | anime | hub |
|---|---|---|---|---|
| `id` | `SiteId` | `kpop` | `anime` | `hub` |
| `kind` | `'world' \| 'hub'` | world | world | hub |
| `url` | origin | `https://kpopquiz.org` (lib/seo/org.ts, app/layout.tsx) | `https://otakuquiz.org` | `https://fanquiz.org` |
| `domain` | host | kpopquiz.org | otakuquiz.org | fanquiz.org |
| `letter` | `'k' \| 'a' \| 'f'` | k | a | f |
| `brand` | name, shortName, mascot, logo, favicon, ogTemplate | KpopQuiz, KpopQuiz (site.webmanifest), "KpopQuiz bunny" (mascot.tsx), /logo-512.png, /favicon.svg, /og-default.png (app/layout.tsx) | OtakuQuiz, OtakuQuiz, Fuki (placeholder, G18), /brand/anime/... (O1) | FanQuiz, FanQuiz, none, /brand/hub/... (H1) |
| `vocabulary` | topic, topicPlural, member, memberPlural, fandom, song, favourites {topicLabel, pickLabel, pickIcon, topicEntityType, pickEntityType} | group, groups, member, members, fandom, song; Bias group, Bias, heart, group, idol | series, series, character, characters, fandom, opening; Main series, Oshi, star, series, character | site, sites, member, members, fandom, song; Favourite site, Favourite, heart, site, site |
| `features` | the exact key list below | today with the production flags | per BACKLOG lane O1 | `passportPages` only |
| `routes.allow` | `'route-allowlist'` or patterns | `'route-allowlist'` (lib/route-allowlist.ts decides, unchanged) | routes.md | routes.md |
| `seo` | titleTemplate, indexNowKey, minPublishedForIndexableHub, organization {name, alternateName, logo, email}, llmsTxt {title} | `%s \| KpopQuiz`, `4b2f9a7ce8d1465fb0a3e6c95d47128a` (lib/indexnow.ts), 1 (a hub is noindex at 0 quizzes), KpopQuiz / kpopquiz.org / /logo-512.png / contact@kpopquiz.org (lib/seo/org.ts), kpopquiz.org (llms.txt) | `%s \| OtakuQuiz`, null (O1), 3, OtakuQuiz / otakuquiz.org / O1 / null (owner), otakuquiz.org | `%s \| FanQuiz`, null (H1), 0, FanQuiz / fanquiz.org / H1 / null, fanquiz.org |
| `audio` | `{ source: 'deezer', kit: 'required' }` | same on every site (rule 9) | | |
| `theme` | light, dark (token values by frozen name: `ThemeTokenName`, every name of tokens.md but `font-display`), fontDisplay | a0.css values (tokens.md), Inter | kpop values stand in until O1 (Option A after G5), M PLUS Rounded 1c | kpop values stand in until H1, Inter |
| `levelTitles` | threshold to {en, kr?} | lib/level-titles.ts LEVEL_TITLES | placeholder ladder until G6 | placeholder (`Member`) |
| `auth` | providers, googleClientIdEnv, emailLanding, signOutModes | google, discord, email; null (Supabase OAuth redirect, unchanged); `/auth/callback`; global | google, email; `NEXT_PUBLIC_GOOGLE_CLIENT_ID`; `/auth/confirm`; global, local | same as anime |
| `passport` | probeOrder (P2 hook) | `[]` (inert) | `[]` | `[]` |
| `editorial` | dailyItemCap, quizDailyCap, weeklyGroupLimit | 3 (MAX_PER_DAY), 0 (no quiz kind today), 3 (quiz-bank-scheduling.ts) | 3, 40 (G0 default: 25 to 40), 2 | 0, 0, 0 |
| `daily` | systemUserId, fallbackGroupSlug (mirror of the `sites` row) | `00000000-0000-0000-0000-000000000001`, `general-kpop` (migration 042; G3's dump confirms) | null until launch L02 (manifest.md), `anime-mix` | null, null |
| `copy` | namespace | `kpop` | `anime` | `hub` |

`PLACEHOLDERS` (registry.ts) lists, per site, every value that is a placeholder and who sets it. kpop has none.

### Feature keys (exact list; a new key is a CR and defaults to false)

`quizzes, topicHubs, trivia, create, dailyQuiz, blindTest, dailyBlindTest, openingOfTheDay, nameAll, personality,
thisOrThat, trueFalse, imageQuiz, fandomWar, mvPulse, airingBanner, spoilers, live, community, ranked, challenges,
leaderboards, news, articles, dataPages, localizedLandings, verse, embed, passportPages, directory`.

| site | on |
|---|---|
| kpop | every key except openingOfTheDay, airingBanner, spoilers, passportPages, directory |
| anime | quizzes, topicHubs, trivia, create, dailyQuiz, blindTest, openingOfTheDay, nameAll, personality, thisOrThat, airingBanner, spoilers, community, challenges, leaderboards |
| hub | passportPages (directory is an optional stretch of H1: off) |

Anime off, with the reason: imageQuiz (no character, poster, logo or cover image, rule 8), fandomWar and mvPulse
(kpop only), live (off at launch, G0 default), verse, embed, localizedLandings; news, articles, dataPages and ranked
(code F of TWINS.md, CR-001: the slot is absent from nav, tab bar, footer and home); dailyBlindTest (the anime daily
opening is `openingOfTheDay`, TWINS row 13), trueFalse (no route in the BACKLOG 5.1 map, a kpop landing family).
Leaderboards are on (CR-001, TWINS row 35): the twin of `/leaderboard` exists, Team accounts stay off every board
(rule 7).

## Rules for the wiring lanes

- B1 replaces a literal with `SITE.*` only where the kpop value renders the same bytes (registry.test.ts proves the
  values; Q0a's parity proves the pages). kpop vocabulary text is rendered nowhere yet: when B1 wires a vocabulary
  field, it sets the value to the string that page renders today (a correction of a kpop vocabulary value to
  today's literal is not a CR; anything else is).
- `LEVEL_TITLES` stays exported from lib/level-titles.ts; `levelTitlesFor(site)` reads the registry.
- No code outside `lib/site/` reads `process.env.NEXT_PUBLIC_SITE_ID` or `process.env.SITE_ID`: it imports `SITE` or
  `SITE_ID`.
- The hub reads the other entries with `siteConfig(id)`, never by importing a world's files.
