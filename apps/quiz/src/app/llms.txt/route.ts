import { createServiceRoleClient } from '@/lib/supabase/server';

export const revalidate = 86400;

export async function GET(): Promise<Response> {
  let songCount = 300;
  let groupCount = 60;
  let quizCount = 500;

  try {
    const supabase = createServiceRoleClient();
    const [songs, groups, quizzes] = await Promise.all([
      supabase.from('songs').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('groups').select('id', { count: 'exact', head: true }),
      supabase.from('quizzes').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    ]);
    songCount = songs.count ?? songCount;
    groupCount = groups.count ?? groupCount;
    quizCount = quizzes.count ?? quizCount;
  } catch {
    // use defaults
  }

  const body = `# KpopQuiz

> KpopQuiz is a free K-pop fan platform with quizzes, blind tests, trivia, and interactive games covering ${groupCount}+ K-pop groups across all generations.

## Site overview

- URL: https://kpopquiz.org
- Content type: Interactive K-pop fan games and quizzes
- Language: English
- Updated: Daily (user-generated quizzes, ISR pages)

## Key stats

- ${quizCount}+ fan-made quizzes
- ${songCount}+ songs in the blind test catalog
- ${groupCount}+ K-pop groups covered
- 5 K-pop generations (1st through 5th)

## Main sections

- [Home](https://kpopquiz.org/): Daily quiz, trending quizzes, group navigation
- [Quizzes](https://kpopquiz.org/quizzes): Browse all fan-made K-pop quizzes by group, difficulty, or popularity
- [Blind Test](https://kpopquiz.org/blindtest): Audio blind test with ${songCount}+ songs, filter by generation or group
- [Games Hub](https://kpopquiz.org/games): This or That matchups, Name All Members challenges
- [Trivia](https://kpopquiz.org/trivia): K-pop fun facts and trivia pages per group
- [Leaderboard](https://kpopquiz.org/leaderboard): Top players ranked by score
- [Rankings](https://kpopquiz.org/rankings): Fan-voted rankings for members, songs, albums per group
- [Statistics](https://kpopquiz.org/stats): Original first-party K-pop fan data, updated hourly and free to cite: the most-played fandoms this week, hardest and easiest quizzes by real average score, and fan duel verdicts
- [Monthly Pulse](https://kpopquiz.org/data/pulse): A monthly first-party K-pop data report, one per month, free to cite: the fandom of the month by real quiz plays, the most-played quizzes, the fan duel verdict, and honest community growth

## Group quiz pages

Every major K-pop group has a dedicated quiz hub at /{group-slug}-quiz (e.g., /bts-quiz, /blackpink-quiz, /stray-kids-quiz). These pages aggregate all fan-made quizzes for that group and link to the group's blind test and trivia page.

## Game types

1. **K-pop Quizzes**: Multiple-choice fan-made quizzes (easy/medium/hard)
2. **Blind Test**: Listen to a 10-second audio clip, guess the song or artist from 4 choices
3. **This or That**: Head-to-head matchups (favorite member, best song, etc.) with live Elo rankings
4. **Name All Members**: Timer-based challenge to name every member of a group
5. **True or False**: Statement-based K-pop knowledge test

## Data and coverage

Groups include BTS, BLACKPINK, Stray Kids, TWICE, aespa, NewJeans, SEVENTEEN, EXO, Red Velvet, (G)I-DLE, IVE, ITZY, ENHYPEN, LE SSERAFIM, TXT, ATEEZ, SHINee, BIGBANG, SNSD, GOT7, MAMAMOO, IU, NMIXX, Dreamcatcher, and many more.

## API and feeds

- Sitemap: https://kpopquiz.org/sitemap.xml
- Robots: https://kpopquiz.org/robots.txt

## Contact

- Website: https://kpopquiz.org/contact
- Reddit: https://reddit.com/r/Kpop_Verse
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
