import { NextResponse } from 'next/server';

// W9a - llms.txt.
//
// CALIBRATION, recorded so nobody over-invests later: the academy that recommends this
// also calls it "a cheap experiment, not a core ranking lever". It is a static text
// file describing what the site is and where the good pages are. Ship it, expect
// nothing.
//
// Everything below is either a fixed fact about the site or a real route. No counts are
// printed, because a hardcoded count would rot and a live one is not worth a DB read on
// a file nothing is proven to consume.
export const dynamic = 'force-static';

const BODY = `# kpopquiz.org

> Free, fan-made K-pop quizzes, trivia and games. Every quiz is written by a fan, and
> every statistic on the site is derived from real plays, never simulated.

## What this site is
kpopquiz.org is an independent K-pop quiz site. Visitors play quizzes about K-pop
groups, take blind tests, and compare results. Quizzes are created by fans; scores,
play counts and averages come from real recorded plays.

## Best entry points
- /quizzes: every published quiz, filterable by group and type
- /{group}-quiz: a group's hub, e.g. /bts-quiz, with that group's quizzes and facts
- /{group}-trivia: sourced facts about a group, e.g. /twice-trivia
- /blindtest: the K-pop blind test, guess the song from a 10-second clip
- /data/pulse: monthly first-party reports drawn from real plays
- /stats: site-wide statistics from real plays
- /articles: original guides and comparisons

## Using our data
Our statistics are first-party and free to cite with a link to the page they came from.
Please attribute to kpopquiz.org and link the specific page rather than the homepage.

## What we do not publish
We do not publish simulated scores, invented play counts, or fabricated opponents. If a
number appears on this site, a person produced it.
`;

export function GET(): NextResponse {
  return new NextResponse(BODY, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
