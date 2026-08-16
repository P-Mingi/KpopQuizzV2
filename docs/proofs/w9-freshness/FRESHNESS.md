# W9b - the freshness date, next to the SQL that produced it

## The query behind every date on the page

`src/lib/db/queries/group-freshness.ts`:

```sql
select created_at
from quizzes
where group_id = $1 and status = 'published'
order by created_at desc
limit 1
```

The month is formatted from that timestamp in UTC. No date is ever synthesised: when a
group has no published quiz the whole line is withheld and `dateModified` is omitted
from the JSON-LD entirely, rather than falling back to today.

## The column choice, which is the whole point of this item

The obvious column is `quizzes.updated_at`. It is the wrong one, and picking it would
have quietly broken the mission's rule. `record_play()` bumps `updated_at` on **every
play**, so it tracks play recency, not content freshness. Measured live today:

| group | `updated_at` (newest) | `created_at` (newest) |
| --- | --- | --- |
| bts | 2026-08-16 | 2026-07-28 |
| twice | 2026-08-16 | 2026-08-10 |
| astro | 2026-08-07 | 2026-04-11 |
| dreamcatcher | 2026-08-08 | 2026-07-10 |

`updated_at` would have printed **"Updated August 2026" on every group anyone is
currently playing**, including groups whose newest quiz is four months old. That is
today's date wearing a database column as a costume, and it is exactly the signal the
mission forbids. `created_at` moves when content is actually added and stays put when
it is not.

## What the production build actually serves

Served HTML, production build, port 3021 (`served.txt`):

| page | visible line | `dateModified` |
| --- | --- | --- |
| /bts-quiz | Updated July 2026 | 2026-07-28 |
| /twice-quiz | Updated August 2026 | 2026-08-10 |
| /astro-quiz | Updated April 2026 | 2026-04-11 |
| /dreamcatcher-quiz | Updated July 2026 | 2026-07-10 |

The visible line and the structured data are the same value, so the markup cannot claim
one date while the page shows another.

**The honestly stale case the mission asked for: `/astro-quiz` says "Updated April
2026".** ASTRO's newest published quiz is from 2026-04-11 and the page says so, four
months late, rather than flattering itself with a build date.

## Verified through a parser, not a string match

The raw HTML contains `<time dateTime="2026-04-11">`, camel-cased. HTML attribute names
are case-insensitive, but that is an assertion, so it was checked in a real DOM:

```
{ attrNames: ["datetime"], attrValue: "2026-04-11",
  dateTimeProp: "2026-04-11", text: "Updated April 2026" }
```

The parser sees a valid lowercase `datetime` and `HTMLTimeElement.dateTime` resolves.

## A build timestamp that was already shipping, now removed

`group-trivia-page.tsx` was emitting `dateModified: new Date().toISOString()` in its
Article JSON-LD. Every deploy told crawlers all 24 trivia pages had changed, whether or
not a single fact on them had moved. It now uses the same real query. A sweep of every
`dateModified` in `src/` confirms the remaining ones are all real columns
(`article.updatedAt`, `quiz.updated_at`, `report.updatedAt`, `stats.updatedAt`,
`p.updatedAt`, thread `lastActivityAt`); this was the only fabricated one.
