# SEO diff: flag on (:3021) vs flag off (C3 build of the same head) vs live (kpopquiz.org)

Run 2026-09-26T16:55:04.840Z. Script: `checks/qa/seo-diff.mjs`; raw data: `seo-diff.json`. Server HTML only (no JS). "Visible" links = `<a href>` outside `<noscript>`, `<template>` and scripts.

| URL | Status on / off / live | Field diffs on vs off | On: robots | On: H1 | On: JSON-LD | Links on / off / live | Lost vs off | Lost vs live | Added vs off |
|---|---|---|---|---|---|---|---|---|---|
| / | 200 / 200 / 200 | lostProse | - | K-pop Quiz Are you a real fan? | Organization, SiteNavigationElement, WebSite, ItemList | 79 / 70 / 64 | 2 | 2 | 11 |
| /pt | 200 / 200 / 200 | none | index, follow | Quiz de K-pop feito por fas | Organization, SiteNavigationElement | 56 / 49 / 48 | 0 | 0 | 7 |
| /quizzes | 200 / 200 / 200 | none | - | K-pop quizzes | Organization, SiteNavigationElement, BreadcrumbList, ItemList, FAQPage | 89 / 79 / 78 | 0 | 0 | 10 |
| /quizzes?page=2 | 200 / 200 / 200 | none | - | K-pop quizzes | Organization, SiteNavigationElement, BreadcrumbList, ItemList | 89 / 76 / 75 | 0 | 0 | 13 |
| /quizzes?group=bts | 200 / 200 / 200 | none | - | K-pop quizzes | Organization, SiteNavigationElement, BreadcrumbList, ItemList | 68 / 55 / 54 | 0 | 0 | 13 |
| /q/ultimate-bts-era-quiz-only-real-armys-survive | 200 / 200 / 200 | none | - | Ultimate BTS era quiz - only real ARMYs survive | Organization, SiteNavigationElement, BreadcrumbList, Quiz | 47 / 33 / 32 | 0 | 0 | 14 |
| /q/skz-true-or-false-only-real-stays-pass | 200 / 200 / 200 | none | - | SKZ true or false - only real STAYs pass | Organization, SiteNavigationElement, BreadcrumbList, Quiz | 47 / 33 / 32 | 0 | 0 | 14 |
| /q/real-coers-cortis-fans-can-take-this-quiz | 200 / 200 / 200 | none | - | real COERS (cortis fans) can take this quiz! | Organization, SiteNavigationElement, BreadcrumbList, Quiz | 47 / 32 / 31 | 0 | 0 | 15 |
| /blackpink-quiz | 200 / 200 / 200 | none | - | BLACKPINK Quiz - Test How Well You Know BLACKPINK | Organization, SiteNavigationElement, BreadcrumbList, FAQPage, CollectionPage, ItemList | 63 / 53 / 52 | 4 | 4 | 14 |
| /ateez-quiz | 200 / 200 / 200 | none | - | ATEEZ Quiz - Test How Well You Know ATEEZ | Organization, SiteNavigationElement, BreadcrumbList, FAQPage, CollectionPage, ItemList | 61 / 50 / 49 | 4 | 4 | 15 |
| /chungha-quiz | 200 / 200 / 200 | none | - | Chungha Quiz - Test How Well You Know Chungha | Organization, SiteNavigationElement, BreadcrumbList, CollectionPage, ItemList | 39 / 24 / 23 | 0 | 0 | 15 |
| /bts-trivia | 200 / 200 / 200 | none | - | BTS trivia and fun facts | Organization, SiteNavigationElement, BreadcrumbList, Article | 52 / 38 / 37 | 0 | 0 | 14 |
| /groups | 200 / 200 / 200 | none | - | All K-pop groups | Organization, SiteNavigationElement, BreadcrumbList | 119 / 66 / 65 | 0 | 0 | 53 |
| /blindtest | 200 / 200 / 200 | none | - | Name that K-pop song | Organization, SiteNavigationElement, BreadcrumbList, FAQPage, WebApplication | 137 / 121 / 120 | 0 | 0 | 16 |
| /blindtest/classic | 200 / 200 / 200 | none | - | Classic | Organization, SiteNavigationElement | 37 / 22 / 21 | 0 | 0 | 15 |
| /blindtest/girl-groups | 200 / 200 / 200 | none | - | Girl groups | Organization, SiteNavigationElement | 37 / 22 / 21 | 0 | 0 | 15 |
| /pt/blindtest | 200 / 200 / 200 | none | index, follow | Adivinhe a musica de K-pop | Organization, SiteNavigationElement, BreadcrumbList, FAQPage | 40 / 25 / 24 | 0 | 0 | 15 |
| /blindtest/ranked | 200 / 404 / 404 | none | noindex, follow | Ranked | Organization, SiteNavigationElement | 37 / - / - | 0 | 0 | 0 |
| /leaderboard | 200 / 200 / 200 | none | - | Community | Organization, SiteNavigationElement | 98 / 78 / 77 | 0 | 0 | 20 |
| /pt/leaderboard | 200 / 200 / 200 | none | index, follow | Top fas esta semana | Organization, SiteNavigationElement | 40 / 25 / 24 | 0 | 0 | 15 |
| /u/testtest | 200 / 200 / 200 | none | noindex, follow | testtest | Organization, SiteNavigationElement, BreadcrumbList | 38 / 22 / 21 | 0 | 0 | 16 |
| /create | 200 / 200 / 200 | lostProse | noindex, follow | What's your quiz about? | Organization, SiteNavigationElement | 37 / 22 / 21 | 0 | 0 | 15 |
| /search | 200 / 200 / 200 | none | noindex, follow | Search | Organization, SiteNavigationElement | 37 / 22 / 21 | 0 | 0 | 15 |
| /articles | 200 / 200 / 200 | none | - | Articles | Organization, SiteNavigationElement, CollectionPage, BreadcrumbList | 59 / 44 / 43 | 0 | 0 | 15 |
| /articles/best-kpop-quiz-sites-2026 | 200 / 200 / 200 | none | - | Best Free K-pop Quiz Sites in 2026: 5 Ranked and Reviewed | Organization, SiteNavigationElement, Article, BreadcrumbList, FAQPage | 37 / 22 / 21 | 0 | 0 | 15 |
| /trending | 200 / 200 / 200 | none | - | Trending quizzes | Organization, SiteNavigationElement | 47 / 32 / 31 | 0 | 0 | 15 |
| /new | 200 / 200 / 200 | none | - | New quizzes | Organization, SiteNavigationElement | 47 / 32 / 31 | 0 | 0 | 15 |
| /most-liked | 200 / 200 / 200 | none | - | Most liked quizzes | Organization, SiteNavigationElement | 47 / 32 / 31 | 0 | 0 | 15 |
| /stats | 200 / 200 / 200 | jsonld, lostProse | - | K-pop Quiz Statistics | Organization, SiteNavigationElement, Dataset, WebPage, BreadcrumbList | 55 / 48 / 47 | 0 | 0 | 7 |
| /data/pulse | 200 / 200 / 200 | none | - | The K-pop Pulse | Organization, SiteNavigationElement, CollectionPage, BreadcrumbList | 39 / 24 / 23 | 0 | 0 | 15 |
| /community | 200 / 301 (301) / 301 (301) | none | noindex, follow | Community | Organization, SiteNavigationElement | 57 / - / - | 0 | 0 | 0 |
| /community/thread/1 | 200 / 301 (301) / 301 (301) | none | noindex, follow | Which B-side do you think deserved its own music video? We w | Organization, SiteNavigationElement | 40 / - / - | 0 | 0 | 0 |
| /community/blog/2 | 200 / 301 (301) / 301 (301) | none | noindex, follow | Why ARMY documents everything: the archive instinct of a fan | Organization, SiteNavigationElement | 40 / - / - | 0 | 0 | 0 |
| /community/debate/2026-09-22 | 200 / 301 (301) / 301 (301) | none | noindex, follow | Choreo with props or pure dance | Organization, SiteNavigationElement | 41 / - / - | 0 | 0 | 0 |

## Lost links and text (details)

### /

- lost vs flag off: /quizzes/most-liked, /quizzes/new
- lost vs live: /quizzes/most-liked, /quizzes/new
- lostProse: ["Each fandom's home: members, discography, timeline and community, built on open data and run by fans."]

### /blackpink-quiz

- lost vs flag off: /q/blackpink-members-quiz, /q/blackpink-solo-careers-deep-dive, /q/blackpink-the-album-quiz, /q/blackpink-world-records-and-achievements
- lost vs live: /q/blackpink-members-quiz, /q/blackpink-solo-careers-deep-dive, /q/blackpink-the-album-quiz, /q/blackpink-world-records-and-achievements

### /ateez-quiz

- lost vs flag off: /q/ateez-guess-the-music-video-from-the-screenshot, /q/ateez-lyrics-quiz, /q/ateez-music-videos-quiz, /q/ateez-pre-debut-quiz
- lost vs live: /q/ateez-guess-the-music-video-from-the-screenshot, /q/ateez-lyrics-quiz, /q/ateez-music-videos-quiz, /q/ateez-pre-debut-quiz

### /create

- lostProse: ["A cover makes your quiz yours, it is the first thing fans see. Shows on your quiz card and becomes your share card background."]

### /stats

- jsonld: {"only_off":["{\"@context\":\"https://schema.org\",\"@type\":\"Dataset\",\"creator\":{\"@type\":\"Organization\",\"name\":\"KpopQuiz\",\"url\":\"https://kpopquiz.org\"},\"dateModified\":\"<n>\",\"description\":\"Live statistics from kpopquiz.org: 425 quizzes, 4120 blind test songs, 67.9K total plays across 91 K-pop groups and 5 generations.\",\"name\":\"KpopQuiz Platform Statistics\",\"temporalCoverage\":\"2024/2026\",\"url\":\"https://kpopquiz.org/stats\",\"variableMeasured\":[{\"@type\":\"PropertyValue\",\"name\":\"Total Quizzes\",\"value\":425},{\"@type\":\"PropertyValue\",\"name\":\"Total 
- lostProse: ["According to kpopquiz.org, Girls' Generation is the most-played K-pop fandom of the week, with 382 quiz plays as of September 26, 2026."]

## Links added with the flag on (vs flag off), first 60 per URL

- / (+11): /ateez-quiz, /blindtest/ranked, /community, /daily, /girls-generation-quiz, /most-liked, /new, /profile, /trending, /verse/bts/community/with-all-seven-back-and-the-group-chapter-open-aga-3, /verse/bts/essays/2
- /pt (+7): /ateez-quiz, /blindtest/ranked, /community, /daily, /new, /profile, /trending
- /quizzes (+10): /aespa-quiz, /ateez-quiz, /blindtest/ranked, /community, /daily, /groups, /newjeans-quiz, /profile, /seventeen-quiz, /twice-quiz
- /quizzes?page=2 (+13): /aespa-quiz, /ateez-quiz, /blackpink-quiz, /blindtest/ranked, /bts-quiz, /community, /daily, /groups, /newjeans-quiz, /profile, /seventeen-quiz, /stray-kids-quiz, /twice-quiz
- /quizzes?group=bts (+13): /aespa-quiz, /ateez-quiz, /blackpink-quiz, /blindtest/ranked, /bts-quiz, /community, /daily, /groups, /newjeans-quiz, /profile, /seventeen-quiz, /stray-kids-quiz, /twice-quiz
- /q/ultimate-bts-era-quiz-only-real-armys-survive (+14): /aespa-quiz, /ateez-quiz, /blackpink-quiz, /blindtest/ranked, /community, /daily, /groups, /new, /newjeans-quiz, /profile, /seventeen-quiz, /stray-kids-quiz, /trending, /twice-quiz
- /q/skz-true-or-false-only-real-stays-pass (+14): /aespa-quiz, /ateez-quiz, /blackpink-quiz, /blindtest/ranked, /bts-quiz, /community, /daily, /groups, /new, /newjeans-quiz, /profile, /seventeen-quiz, /trending, /twice-quiz
- /q/real-coers-cortis-fans-can-take-this-quiz (+15): /aespa-quiz, /ateez-quiz, /blackpink-quiz, /blindtest/ranked, /bts-quiz, /community, /daily, /groups, /new, /newjeans-quiz, /profile, /seventeen-quiz, /stray-kids-quiz, /trending, /twice-quiz
- /blackpink-quiz (+14): /ateez-quiz, /blackpink-quiz, /blackpink-quiz?page=2, /blindtest/ranked, /bts-quiz, /community, /daily, /groups, /new, /newjeans-quiz, /profile, /seventeen-quiz, /stray-kids-quiz, /trending
- /ateez-quiz (+15): /aespa-quiz, /ateez-quiz, /ateez-quiz?page=2, /blackpink-quiz, /blindtest/ranked, /bts-quiz, /community, /daily, /groups, /new, /newjeans-quiz, /profile, /seventeen-quiz, /trending, /twice-quiz
- /chungha-quiz (+15): /aespa-quiz, /ateez-quiz, /blackpink-quiz, /blindtest/ranked, /bts-quiz, /community, /daily, /groups, /new, /newjeans-quiz, /profile, /seventeen-quiz, /stray-kids-quiz, /trending, /twice-quiz
- /bts-trivia (+14): /aespa-quiz, /ateez-quiz, /blackpink-quiz, /blindtest/ranked, /community, /daily, /groups, /new, /newjeans-quiz, /profile, /seventeen-quiz, /stray-kids-quiz, /trending, /twice-quiz
- /groups (+53): /2ne1-quiz, /2pm-quiz, /apink-quiz, /bibi-quiz, /billlie-quiz, /blindtest/ranked, /boynextdoor-quiz, /btob-quiz, /chungha-quiz, /community, /daily, /day6-quiz, /fromis-9-quiz, /fx-quiz, /groups, /heize-quiz, /hwasa-quiz, /hyuna-quiz, /ikon-quiz, /iu-quiz, /jay-park-quiz, /jennie-quiz, /jeon-somi-quiz, /jimin-quiz, /jungkook-quiz, /kara-quiz, /kep1er-quiz, /kiss-of-life-quiz, /miss-a-quiz, /nct-dream-quiz, /new, /p1harmony-quiz, /pentagon-quiz, /profile, /psy-quiz, /purple-kiss-quiz, /riize-quiz, /rose-quiz, /sistar-quiz, /stayc-quiz, /sunmi-quiz, /t-ara-quiz, /taeyang-quiz, /taeyeon-quiz, /the-boyz-quiz, /trending, /triples-quiz, /v-bts-quiz, /viviz-quiz, /winner-quiz, /wonder-girls-quiz, /zerobaseone-quiz, /zico-quiz
- /blindtest (+16): /aespa-quiz, /ateez-quiz, /blackpink-quiz, /blindtest#bt-start, /blindtest/ranked, /blindtest?daily=true, /bts-quiz, /community, /daily, /new, /newjeans-quiz, /profile, /seventeen-quiz, /stray-kids-quiz, /trending, /twice-quiz
- /blindtest/classic (+15): /aespa-quiz, /ateez-quiz, /blackpink-quiz, /blindtest/ranked, /bts-quiz, /community, /daily, /groups, /new, /newjeans-quiz, /profile, /seventeen-quiz, /stray-kids-quiz, /trending, /twice-quiz
- /blindtest/girl-groups (+15): /aespa-quiz, /ateez-quiz, /blackpink-quiz, /blindtest/ranked, /bts-quiz, /community, /daily, /groups, /new, /newjeans-quiz, /profile, /seventeen-quiz, /stray-kids-quiz, /trending, /twice-quiz
- /pt/blindtest (+15): /aespa-quiz, /ateez-quiz, /blackpink-quiz, /blindtest/ranked, /bts-quiz, /community, /daily, /groups, /new, /newjeans-quiz, /profile, /seventeen-quiz, /stray-kids-quiz, /trending, /twice-quiz
- /leaderboard (+20): /blindtest/ranked, /community, /daily, /groups, /new, /profile, /trending, /u/carat, /u/ersopa, /u/joonified, /u/kpophistory, /u/kpopquizz, /u/lea_mnm, /u/mapple, /u/mina, /u/njeansstan, /u/pinkvelvet, /u/roseeeyh, /u/skzrealm, /u/twiceland
- /pt/leaderboard (+15): /aespa-quiz, /ateez-quiz, /blackpink-quiz, /blindtest/ranked, /bts-quiz, /community, /daily, /groups, /new, /newjeans-quiz, /profile, /seventeen-quiz, /stray-kids-quiz, /trending, /twice-quiz
- /u/testtest (+16): /aespa-quiz, /ateez-quiz, /blackpink-quiz, /blindtest/ranked, /bts-quiz, /community, /daily, /groups, /illit-quiz, /new, /newjeans-quiz, /profile, /seventeen-quiz, /stray-kids-quiz, /trending, /twice-quiz
- /create (+15): /aespa-quiz, /ateez-quiz, /blackpink-quiz, /blindtest/ranked, /bts-quiz, /community, /daily, /groups, /new, /newjeans-quiz, /profile, /seventeen-quiz, /stray-kids-quiz, /trending, /twice-quiz
- /search (+15): /aespa-quiz, /ateez-quiz, /blackpink-quiz, /blindtest/ranked, /bts-quiz, /community, /daily, /groups, /new, /newjeans-quiz, /profile, /seventeen-quiz, /stray-kids-quiz, /trending, /twice-quiz
- /articles (+15): /aespa-quiz, /ateez-quiz, /blackpink-quiz, /blindtest/ranked, /bts-quiz, /community, /daily, /groups, /new, /newjeans-quiz, /profile, /seventeen-quiz, /stray-kids-quiz, /trending, /twice-quiz
- /articles/best-kpop-quiz-sites-2026 (+15): /aespa-quiz, /ateez-quiz, /blackpink-quiz, /blindtest/ranked, /bts-quiz, /community, /daily, /groups, /new, /newjeans-quiz, /profile, /seventeen-quiz, /stray-kids-quiz, /trending, /twice-quiz
- /trending (+15): /aespa-quiz, /ateez-quiz, /blackpink-quiz, /blindtest/ranked, /bts-quiz, /community, /daily, /groups, /new, /newjeans-quiz, /profile, /seventeen-quiz, /stray-kids-quiz, /trending, /twice-quiz
- /new (+15): /aespa-quiz, /ateez-quiz, /blackpink-quiz, /blindtest/ranked, /bts-quiz, /community, /daily, /groups, /new, /newjeans-quiz, /profile, /seventeen-quiz, /stray-kids-quiz, /trending, /twice-quiz
- /most-liked (+15): /aespa-quiz, /ateez-quiz, /blackpink-quiz, /blindtest/ranked, /bts-quiz, /community, /daily, /groups, /new, /newjeans-quiz, /profile, /seventeen-quiz, /stray-kids-quiz, /trending, /twice-quiz
- /stats (+7): /ateez-quiz, /blindtest/ranked, /community, /daily, /new, /profile, /trending
- /data/pulse (+15): /aespa-quiz, /ateez-quiz, /blackpink-quiz, /blindtest/ranked, /bts-quiz, /community, /daily, /groups, /new, /newjeans-quiz, /profile, /seventeen-quiz, /stray-kids-quiz, /trending, /twice-quiz

## robots.txt and sitemap

- robots.txt identical flag on vs off: true
- sitemap URLs: on 2998, off 2998; only on: 0; only off: 0
- new pages (/community, /blindtest/ranked, /ux-v1) in the flag-on sitemap: 0
