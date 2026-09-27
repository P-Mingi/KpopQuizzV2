# SEO diff: flag on (:3021) vs flag off (C3 build of the same head) vs live (kpopquiz.org)

Run 2026-09-26T21:15:24.608Z. Script: `checks/qa/seo-diff.mjs`; raw data: `seo-diff.json`. Server HTML only (no JS). "Visible" links = `<a href>` outside `<noscript>`, `<template>` and scripts.

| URL | Status on / off / live | Field diffs on vs off | On: robots | On: H1 | On: JSON-LD | Links on / off / live | Lost vs off | Lost vs live | Added vs off |
|---|---|---|---|---|---|---|---|---|---|
| / | 200 / 200 / 200 | none | - | K-pop Quiz Are you a real fan? | Organization, SiteNavigationElement, WebSite, ItemList | 76 / 70 / 64 | 5 | 2 | 11 |
| /pt | 200 / 200 / 200 | none | index, follow | Quiz de K-pop feito por fas | Organization, SiteNavigationElement | 56 / 49 / 48 | 0 | 0 | 7 |
| /groups | 200 / 200 / 200 | none | - | All K-pop groups | Organization, SiteNavigationElement, BreadcrumbList | 119 / 66 / 65 | 0 | 0 | 53 |
| /blackpink-quiz | 200 / 200 / 200 | jsonld, lostProse | - | BLACKPINK Quiz - Test How Well You Know BLACKPINK | Organization, SiteNavigationElement, BreadcrumbList, FAQPage, CollectionPage, ItemList | 74 / 53 / 52 | 1 | 1 | 22 |
| /ateez-quiz | 200 / 200 / 200 | none | - | ATEEZ Quiz - Test How Well You Know ATEEZ | Organization, SiteNavigationElement, BreadcrumbList, FAQPage, CollectionPage, ItemList | 71 / 50 / 49 | 1 | 1 | 22 |
| /chungha-quiz | 200 / 200 / 200 | none | - | Chungha Quiz - Test How Well You Know Chungha | Organization, SiteNavigationElement, BreadcrumbList, CollectionPage, ItemList | 39 / 24 / 23 | 0 | 0 | 15 |
| /create | 200 / 200 / 200 | none | noindex, follow | What's your quiz about? | Organization, SiteNavigationElement | 37 / 22 / 21 | 0 | 0 | 15 |
| /blindtest | 200 / 200 / 200 | none | - | Name that K-pop song | Organization, SiteNavigationElement, BreadcrumbList, FAQPage, WebApplication | 137 / 121 / 120 | 0 | 0 | 16 |

## Lost links and text (details)

### /

- lost vs flag off: /quizzes/most-liked, /quizzes/new, /verse/blackpink, /verse/seventeen, /verse/stray-kids
- lost vs live: /quizzes/most-liked, /quizzes/new

### /blackpink-quiz

- lost vs flag off: /verse/blackpink
- lost vs live: /verse/blackpink
- jsonld: {"only_off":["{\"@context\":\"https://schema.org\",\"@type\":\"CollectionPage\",\"dateModified\":\"<n>\",\"description\":\"BLACKPINK quizzes, made by fans who actually know BLACKPINK: play 29+ free tests, from easy trivia to impossible deep cuts, and prove you're a real BLINK. 4,906 plays and counting.\",\"mainEntity\":{\"@type\":\"ItemList\",\"itemListElement\":[{\"@type\":\"ListItem\",\"name\":\"BLACKPINK ultimate fan challenge\",\"position\":\"<n>\",\"url\":\"https://kpopquiz.org/q/blackpink-ultimate-fan-challenge\"},{\"@type\":\"ListItem\",\"name\":\"BLACKPINK true or false - think you kno
- lostProse: ["BLACKPINK quizzes, made by fans who actually know BLACKPINK: play 29+ free tests, from easy trivia to impossible deep cuts, and prove you're a real BLINK. 4,906 plays and counting."]

### /ateez-quiz

- lost vs flag off: /verse/ateez
- lost vs live: /verse/ateez

## Links added with the flag on (vs flag off), first 60 per URL

- / (+11): /ateez-quiz, /blindtest/ranked, /community, /daily, /girls-generation-quiz, /most-liked, /new, /profile, /trending, /verse/bts/community/with-all-seven-back-and-the-group-chapter-open-aga-3, /verse/bts/essays/2
- /pt (+7): /ateez-quiz, /blindtest/ranked, /community, /daily, /new, /profile, /trending
- /groups (+53): /2ne1-quiz, /2pm-quiz, /apink-quiz, /bibi-quiz, /billlie-quiz, /blindtest/ranked, /boynextdoor-quiz, /btob-quiz, /chungha-quiz, /community, /daily, /day6-quiz, /fromis-9-quiz, /fx-quiz, /groups, /heize-quiz, /hwasa-quiz, /hyuna-quiz, /ikon-quiz, /iu-quiz, /jay-park-quiz, /jennie-quiz, /jeon-somi-quiz, /jimin-quiz, /jungkook-quiz, /kara-quiz, /kep1er-quiz, /kiss-of-life-quiz, /miss-a-quiz, /nct-dream-quiz, /new, /p1harmony-quiz, /pentagon-quiz, /profile, /psy-quiz, /purple-kiss-quiz, /riize-quiz, /rose-quiz, /sistar-quiz, /stayc-quiz, /sunmi-quiz, /t-ara-quiz, /taeyang-quiz, /taeyeon-quiz, /the-boyz-quiz, /trending, /triples-quiz, /v-bts-quiz, /viviz-quiz, /winner-quiz, /wonder-girls-quiz, /zerobaseone-quiz, /zico-quiz
- /blackpink-quiz (+22): /ateez-quiz, /blackpink-quiz, /blindtest/ranked, /bts-quiz, /community, /daily, /groups, /new, /newjeans-quiz, /profile, /q/are-you-a-true-blink-blackpink-trivia, /q/blackpink-how-you-like-that-quiz, /q/blackpink-kill-this-love-era, /q/blackpink-members-facts-do-you-really-know, /q/blackpink-solo-careers-quiz, /q/blackpink-title-tracks-challenge, /q/blackpink-world-tour-and-performances, /q/find-the-non-blackpink-member, /q/quiz-for-baby-blinks-to-learn-about-blackpink, /seventeen-quiz, /stray-kids-quiz, /trending
- /ateez-quiz (+22): /aespa-quiz, /ateez-quiz, /blackpink-quiz, /blindtest/ranked, /bts-quiz, /community, /daily, /groups, /new, /newjeans-quiz, /profile, /q/ateez-fireworks-quiz, /q/ateez-lyrics-quiz-part-2, /q/ateez-lyrics-quiz-part-3, /q/ateez-lyrics-quiz-part-4, /q/ateez-lyrics-quiz-part-5, /q/ateez-on-stage, /q/ateez-the-fever-era, /q/ateez-wanteez-quiz, /seventeen-quiz, /trending, /twice-quiz
- /chungha-quiz (+15): /aespa-quiz, /ateez-quiz, /blackpink-quiz, /blindtest/ranked, /bts-quiz, /community, /daily, /groups, /new, /newjeans-quiz, /profile, /seventeen-quiz, /stray-kids-quiz, /trending, /twice-quiz
- /create (+15): /aespa-quiz, /ateez-quiz, /blackpink-quiz, /blindtest/ranked, /bts-quiz, /community, /daily, /groups, /new, /newjeans-quiz, /profile, /seventeen-quiz, /stray-kids-quiz, /trending, /twice-quiz
- /blindtest (+16): /aespa-quiz, /ateez-quiz, /blackpink-quiz, /blindtest#bt-start, /blindtest/ranked, /blindtest?daily=true, /bts-quiz, /community, /daily, /new, /newjeans-quiz, /profile, /seventeen-quiz, /stray-kids-quiz, /trending, /twice-quiz

## robots.txt and sitemap

- robots.txt identical flag on vs off: true
- sitemap URLs: on 2998, off 2998; only on: 0; only off: 0
- new pages (/community, /blindtest/ranked, /ux-v1) in the flag-on sitemap: 0
