# Live check, October 2026 (SEO Mission 1, part A)

Production checks after merging #95 (community vote from the feed, `0c2bdc9`) and #96 (SEO
indexation, `0d0744b`) on 14 October 2026. Production deployment `dpl_29rqQQF4vp2YTBjAAGgHT41zowJz`,
Ready on commit `0d0744b`, aliased to kpopquiz.org. Main CI after #95 was green (Tests, SEO gates,
IndexNow submit).

Method: a browser user agent, redirects not followed, words counted in `<main>` (scripts,
styles and hidden streamed blocks removed). "Before" was measured on the deployment of `e308455`
(#94 and #97, before #95 and #96), the same day.

| Check | Before | After |
|---|---|---|
| /blindtest/group-bts: title | "Bts Blind Test - K-pop Blind Test" | "BTS Blind Test: Guess the Song" |
| /blindtest/group-bts: description | 61 characters | 140 characters |
| /blindtest/group-bts: words in main | 22 | 213 |
| /blindtest/group-bts: og:image | site default | group card |
| /stray-kids-name-all-members: words | 58 | 294 (all 8 members and their accepted spellings in the server HTML) |
| /which-stray-kids-member-are-you: words | 73 | 451 |
| /which-aespa-member-are-you: words | 67 | 310 |
| /q/illit-quiz: words in main | 0 (content streamed after a spinner) | 666 |
| /q/stray-kids-know-each-member: words in main | 0 | 449 |
| /q/zzz-not-a-real-quiz-xyz (made-up slug) | 200 with noindex (soft 404) | 404 |
| /games/name-all/name-all-aespa | 308 to /quizzes | 308 to /quizzes (fixed in the Bing PR: 301 to /aespa-name-all-members) |
| /games/name-all/name-top-10-bts-songs | 308 to /quizzes | 308 to /quizzes (fixed in the Bing PR: 410) |
| /battle?quiz=illit-quiz | 308 to /quizzes?quiz=illit-quiz | unchanged (fixed in the Bing PR: 301 to /q/illit-quiz) |
| /robots.txt: /api/og/ allowed | yes | yes |
| /robots.txt: stylesheet /api/ux-v1/a0/styles allowed | no | yes |
| /robots.txt: explicit OAI-SearchBot group | no | no (added in the Bing PR) |
| /sitemap.xml | 200, 736 URLs, lastmod on 89 distinct days | 200, 734 URLs, lastmod on 175 distinct days (creation dates, not play dates) |
| The 6 republished quizzes in the sitemap | 6 of 6 | 6 of 6 |
| only-real-monstiez in the sitemap | absent | absent |
| /bts-quiz quiz count | 31 in the FAQ, 27 listed | 28 everywhere (published quizzes) |
| /data/pulse | July only in the cached HTML | July, August and September |
| /data/knowledge-report-2026/dataset | 200, text/markdown | 200, text/markdown |

## IndexNow, after #96 went live

- Key file https://kpopquiz.org/4b2f9a7ce8d1465fb0a3e6c95d47128a.txt: 200, `text/plain; charset=utf-8`, body
  equal to the key, served outside the middleware.
- One POST to https://api.indexnow.org/indexnow with every URL of the live sitemap (734 URLs,
  /tuide-quiz included) on 14 October 2026: **HTTP 200**.

## Still open after part A, and where it is fixed

| Item | PR | Checked on a flags-on dev server of the branch |
|---|---|---|
| Typed counts ("380+" on the home page and more) | stats and facts (#98) | home "450+", /quizzes "450+", /blindtest "4,200+ songs across 84 groups" |
| /games/name-all/name-all-aespa | Bing fixes | 301 to /aespa-name-all-members |
| /games/name-all/name-all-gidle | Bing fixes | 301 to /g-i-dle-name-all-members |
| /games/name-all/name-top-10-bts-songs, name-all-4th-gen-gg | Bing fixes | 410 |
| /battle?quiz=illit-quiz | Bing fixes | 301 to /q/illit-quiz; a made-up slug answers 404 |
| /robots.txt OAI-SearchBot group | Bing fixes | present, same rules as * |
| /create?group=bts canonical | Bing fixes | /create (noindex stays) |
| /terms and /privacy descriptions | Bing fixes | 152 and 142 characters |
