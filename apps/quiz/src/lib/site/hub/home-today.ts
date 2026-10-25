// Run O1, lot H2a: the data of "Today" (the quiz of the day of each site, the blindtest of the day, the debate of the day). The body
// returns the design's sample; lot H2b reads the daily banks and the debates table and keeps the shape (HomeToday).

import type { HomeToday } from './home-types';

export async function loadHomeToday(): Promise<HomeToday> {
  return {
    quizzes: [
      { site: 'kpop', title: 'ZEROBASEONE: From Boys Planet to In Bloom', meta: '10 questions · Easy', path: '/daily' },
      { site: 'anime', title: "Journey's Beginning: Frieren Basics", meta: '10 questions · Easy', path: '/daily' },
    ],
    blindtest: { site: 'kpop', path: '/blindtest/daily', songs: 5, seconds: 10 },
    debate: { site: 'kpop', title: 'Best title track of 2025 so far?', path: '/community' },
  };
}
