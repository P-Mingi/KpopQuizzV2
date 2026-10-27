# CALENDAR: K-pop dates that move searches

Version 1, 2026-10-15 (SEO Mission 3, part E point 2). Read by the refresh queue, by
/admin/seo and, later, by the Monday e-mail.

## What this is for

Searches for a group jump around a comeback, a tour stop, an award show or an anniversary.
Each date below opens a preparation checklist 10 days before it (shown in /admin/seo), and
puts the group quiz hub in the refresh queue when the date is 14 days away or less.

## Rules for a row

- Every date has the URL of the source that confirms it. Best: the official page (label,
  artist or organizer site, verified account). When no official page can be opened, a
  bylined article from Yonhap, Korea JoongAng Daily, The Korea Herald or The Korea Times that
  quotes the agency is accepted.
- Never kprofiles, Fandom or a fan schedule site (`docs/seo/KPOP-SOURCES.md`).
- A date no source confirms gets status `unconfirmed`, and the notes say what was found.
- Dates are the local day of the event (KST for Korea).

## How to add or change a date

Change the row here AND the same row in `apps/quiz/src/lib/seo/calendar.ts`. A test
(`calendar.test.ts`) compares the two and fails if they differ, so the site never reads a
date this page does not show. Ask the agent if you prefer: give it the date and the source.

## The calendar

Columns: `group` is the group's slug on the site (`-` for an event with several artists);
`end` is the last day of an event that lasts more than one day.

| id | date | end | group | type | status | event | source |
|---|---|---|---|---|---|---|---|
| illit-break-even | 2026-10-26 | - | illit | comeback | confirmed | ILLIT fifth EP "BREAK EVEN" (6 p.m. KST) | https://www.koreaherald.com/article/10872608 |
| ateez-golden-hour-6 | 2026-11-13 | - | ateez | comeback | confirmed | ATEEZ album "GOLDEN HOUR : Part.6" (2 p.m. KST) | https://www.koreajoongangdaily.com/entertainment/boy-band-ateez-to-return-with-golden-hour-part6-next-month/12910603 |
| txt-perfect-storm | 2026-11-16 | - | txt | comeback | confirmed | TXT ninth EP "Perfect Storm" | https://www.koreajoongangdaily.com/entertainment/tomorrow-x-together-sets-perfect-storm-release/12893866 |
| mama-2026 | 2026-11-20 | 2026-11-21 | - | awards | confirmed | 2026 MAMA AWARDS | https://cjenm.com/en/news/2026-mama-awards-to-take-place-in-japan---from-november-2021/ |
| bts-arirang-tour-jakarta | 2026-12-26 | 2026-12-29 | bts | concert | confirmed | BTS WORLD TOUR ARIRANG in Jakarta (shows on 26, 27 and 29 Dec) | https://www.koreaherald.com/article/10774549 |
| golden-disc-41 | 2027-01-09 | 2027-01-10 | - | awards | confirmed | 41st Golden Disc Awards | https://www.koreajoongangdaily.com/entertainment/41st-golden-disc-awards-to-be-held-for-2-days-in-hanoi-in-january/12859862 |
| bts-arirang-1-year | 2027-03-20 | - | bts | anniversary | confirmed | One year of the BTS album "ARIRANG" (released 20 Mar 2026) | https://www.koreaherald.com/article/10698793 |

## What was found (checked 2026-10-15)

- **illit-break-even.** The Korea Herald (Hwang You-mee, 14 Sep 2026) quotes Belift Lab: fifth
  EP "Break Even" on 26 Oct. The Korea Times (Pyo Kyung-min, 6 Oct 2026) gives 6 p.m.:
  https://www.koreatimes.co.kr/entertainment/k-pop/20261006/ive-illit-riize-collide-as-october-k-pop-comeback-race-heats-up
  No official page could be opened (Weverse needs a login).
- **ateez-golden-hour-6.** Korea JoongAng Daily (Lee Ji-won, 8 Oct 2026) quotes KQ
  Entertainment: 13 Nov. Sports Kyunghyang (Kang Shin-woo, 8 Oct 2026) gives 2 p.m.:
  https://sports.khan.co.kr/en/article/202610081046007
  The official ATEEZ X post (https://x.com/ATEEZofficial/status/2107848426142814682) reads
  "2026. 11. 13 2PM(KST) RELEASE" in a search index; x.com needs a login, so it was not opened.
- **txt-perfect-storm.** Korea JoongAng Daily (Lee Soo-jung, 28 Sep 2026) quotes BigHit Music:
  ninth EP "Perfect Storm" on 16 Nov. The Korea Herald (Hwang You-mee, 28 Sep 2026) agrees:
  https://www.koreaherald.com/article/10885874 . No release time yet. TXT plays KSPO Dome,
  Seoul, on 13 to 15 Nov, just before.
- **mama-2026.** Official: CJ ENM, the organizer (31 Mar 2026): Kyocera Dome Osaka, 20 to 21
  Nov. Korea JoongAng Daily (Lee Ji-won, 31 Mar 2026) agrees:
  https://www.koreajoongangdaily.com/entertainment/2026-mama-awards-to-take-place-in-osaka-in-november/12576374
- **bts-arirang-tour-jakarta.** Not the dates of the brief (26 to 27 Dec): on 17 Jun 2026
  BigHit Music added a third show, so the shows are on 26, 27 and 29 Dec (none on 28 Dec), at
  Gelora Bung Karno Main Stadium. The Korea Herald (Hwang You-mee, 18 Jun 2026) and Korea
  JoongAng Daily (Lee Ji-won, 17 Jun 2026):
  https://www.koreajoongangdaily.com/entertainment/bts-adds-two-dates-in-southeast-asia-to-its-world-tour/12727812
- **golden-disc-41.** Korea JoongAng Daily (Lee Ji-won, 4 Sep 2026; the JoongAng group hosts
  the awards): 9 to 10 Jan 2027 at the Vietnam Exposition Center, Hanoi. Sports Kyunghyang
  (Ahn Byung-gil, 4 Sep 2026) agrees: https://sports.khan.co.kr/en/article/202609041123007 .
  The official site goldendisc.co.kr renders in the browser only and still shows the 40th
  edition. Lineup not announced yet.
- **bts-arirang-1-year.** "ARIRANG" came out on 20 Mar 2026 at 1 p.m. KST (Yonhap, carried by
  The Korea Herald on 20 Mar 2026), confirmed by Wikipedia:
  https://en.wikipedia.org/wiki/Arirang_(album)

## The preparation checklists

Open from 10 days before the first day through the last day. The tasks are listed in
`PREP_CHECKLISTS` in `calendar.ts` and shown in /admin/seo:

- comeback: recheck the date on the official source; reread the hub; check the blind test
  playlist; plan one sourced quiz (no lyrics); after release add the album with its source;
  check IndexNow.
- concert: recheck dates and venue; reread the hub (no setlist, ticket or attendance claim);
  check hub links; add nothing about the shows without a source.
- awards: recheck dates, venue and lineup; refresh the stale hubs of the performers first;
  add wins only with the organizer or a bylined source.
- anniversary: recheck the original date in two sources; reread the hub section; plan one
  sourced quiz.
