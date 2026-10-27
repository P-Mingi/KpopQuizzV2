# General K-pop theme pages: plan (2026-10-27)

Plan only. No code, no database write, no git change. Data: a SELECT on public.quizzes and public.groups (project rdkgouofytwfdpbxbzio) on 2026-10-27; repo read from origin/main at 4a81a7d; GSC exports in docs/refonte/gsc (2026-06-17 to 2026-09-16); live HTML of 9 pages fetched the same day to count links.

## 0. What exists today

- 170 published quizzes have the group `general-kpop` (id 30). Owner, 2026-10-06: it is a category, not a group (`isCategoryGroup` in lib/ux-v1/p3/model.ts). Its hub /general-kpop-quiz is live, indexable, and lists all 170 quizzes as real links (12 cards, the rest in a native `<details>`). GSC: 153 impressions, 10 clicks in 90 days.
- The home, /quizzes, /groups, /kpop-games and /trivia do not link /general-kpop-quiz (checked in the live HTML). The home rail drops the category on purpose. /quizzes only links `?group=general-kpop` (a filter URL). Today the hub is reached through a quiz page breadcrumb ("Home / General K-pop Quiz / title"), so a quiz is within 3 clicks only when the home happens to list a general quiz in its trending or new rows.
- The hub meta description uses the group formula: "Test your knowledge of General K-pop's members, songs, eras, and history, then prove you are a real fan." It is wrong for a category (no members, no fandom).
- Quiz pages pick "Keep playing" from the same group by plays or recency, so inside the category the links pile onto the top and newest quizzes.
- Pages that already own a format or an intent, so they are not themes: /kpop-true-or-false (true or false format, all groups), /easy-kpop-quizzes and /articles/best-kpop-quizzes-for-beginners (beginners), /hard-kpop-quizzes, /trivia ("kpop trivia"), /articles/kpop-generations-explained ("kpop generations", "what gen is X"), /guess-the-kpop-idol (clue quizzes), /guess-the-kpop-song and /blindtest (audio), /groups ("kpop groups a-z"), /name-them-all (planned, "name all kpop groups").

## 1. The 10 themes

Every published General K-pop quiz has exactly one primary theme (170 of 170). 163 are listed; 7 are held off the theme pages until the owner reviews them (section 5). A quiz may also appear once in a second theme, in a short "Also fits this topic" block under the main list (26 such listings, at most 4 per theme).

| # | Theme (primary phrase) | URL | Quizzes listed today | Held | Also fits | GSC impressions of its quiz pages (90 days) | Demand or gap |
|---|---|---|---|---|---|---|---|
| 1 | K-pop history quiz | /kpop-history-quiz | 19 | 1 | 3 | 4 | "how long does a kpop generation last" 7, "how long is a kpop generation" 5, "when does 5th gen kpop end" 5, "kpop generations timeline" 2, "kpop era meaning" 1, "is psy 1st gen kpop" 1 (impressions, GSC 2026-06-17 to 09-16) |
| 2 | K-pop debut quiz | /kpop-debut-quiz | 8 | 0 | 4 | 11 | "when did shinee debut" 1, "what year did ateez debut" 1, "what was the first 5th gen kpop group" 1 |
| 3 | K-pop company quiz | /kpop-company-quiz | 15 | 0 | 0 | 44 | No query yet |
| 4 | K-pop fandom quiz | /kpop-fandom-quiz | 25 | 1 | 1 | 26 | "what are ive fans called" 4, "blink fandom exam" 2, "exo fandom name exo-l" 1, "stray kids fandom name" 1, "i-dle fan name" 1. |
| 5 | K-pop discography quiz | /kpop-discography-quiz | 23 | 1 | 4 | 13 | "kpop discography quiz" 54 (position 8.3, 0 clicks), "aespa all songs test" 23, "cortis song quiz" 15, "twice songs quiz" 5 + "twice song quiz" 5, "aespa song quiz" 5. |
| 6 | K-pop dance quiz | /kpop-dance-quiz | 8 | 0 | 2 | 20 | No query yet |
| 7 | K-pop awards quiz | /kpop-awards-quiz | 9 | 0 | 3 | 3 | No query yet |
| 8 | K-pop drama and variety quiz | /kpop-drama-variety-quiz | 11 | 0 | 1 | 6 | No query yet |
| 9 | K-pop idol quiz | /kpop-idol-quiz | 22 | 2 | 4 | 14 | "kpop picture trivia" 9, "quiz idol" 2, "kpop idol test" 1, "who is this idol" 2 |
| 10 | K-pop groups quiz | /kpop-groups-quiz | 23 | 2 | 4 | 42 | "name all kpop groups" 6, "kpop girl groups" 3, "how many kpop groups can you name" 2, "kpop girl groups list" 2, "kpop logo quiz" 1 |

Smallest themes: debut 8, dance 8, awards 9. Largest: fandom 25, discography 23, groups 23 (17 if the single-group quizzes move to their hubs, section 5).

### Themes tested and rejected

- K-pop true or false: /kpop-true-or-false already owns the format (and it is in /kpop-games). The 36 true or false General K-pop quizzes go to their topic; that page keeps listing them by type.
- K-pop for beginners: /easy-kpop-quizzes ("Easy K-pop Quizzes for Beginners", 16 impressions, 6 clicks) and the beginners article own it. Each theme already starts with its easy quizzes and links /easy-kpop-quizzes.
- K-pop generations as its own page: /articles/kpop-generations-explained owns "kpop generations" and "what gen is X". Generation quizzes live inside the history theme, whose title, H1 and meta never use the word, and which links the article with the anchor "K-pop generations explained".
- Music videos alone: 3 quizzes (under 5). Merged with choreography into the dance theme.
- Food alone (4) and fashion alone (4): too small and not cross-group intents; they sit in the idol theme, section "Idol life, food and style".
- A separate "fan culture" page: same intent as "K-pop fandom quiz" (two pages would compete). It is a section of the fandom theme.

### Cluster check (TARGETS.md)

No theme takes a listed cluster. Each theme links the owner it touches with the owner's anchor (rulebook 8.1) and never uses the owner's phrase in its title, H1 or meta:

- /kpop-history-quiz: /articles/kpop-generations-explained with "K-pop generations explained" (owns "kpop generations"; this page never targets it).
- /kpop-debut-quiz: /articles/kpop-generations-explained with "K-pop generations explained" (owns "what gen is X").
- /kpop-company-quiz: /easy-kpop-quizzes with "easy K-pop quizzes" (owns beginner intent).
- /kpop-fandom-quiz: /trivia with "K-pop trivia" (owns "kpop trivia").
- /kpop-discography-quiz: /blindtest with "K-pop blind test" (owns "blind test kpop"); /guess-the-kpop-song with "guess the K-pop song" (owns "guess the kpop song").
- /kpop-dance-quiz: /kpop-games with "K-pop games" (owns "kpop games").
- /kpop-awards-quiz: /trivia with "K-pop trivia" (owns "kpop trivia").
- /kpop-drama-variety-quiz: /trivia with "K-pop trivia" (owns "kpop trivia").
- /kpop-idol-quiz: /guess-the-kpop-idol with "guess the K-pop idol" (live page for clue quizzes).
- /kpop-groups-quiz: /groups with "K-pop groups A to Z" (owns "kpop groups a-z").
- All 10: the head term "kpop quiz" stays with /; each theme links "/" with the anchor "K-pop quiz" in its About block and /quizzes with "all K-pop quizzes".
- /kpop-groups-quiz must not target "name all kpop groups" (planned /name-them-all) nor "kpop groups a to z" (/groups).
- Add 10 rows to docs/seo/TARGETS.md in the build PR (cluster = the primary phrase, intent "play quizzes about {topic} across groups", status planned, KPI impressions and clicks).

## 2. Each theme

Shared rules for all 10:

- URL: top level, `/kpop-{topic}-quiz`, like the hubs `/{group}-quiz`. Route: a static folder `apps/quiz/src/app/(site)/kpop-{topic}-quiz/page.tsx`; a static segment wins over `(site)/[slug]`. No route-allowlist entry is needed: `isKnownRouteWith()` accepts any path ending in `-quiz`, the build guard (check-route-allowlist.mts) uses the same predicate, and the middleware matcher already skips `[^/]+-quiz`. Add the 10 slugs to `RESERVED_SLUGS` in `(site)/[slug]/page.tsx`, as was done for /kpop-true-or-false. No group row uses these slugs (checked).
- Title: the layout adds " | KpopQuiz"; lengths below include it. H1 = the primary phrase, which is also in the title, the meta and the intro (checked by the build script).
- Intro: the answer block in server HTML, 40 to 60 words, `{count}` = the live number of listed quizzes of the theme (held ones excluded). The same number feeds the facts line, the FAQ and `numberOfItems` (rulebook 4.2). The facts line beside it gives the date: "Updated {Month Year}" from the newest `created_at` of the theme, never `updated_at` (record_play bumps it).
- Order rule, inside each section: creator level easy, then medium, then hard; same level, most plays first; then oldest first; then slug. It is a path from easy to hard and differs from the hub (popular first), so the two lists never repeat each other. Plays change the order; that never triggers IndexNow. Lists below are the order on 2026-10-27.
- Floor: under 5 listed quizzes, the page turns noindex, follow and leaves the sitemap (like an empty hub).

### 2.1 K-pop history quiz

- URL: `/kpop-history-quiz` (no allowlist entry; RESERVED_SLUGS entry)
- SEO title (58 with suffix): K-pop History Quiz: Legends and the Hallyu Wave
- H1: K-pop history quiz
- Meta description (145): Take a K-pop history quiz on the eras, the 2nd generation legends, Gangnam Style and the Hallyu wave that took K-pop worldwide. Free, no sign-up.
- Intro (54 words): This K-pop history quiz page gathers {count} free quizzes about how K-pop grew: the generations, the 2nd generation legends, the Gangnam Style era and the Hallyu wave abroad. They mix many groups, so you need no favorite. Start easy at the top and end with the hardest. To learn first, read K-pop generations explained.
- Quizzes today: 19 listed, held: kpop-geral. Content date: 2026-10-25.
- Demand: "how long does a kpop generation last" 7, "how long is a kpop generation" 5, "when does 5th gen kpop end" 5, "kpop generations timeline" 2, "kpop era meaning" 1, "is psy 1st gen kpop" 1 (impressions, GSC 2026-06-17 to 09-16). These are owned by the generations article; the quiz intent "kpop history quiz" has no owner (named gap). Quiz pages of this theme: 4 GSC impressions.
- Ordered quizzes:
  - Eras and generations (13): `find-the-3rd-gen-intruder-among-4th-gen`, `k-pop-generation-history`, `4th-gen-groups-true-or-false`, `3rd-generation-k-pop-true-or-false`, `k-pop-at-big-sporting-events`, `psy-and-gangnam-style-era`, `k-pop-girl-group-generations-timeline`, `k-pop-generations-quiz`, `k-pop-and-japan`, `k-pop-goes-west`, `k-pop-global-expansion`, `4th-gen-boy-groups-quiz`, `k-pop-boy-group-generations-timeline`
  - Legacy groups (6): `bigbang-vips-only-quiz`, `girls-generation-the-legend-quiz`, `super-junior-legacy-quiz`, `fx-quiz-sms-unique-girl-group`, `k-pop-2nd-generation-legends`, `2ne1-legacy-quiz`
  - Also fits this topic: `k-pop-collaboration-with-western-artists`, `gen-5-k-pop-can-you-name-the-group`, `winner-and-ikon-quiz-yg-brothers`
- Inbound links (existing pages, anchor = the primary phrase):
  - /general-kpop-quiz: new server-rendered section "General K-pop quizzes by topic" (10 rows, UxRow)
  - /quizzes: new server-rendered "Browse by topic" row above the list (one click from the home nav)
  - /articles/kpop-generations-explained: under the generation timeline: "Test yourself: K-pop history quiz" (the home links this article)
  - /articles/kpop-eras-timeline: H2 "How can I test my K-pop era knowledge?"
  - /trivia: intro line "Ready to play? Try the K-pop history quiz"
  - plus the 9 sibling theme pages ("More General K-pop topics") and, in phase 2, every quiz of the theme through its breadcrumb.

### 2.2 K-pop debut quiz

- URL: `/kpop-debut-quiz` (no allowlist entry; RESERVED_SLUGS entry)
- SEO title (55 with suffix): K-pop Debut Quiz: Songs, Years and Timelines
- H1: K-pop debut quiz
- Meta description (151): Take a K-pop debut quiz: name the group from its debut song, guess debut years and say which group came first, from 1st gen to today. Free, no sign-up.
- Intro (52 words): This K-pop debut quiz page gathers {count} free quizzes on how groups started: debut songs, debut years, sub-unit and solo debuts, and timelines where you pick which group came first. Every quiz mixes many groups. They run from easy to hard, so start at the top and see how far you get.
- Quizzes today: 8 listed. Content date: 2026-07-28.
- Demand: "when did shinee debut" 1, "what year did ateez debut" 1, "what was the first 5th gen kpop group" 1. Thin search data; strong play data: the timeline quiz is the 2nd most played General K-pop quiz. Quiz pages of this theme: 11 GSC impressions.
- Ordered quizzes:
  - Quizzes (8): `k-pop-debuts-and-disbandments-true-or-false`, `true-or-false-debut-songs`, `which-k-pop-group-debuted-first-timeline-challenge`, `k-pop-debut-songs-name-the-group`, `k-pop-debut-years-challenge`, `k-pop-debut-years-true-or-false`, `k-pop-debut-songs-true-or-false`, `k-pop-sub-units-and-solo-debuts`
  - Also fits this topic: `k-pop-produce-series-quiz`, `which-year-did-this-song-come-out`, `k-pop-girl-group-generations-timeline`, `k-pop-boy-group-generations-timeline`
- Inbound links (existing pages, anchor = the primary phrase):
  - /general-kpop-quiz: new server-rendered section "General K-pop quizzes by topic" (10 rows, UxRow)
  - /quizzes: new server-rendered "Browse by topic" row above the list (one click from the home nav)
  - /articles/kpop-facts-every-fan-should-know: H2 "When did the biggest K-pop groups debut?"
  - /articles/kpop-eras-timeline: H2 "When did each K-pop era start?"
  - /articles/rookie-kpop-groups-2026: H2 "Follow the rookies through their quizzes"
  - plus the 9 sibling theme pages ("More General K-pop topics") and, in phase 2, every quiz of the theme through its breadcrumb.

### 2.3 K-pop company quiz

- URL: `/kpop-company-quiz` (no allowlist entry; RESERVED_SLUGS entry)
- SEO title (57 with suffix): K-pop Company Quiz: HYBE, SM, JYP, YG and More
- H1: K-pop company quiz
- Meta description (146): Take a K-pop company quiz: match groups and idols to HYBE, SM, JYP, YG and other labels, then test what you know about trainees. Free, no sign-up.
- Intro (52 words): This K-pop company quiz page gathers {count} free quizzes about the labels behind the groups: HYBE, SM, JYP, YG and smaller agencies, plus how trainees are scouted and trained. Match each group or idol to its company first, then go deeper into the business side. The quizzes run from easy to hard.
- Quizzes today: 15 listed. Content date: 2026-10-18.
- Demand: No query yet. Named gap: the most played General K-pop quiz (label matching) has no topic page; 4 single-label quizzes (HYBE, SM, JYP, YG). Quiz pages of this theme: 44 GSC impressions.
- Ordered quizzes:
  - Quizzes (15): `k-pop-company-quiz-match-the-group-to-the-label`, `k-pop-label-structure-and-companies`, `which-company-does-this-idol-belong-to`, `k-pop-training-system-and-idol-life`, `k-pop-agencies-true-or-false`, `yg-entertainment-groups-quiz`, `k-pop-companies-quiz`, `k-pop-training-system-quiz`, `jyp-entertainment-groups-quiz`, `sm-entertainment-groups-quiz`, `hybe-groups-quiz`, `k-pop-industry-business-quiz`, `which-company-is-this-group-from`, `k-pop-company-facts-true-or-false`, `winner-and-ikon-quiz-yg-brothers`
- Inbound links (existing pages, anchor = the primary phrase):
  - /general-kpop-quiz: new server-rendered section "General K-pop quizzes by topic" (10 rows, UxRow)
  - /quizzes: new server-rendered "Browse by topic" row above the list (one click from the home nav)
  - /articles/kpop-facts-every-fan-should-know: H2 "Which companies do the big K-pop groups belong to?"
  - /articles/most-played-kpop-quizzes: next to the label quiz in the most-played list
  - /easy-kpop-quizzes: intro line: "Know your labels? Try the K-pop company quiz"
  - plus the 9 sibling theme pages ("More General K-pop topics") and, in phase 2, every quiz of the theme through its breadcrumb.

### 2.4 K-pop fandom quiz

- URL: `/kpop-fandom-quiz` (no allowlist entry; RESERVED_SLUGS entry)
- SEO title (58 with suffix): K-pop Fandom Quiz: Fandom Names and Lightsticks
- H1: K-pop fandom quiz
- Meta description (154): Take a K-pop fandom quiz: guess fandom names and lightsticks, then test what you know about concerts, photocards, Weverse and fan slang. Free, no sign-up.
- Intro (49 words): This K-pop fandom quiz page gathers {count} free quizzes about fan life: official fandom names, lightsticks and group colors, concerts and tours, photocards and merch, Weverse and the slang fans use online. They mix many groups, so any fan can play. Start with the easy ones at the top.
- Quizzes today: 25 listed, held: k-pop-sasaeng-and-fan-culture-dark-side. Content date: 2026-10-24.
- Demand: "what are ive fans called" 4, "blink fandom exam" 2, "exo fandom name exo-l" 1, "stray kids fandom name" 1, "i-dle fan name" 1. Quiz pages of this theme: 26 GSC impressions.
- Ordered quizzes:
  - Fandom names and lightsticks (13): `k-pop-fandom-names-true-or-false`, `k-pop-fandoms-true-or-false`, `k-pop-concert-and-light-stick-culture`, `k-pop-fandom-names-quiz`, `k-pop-lightstick-colors-and-shapes`, `k-pop-concert-and-tour-facts`, `guess-the-group-from-their-lightstick-girl-groups`, `name-the-group-from-the-fandom-name`, `k-pop-group-colors-and-lightsticks`, `guess-the-group-from-their-lightstick-boy-groups`, `guess-the-groups-fan-name`, `k-pop-concert-facts-true-or-false`, `k-pop-concert-tours`
  - Fan culture (12): `k-pop-fan-moments-and-memes`, `k-pop-social-media-and-online-culture`, `k-pop-inside-jokes-and-running-gags`, `k-pop-merchandise-and-collecting`, `k-pop-mascots-and-cute-culture`, `k-pop-group-friendships`, `k-pop-photocard-culture-quiz`, `k-pop-weverse-and-social-media-quiz`, `k-pop-weverse-and-fan-platforms`, `k-pop-korean-language-basics-for-fans`, `k-pop-album-packaging-quiz`, `k-pop-lingo-and-fan-culture`
  - Also fits this topic: `k-pop-tiktok-viral-moments`
- Inbound links (existing pages, anchor = the primary phrase):
  - /general-kpop-quiz: new server-rendered section "General K-pop quizzes by topic" (10 rows, UxRow)
  - /quizzes: new server-rendered "Browse by topic" row above the list (one click from the home nav)
  - /articles/kpop-facts-every-fan-should-know: H2 "What are the K-pop fandom names?"
  - /articles/bts-vs-blackpink-quiz: closing paragraph on fandoms
  - /trivia: intro line next to the group trivia list
  - plus the 9 sibling theme pages ("More General K-pop topics") and, in phase 2, every quiz of the theme through its breadcrumb.

### 2.5 K-pop discography quiz

- URL: `/kpop-discography-quiz` (no allowlist entry; RESERVED_SLUGS entry)
- SEO title (60 with suffix): K-pop Discography Quiz: Songs, Albums and B-sides
- H1: K-pop discography quiz
- Meta description (156): Take a K-pop discography quiz: complete song titles, date releases, spot the B-side and name the album from its cover, across many groups. Free, no sign-up.
- Intro (53 words): This K-pop discography quiz page gathers {count} free quizzes about songs and albums from many groups: song titles, release years, B-sides, album covers, collaborations and songs that share a theme. There is no audio here: to name songs from a clip, play the K-pop blind test. The quizzes run from easy to hard.
- Quizzes today: 23 listed, held: finnish-the-lyric. Content date: 2026-10-27.
- Demand: "kpop discography quiz" 54 (position 8.3, 0 clicks), "aespa all songs test" 23, "cortis song quiz" 15, "twice songs quiz" 5 + "twice song quiz" 5, "aespa song quiz" 5. Quiz pages of this theme: 13 GSC impressions.
- Ordered quizzes:
  - Quizzes (23): `complete-the-k-pop-song-title`, `k-pop-weather-and-season-songs`, `k-pop-songs-of-2024-quiz`, `k-pop-songs-of-2023-quiz`, `k-pop-collaboration-with-western-artists`, `which-year-did-this-song-come-out`, `k-pop-b-sides-that-became-fan-favorites`, `k-pop-english-songs-quiz`, `k-pop-songs-with-colors-in-the-title`, `name-that-album-cover`, `k-pop-music-production`, `k-pop-surprise-collaborations`, `its-a-zoo-animals-in-k-pop`, `k-pop-international-collaborations`, `taste-the-rainbow-colors-in-k-pop`, `cooking-like-a-chef-food-drinks-in-k-pop`, `space-themed-k-pop`, `k-pop-sub-units-their-songs`, `find-the-intruder-song-with-a-different-title`, `guess-the-common-song-title-from-the-list-of-artists`, `guess-the-common-song-title-from-the-list-of-artists-2`, `name-that-boy-group-album`, `song-covers-in-k-pop`
  - Also fits this topic: `k-pop-and-k-drama-osts`, `k-pop-albums-that-sold-millions`, `k-pop-ost-drama-soundtracks-quiz`, `k-pop-album-packaging-quiz`
- Inbound links (existing pages, anchor = the primary phrase):
  - /general-kpop-quiz: new server-rendered section "General K-pop quizzes by topic" (10 rows, UxRow)
  - /quizzes: new server-rendered "Browse by topic" row above the list (one click from the home nav)
  - /guess-the-kpop-song: below the game: "No audio? Try the K-pop discography quiz"
  - /blindtest: below the modes: same line
  - /articles/bts-discography-guide: closing "test every era" paragraph, as the cross-group step
  - plus the 9 sibling theme pages ("More General K-pop topics") and, in phase 2, every quiz of the theme through its breadcrumb.

### 2.6 K-pop dance quiz

- URL: `/kpop-dance-quiz` (no allowlist entry; RESERVED_SLUGS entry)
- SEO title (58 with suffix): K-pop Dance Quiz: Choreography and Music Videos
- H1: K-pop dance quiz
- Meta description (159): Take a K-pop dance quiz: name iconic moves and viral dance challenges, then spot the music video that does not belong and match each concept. Free, no sign-up.
- Intro (51 words): This K-pop dance quiz page gathers {count} free quizzes about performance: choreography, iconic moves, viral dance challenges, music videos and comeback concepts. Every quiz mixes many groups, so you can play without a favorite. The quizzes run from easy to hard, so start at the top and work your way down.
- Quizzes today: 8 listed. Content date: 2026-10-06.
- Demand: No query yet. Named gap: no page for choreography or music video quizzes; /q/k-pop-choreography-and-dance alone drew 19 impressions. Quiz pages of this theme: 20 GSC impressions.
- Ordered quizzes:
  - Quizzes (8): `find-the-music-video-that-does-not-belong`, `k-pop-tiktok-viral-moments`, `k-pop-choreography-quiz`, `k-pop-iconic-dances-name-that-move`, `k-pop-music-video-themes-quiz`, `k-pop-choreography-and-dance`, `k-pop-viral-dance-challenges`, `k-pop-aesthetics-and-concepts`
  - Also fits this topic: `k-pop-iconic-outfits-and-fashion`, `k-pop-music-video-records`
- Inbound links (existing pages, anchor = the primary phrase):
  - /general-kpop-quiz: new server-rendered section "General K-pop quizzes by topic" (10 rows, UxRow)
  - /quizzes: new server-rendered "Browse by topic" row above the list (one click from the home nav)
  - /articles/kpop-eras-timeline: concepts and eras paragraph
  - /articles/kpop-facts-every-fan-should-know: H2 "Where can I test these K-pop facts?"
  - /kpop-true-or-false: related topics line under the list
  - plus the 9 sibling theme pages ("More General K-pop topics") and, in phase 2, every quiz of the theme through its breadcrumb.

### 2.7 K-pop awards quiz

- URL: `/kpop-awards-quiz` (no allowlist entry; RESERVED_SLUGS entry)
- SEO title (54 with suffix): K-pop Awards Quiz: Records, Charts and Wins
- H1: K-pop awards quiz
- Meta description (153): Take a K-pop awards quiz on music show wins, chart firsts, streaming and album sales records, and the milestones fans still talk about. Free, no sign-up.
- Intro (52 words): This K-pop awards quiz page gathers {count} free quizzes about wins and records: music show programs, award milestones, chart firsts, streaming numbers, music video views and albums that sold millions. They mix many groups, so any fan can play. Start with the easy ones at the top and end with the hardest.
- Quizzes today: 9 listed. Content date: 2026-10-10.
- Demand: No query yet. Named gap: records and music show quizzes have no topic page. Quiz pages of this theme: 3 GSC impressions.
- Ordered quizzes:
  - Quizzes (9): `k-pop-awards-and-records-true-or-false`, `k-pop-music-shows-true-or-false`, `k-pop-albums-that-sold-millions`, `k-pop-music-show-programs-quiz`, `k-pop-music-video-records`, `k-pop-streaming-records`, `k-pop-awards-and-milestones`, `k-pop-milestones-and-firsts-true-or-false`, `k-pop-records-true-or-false`
  - Also fits this topic: `psy-and-gangnam-style-era`, `k-pop-goes-west`, `k-pop-concert-tours`
- Inbound links (existing pages, anchor = the primary phrase):
  - /general-kpop-quiz: new server-rendered section "General K-pop quizzes by topic" (10 rows, UxRow)
  - /quizzes: new server-rendered "Browse by topic" row above the list (one click from the home nav)
  - /articles/kpop-facts-every-fan-should-know: H2 "What K-pop records and firsts should every fan know?"
  - /articles/kpop-quiz-statistics: related reading line
  - /kpop-true-or-false: related topics line under the list
  - plus the 9 sibling theme pages ("More General K-pop topics") and, in phase 2, every quiz of the theme through its breadcrumb.

### 2.8 K-pop drama and variety quiz

- URL: `/kpop-drama-variety-quiz` (no allowlist entry; RESERVED_SLUGS entry)
- SEO title (52 with suffix): K-pop Drama and Variety Quiz: Idols on TV
- H1: K-pop drama and variety quiz
- Meta description (147): Take a K-pop drama and variety quiz: idols who act, drama OSTs, variety show moments and survival shows like Produce 101. Free to play, no sign-up.
- Intro (52 words): This K-pop drama and variety quiz page gathers {count} free quizzes about idols on TV: idols who act in Korean dramas, drama soundtracks, variety show moments and the survival shows that formed new groups. Every quiz mixes many groups and shows. Start with the easy ones at the top and work down.
- Quizzes today: 11 listed. Content date: 2026-10-19.
- Demand: No query yet. Named gap: no page for idols in dramas, OSTs or survival shows. Quiz pages of this theme: 6 GSC impressions.
- Ordered quizzes:
  - Quizzes (11): `k-pop-idols-who-act`, `k-pop-and-k-drama-osts`, `k-pop-idols-in-dramas-true-or-false`, `k-pop-survival-shows-quiz`, `k-pop-produce-series-quiz`, `k-pop-ost-drama-soundtracks-quiz`, `k-pop-idols-in-korean-dramas`, `k-pop-variety-shows-and-games`, `k-pop-survival-shows`, `k-pop-variety-shows`, `k-pop-variety-show-moments`
  - Also fits this topic: `k-pop-music-show-programs-quiz`
- Inbound links (existing pages, anchor = the primary phrase):
  - /general-kpop-quiz: new server-rendered section "General K-pop quizzes by topic" (10 rows, UxRow)
  - /quizzes: new server-rendered "Browse by topic" row above the list (one click from the home nav)
  - /articles/rookie-kpop-groups-2026: groups formed on survival shows paragraph
  - /articles/kpop-facts-every-fan-should-know: H2 "Where can I test these K-pop facts?"
  - /trivia: intro line next to the group trivia list
  - plus the 9 sibling theme pages ("More General K-pop topics") and, in phase 2, every quiz of the theme through its breadcrumb.

### 2.9 K-pop idol quiz

- URL: `/kpop-idol-quiz` (no allowlist entry; RESERVED_SLUGS entry)
- SEO title (60 with suffix): K-pop Idol Quiz: Members, Positions and Nicknames
- H1: K-pop idol quiz
- Meta description (151): Take a K-pop idol quiz: match members to their groups, name leaders and maknae, and test nicknames, positions, birthplaces and style. Free, no sign-up.
- Intro (52 words): This K-pop idol quiz page gathers {count} free quizzes about the members themselves: which group an idol is in, leaders and maknae, positions, nicknames, nationalities, idol life, food and fashion. Every quiz mixes many groups. For clue by clue rounds, play guess the K-pop idol. The quizzes run from easy to hard.
- Quizzes today: 22 listed, held: can-you-recognize-these-idols-as-kids, k-pop-dating-and-relationships-verified-facts-only. Content date: 2026-10-16.
- Demand: "kpop picture trivia" 9, "quiz idol" 2, "kpop idol test" 1, "who is this idol" 2. "guess the kpop idol by picture" 44 belongs to /guess-the-kpop-idol and its guide. Quiz pages of this theme: 14 GSC impressions.
- Ordered quizzes:
  - Members and roles (13): `which-group-is-this-member-from-boy-groups`, `can-you-name-these-male-kpop-idols`, `k-pop-idol-nationalities`, `k-pop-positions-explained-quiz`, `k-pop-birthplace-quiz-where-are-they-from`, `k-pop-fun-facts-true-or-false-volume-2`, `k-pop-group-leaders-quiz`, `k-pop-maknae-youngest-member-quiz`, `which-group-is-this-member-from`, `k-pop-birthplace-true-or-false`, `k-pop-idol-nicknames`, `k-pop-member-nicknames-and-fun-facts`, `k-pop-surprising-and-weird-facts`
  - Idol life, food and style (9): `k-pop-idols-and-food`, `k-pop-idol-life-true-or-false`, `k-pop-iconic-outfits-and-fashion`, `k-pop-food-quiz-idols-and-their-favorites`, `k-pop-food-and-mukbang-culture`, `k-pop-military-service-deep-dive`, `k-pop-fashion-and-style-quiz`, `k-pop-fashion-true-or-false`, `k-pop-fashion-and-brand-ambassadors`
  - Also fits this topic: `which-company-does-this-idol-belong-to`, `k-pop-training-system-and-idol-life`, `name-the-group-from-its-members-girl-groups`, `name-the-group-from-its-members-boy-groups`
- Inbound links (existing pages, anchor = the primary phrase):
  - /general-kpop-quiz: new server-rendered section "General K-pop quizzes by topic" (10 rows, UxRow)
  - /quizzes: new server-rendered "Browse by topic" row above the list (one click from the home nav)
  - /articles/guess-the-kpop-idol-guide: H2 "Where can I try a guess-the-idol quiz?" (best page in GSC: 561 impressions, 50 clicks)
  - /guess-the-kpop-idol: line under the clue quizzes: "More idol questions: K-pop idol quiz"
  - /articles/hardest-kpop-groups-to-memorize: closing paragraph
  - plus the 9 sibling theme pages ("More General K-pop topics") and, in phase 2, every quiz of the theme through its breadcrumb.

### 2.10 K-pop groups quiz

- URL: `/kpop-groups-quiz` (no allowlist entry; RESERVED_SLUGS entry)
- SEO title (54 with suffix): K-pop Groups Quiz: Logos, Members and Names
- H1: K-pop groups quiz
- Meta description (149): Take a K-pop groups quiz: guess the group from its logo or members, count the members and learn what group names mean, across every generation. Free.
- Intro (55 words): This K-pop groups quiz page gathers {count} free quizzes about groups as a whole: guess a group from its logo, members or photo, count the members, learn what the names mean and compare boy groups and girl groups. To browse every group, open K-pop groups A to Z. The quizzes run from easy to hard.
- Quizzes today: 23 listed, held: best-kpop-group, do-you-like-the-same-kpop-groups-as-me. Content date: 2026-10-27.
- Demand: "name all kpop groups" 6, "kpop girl groups" 3, "how many kpop groups can you name" 2, "kpop girl groups list" 2, "kpop logo quiz" 1. "all kpop groups a to z" 6 belongs to /groups. Quiz pages of this theme: 42 GSC impressions.
- Ordered quizzes:
  - Guess the group (13): `k-pop-numbers-quiz-how-many-members`, `k-pop-girl-groups-true-or-false`, `which-k-pop-group-has-more-members`, `name-the-group-from-its-members-girl-groups`, `name-the-group-from-its-members-boy-groups`, `k-pop-group-name-meanings-true-or-false`, `k-pop-group-name-meanings`, `logo-quiz-how-many-groups-can-you-recognize`, `guess-the-odd-one-out-boy-groups`, `gen-5-k-pop-can-you-name-the-group`, `k-pop-boy-groups-true-or-false`, `guess-the-underrated-groups`, `idol-bands-quiz`
  - Quizzes about one group (10): `bts-true-or-false`, `blackpink-true-or-false-1781311005`, `nct-dream-quiz`, `kep1er-quiz`, `mamamoo-members-and-facts`, `iu-the-nations-little-sister`, `nct-system-explained-quiz`, `day6-quiz`, `mamamoo-true-or-false`, `treasure-basics`
  - Also fits this topic: `which-group-is-this-member-from-boy-groups`, `guess-the-group-from-their-lightstick-girl-groups`, `name-the-group-from-the-fandom-name`, `k-pop-sub-units-and-solo-debuts`
- Inbound links (existing pages, anchor = the primary phrase):
  - /general-kpop-quiz: new server-rendered section "General K-pop quizzes by topic" (10 rows, UxRow)
  - /quizzes: new server-rendered "Browse by topic" row above the list (one click from the home nav)
  - /groups: line under the A to Z list: "Test yourself: K-pop groups quiz"
  - /articles/girl-groups-vs-boy-groups-kpop-quiz: H2 "Test it for yourself"
  - /articles/hardest-kpop-groups-to-memorize: closing paragraph
  - /articles/kpop-facts-every-fan-should-know: H2 "How many members does each K-pop group have?"
  - plus the 9 sibling theme pages ("More General K-pop topics") and, in phase 2, every quiz of the theme through its breadcrumb.

## 3. The parent and the breadcrumbs

Parent: /general-kpop-quiz, the live hub of the category. The themes are flat URLs (short, keyword first) that hang under it in the breadcrumb, not nested paths: a nested `/general-kpop-quiz/{topic}` would need a new dynamic segment under `[slug]`, an allowlist entry, and longer URLs.

Changes on /general-kpop-quiz (same components, server HTML, no client JS):

- A section "General K-pop quizzes by topic" (H2, SectionHeader + 10 UxRow rows: theme name, "{count} quizzes", link) above the full list. The full list of 170 stays.
- An ItemList JSON-LD "General K-pop quiz topics" with the 10 theme URLs (the existing CollectionPage block stays as is).
- Meta description fixed for a category (148 characters with 170): "Play {n} free General K-pop quizzes in 10 topics: K-pop history, debuts, companies, fandoms, songs, dance, awards, TV, idols and groups. No sign-up." The title stays "General K-pop Quiz: {n} Free Fan-Made Tests".
- One FAQ entry added to `categoryTexts()`: "What topics do the General K-pop quizzes cover?" answered with the 10 linked theme names.

Breadcrumbs:

| Page | Visible trail (hub style) | BreadcrumbList items |
|---|---|---|
| /general-kpop-quiz (today, unchanged) | Quizzes / General K-pop | 1 Home https://kpopquiz.org/, 2 Quizzes https://kpopquiz.org/quizzes, 3 General K-pop Quiz |
| /kpop-history-quiz | Quizzes / General K-pop / K-pop history quiz | 1 Home https://kpopquiz.org/, 2 Quizzes https://kpopquiz.org/quizzes, 3 General K-pop Quiz https://kpopquiz.org/general-kpop-quiz, 4 K-pop history quiz (no item, current page) |
| /kpop-debut-quiz | Quizzes / General K-pop / K-pop debut quiz | 1 Home https://kpopquiz.org/, 2 Quizzes https://kpopquiz.org/quizzes, 3 General K-pop Quiz https://kpopquiz.org/general-kpop-quiz, 4 K-pop debut quiz (no item, current page) |
| /kpop-company-quiz | Quizzes / General K-pop / K-pop company quiz | 1 Home https://kpopquiz.org/, 2 Quizzes https://kpopquiz.org/quizzes, 3 General K-pop Quiz https://kpopquiz.org/general-kpop-quiz, 4 K-pop company quiz (no item, current page) |
| /kpop-fandom-quiz | Quizzes / General K-pop / K-pop fandom quiz | 1 Home https://kpopquiz.org/, 2 Quizzes https://kpopquiz.org/quizzes, 3 General K-pop Quiz https://kpopquiz.org/general-kpop-quiz, 4 K-pop fandom quiz (no item, current page) |
| /kpop-discography-quiz | Quizzes / General K-pop / K-pop discography quiz | 1 Home https://kpopquiz.org/, 2 Quizzes https://kpopquiz.org/quizzes, 3 General K-pop Quiz https://kpopquiz.org/general-kpop-quiz, 4 K-pop discography quiz (no item, current page) |
| /kpop-dance-quiz | Quizzes / General K-pop / K-pop dance quiz | 1 Home https://kpopquiz.org/, 2 Quizzes https://kpopquiz.org/quizzes, 3 General K-pop Quiz https://kpopquiz.org/general-kpop-quiz, 4 K-pop dance quiz (no item, current page) |
| /kpop-awards-quiz | Quizzes / General K-pop / K-pop awards quiz | 1 Home https://kpopquiz.org/, 2 Quizzes https://kpopquiz.org/quizzes, 3 General K-pop Quiz https://kpopquiz.org/general-kpop-quiz, 4 K-pop awards quiz (no item, current page) |
| /kpop-drama-variety-quiz | Quizzes / General K-pop / K-pop drama and variety quiz | 1 Home https://kpopquiz.org/, 2 Quizzes https://kpopquiz.org/quizzes, 3 General K-pop Quiz https://kpopquiz.org/general-kpop-quiz, 4 K-pop drama and variety quiz (no item, current page) |
| /kpop-idol-quiz | Quizzes / General K-pop / K-pop idol quiz | 1 Home https://kpopquiz.org/, 2 Quizzes https://kpopquiz.org/quizzes, 3 General K-pop Quiz https://kpopquiz.org/general-kpop-quiz, 4 K-pop idol quiz (no item, current page) |
| /kpop-groups-quiz | Quizzes / General K-pop / K-pop groups quiz | 1 Home https://kpopquiz.org/, 2 Quizzes https://kpopquiz.org/quizzes, 3 General K-pop Quiz https://kpopquiz.org/general-kpop-quiz, 4 K-pop groups quiz (no item, current page) |
| a quiz, phase 2 (example /q/k-pop-company-quiz-match-the-group-to-the-label) | Home / General K-pop Quiz / K-pop company quiz / title | 1 Home, 2 General K-pop Quiz /general-kpop-quiz, 3 K-pop company quiz /kpop-company-quiz, 4 the quiz title (no item) |

Other JSON-LD on a theme page, built from the same values as the visible text: CollectionPage (name = H1, description = the rendered intro, url, dateModified = the content date, isPartOf = /general-kpop-quiz, mainEntity = ItemList with numberOfItems = {count} and every listed quiz in order). FAQPage only with the visible FAQ (3 questions: how many, are they free, do I need a favorite group). No Quiz or Flashcard markup.

## 4. Links and click depth

Template: the v11 hub (components/group/ux-v1/hub.tsx), server parts only. UxPage "p3 p3-hub", the p3-crumb nav, the p3-hero without photo (eyebrow "General K-pop", H1, lead = intro, one UxButton "Play the first quiz" to the first slug, p3-facts: quizzes, questions, Updated month), then per section a SectionHeader (H2) and TextCardGrid of TextCard (a server component), then "Also fits this topic" as UxRow, then an About block (owner links, "/" as "K-pop quiz", /quizzes, the parent hub, the 9 siblings) and the FAQ as native `<details>`. Not reused: HubQuizzesLoader (client island), HubNotifyLoader, comments. Data: the existing cached `getHubQuizzes(30)` read through reads.ts (fail closed, 60 s revalidate on a failed read), filtered and ordered by a config file (for example lib/hubs/general-themes.ts holding the lists of themes.json). `export const revalidate = 3600`, like the hubs.

At least 3 indexed internal links to every listed quiz (pages that link it):

1. /general-kpop-quiz (all 170 today).
2. Its primary theme page.
3. Two sibling quiz pages: for a General K-pop quiz, "Keep playing" (2 slots today, server HTML) shows the next 2 quizzes of its primary theme in the theme order, wrapping at the end. Every listed quiz then receives exactly 2 such links. Same block, new source of rows, no design change.
4. For 26 quizzes, a second theme page ("Also fits this topic").

So every listed quiz has at least 4 inbound links from indexable pages. Without item 3, 137 listed quizzes would have only 2 stable links, so item 3 is required.

Click depth from the home (the nav links /quizzes on every page):

- Home > /quizzes (1) > theme (2, new "Browse by topic" row) > quiz (3).
- Home > /quizzes (1) > /general-kpop-quiz (2, a plain link next to the row) > any of the 170 quizzes (3).
- Home > /articles/kpop-generations-explained (1) > /kpop-history-quiz (2) > quiz (3). Home > /groups (1) > /kpop-groups-quiz (2) > quiz (3). Home > /trivia (1) > history, fandom or TV theme (2) > quiz (3).
- Optional, owner call: the same 10-link row on the home brings every quiz to 2 clicks. The home is not needed for the 3-click rule.

Ship with: sitemap entries (lastmod = the theme content date), the 10 TARGETS.md rows, the 10 URLs in the post-deploy IndexNow diff, and a check that fails when a published General K-pop quiz is in no theme and not held (4 new ones arrived in the last 7 days; until assigned they show only on the hub).

## 5. Risks

Thin pages
- debut (8), dance (8) and awards (9) are small and mostly 5 to 10 question quizzes. The page must carry more than links: the answer block, the facts line, sections, the FAQ and the sibling topics. If a theme falls under 5 listed quizzes it goes noindex (floor above).
- Ten pages built on one template could read as a doorway set if only the topic word changes. Each one has its own intro, its own sections, its own owner links and a different quiz set; keep it that way and never generate an intro from the topic name.

Duplicates with existing pages
- /general-kpop-quiz: same quizzes, but subsets in a different order with their own copy; self canonical on every theme. Do not copy the hub intro into the themes.
- /articles/kpop-generations-explained and /articles/kpop-eras-timeline: the history theme avoids "generations" and "eras timeline" in title, H1 and meta, and links both.
- /kpop-true-or-false, /easy-kpop-quizzes, /hard-kpop-quizzes: not themes; linked from the themes.
- /guess-the-kpop-idol and its guide: the idol theme says "K-pop idol quiz", never "guess the K-pop idol" in its title or H1.
- /guess-the-kpop-song and /blindtest: the songs theme uses "discography" (the GSC query "kpop discography quiz", 54 impressions) instead of "song quiz".
- /groups and the planned /name-them-all: the groups theme says "groups quiz" and links both.
- Fandom versus groups, idol versus groups: lightstick and member quizzes guess a group. Settled by one primary theme each; the other theme lists them only under "Also fits this topic".

Quizzes that fit no theme, or should not be featured
- None is left without a theme. 7 are held by the owner rules and listed nowhere but the hub until reviewed (fix or unpublish is the owner's call):
  - `finnish-the-lyric` (theme if cleared: discography): a lyrics quiz (rule 0 and 6.4: no lyrics).
  - `k-pop-dating-and-relationships-verified-facts-only` (theme if cleared: idol): dating and relationships of named idols (rule 0).
  - `k-pop-sasaeng-and-fan-culture-dark-side` (theme if cleared: fandom): sasaeng and fan wars (rule 0: nothing sasaeng-adjacent).
  - `can-you-recognize-these-idols-as-kids` (theme if cleared: idol): childhood photos of real people, licence unknown (rule 0 minors, 6.5 images).
  - `kpop-geral` (theme if cleared: history): Portuguese on an English page, one question on an idol leaving the industry (rules 0 and 10).
  - `best-kpop-group` (theme if cleared: groups): opinions graded as true or false, 4 questions (rule 4.4: no fandom rankings).
  - `do-you-like-the-same-kpop-groups-as-me` (theme if cleared: groups): a taste poll with a graded answer, no facts.
- 15 quizzes are about one group or artist but filed under General K-pop. Where the hub already has quizzes, moving them is cleaner (owner DB write, not done): `bigbang-vips-only-quiz` to bigbang, `blackpink-true-or-false-1781311005` to blackpink, `bts-true-or-false` to bts, `girls-generation-the-legend-quiz` to girls-generation, `mamamoo-members-and-facts` to mamamoo, `mamamoo-true-or-false` to mamamoo, `nct-system-explained-quiz` to nct, `treasure-basics` to treasure. The others have an empty hub or none (2NE1, DAY6, f(x), IU, Kep1er, NCT DREAM, Super Junior with no group row): keep them in the category until their hub has quizzes. On the theme page a single-group card also links "{Group} quiz" when that hub is indexable. After the moves, groups drops from 23 to 17 and history from 19 to 17.
- Review candidates kept in the lists: `cooking-like-a-chef-food-drinks-in-k-pop` and `space-themed-k-pop` (one lyric line each), `k-pop-idol-life-true-or-false` (a dating-ban item and a member exit question). Image quizzes (logos, lightsticks, album covers, idol photos: 9 listed) carry UGC images whose licence is unknown (rulebook 6.5); none is the first card of a theme, keep it that way.

Other
- Counts: the hub says 170, the theme rows show listed counts (sum 163 plus 26 second listings). Never print a sum of the topic counts.
- The owner took the category off the home rail on 2026-10-06. Linking it from /quizzes (and optionally the home) reverses part of that; confirm before building.
- Search demand is thin and partly inferred: only the fandom, discography, idol and groups themes have direct GSC queries; history, debut, company, dance, awards and TV rest on named gaps and play data. Measure each URL 90 days after launch and fold a theme into the hub (301) if it earns nothing.

Files: themes.json next to this plan holds every value above (title, H1, description, intro, ordered slugs per section, second listings, inbound links, breadcrumb items, held list).
