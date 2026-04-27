import { getAvatarColors } from '@/lib/utils';

import type { TopCreator } from '@/lib/db/types';

// Pool of fake usernames that look like real K-pop fan accounts
const FAKE_USERS = [
  'moa_hana', 'stay_soojin', 'blink_yuna', 'once_mina', 'atiny_jisoo',
  'carat_yeji', 'engene_ryu', 'my_winter', 'orbit_hyein', 'nevie_soyeon',
  'midzy_lia', 'fearnot_yuna', 'kwangya_fan', 'dereve_minji', 'diver_hanni',
  'shawol_key', 'army_jin', 'exol_kai', 'reveal_juyeon', 'melody_btob',
  'inner_circle', 'moomoo_solar', 'nctzen_mark', 'universe_iu', 'luvity_wony',
];

/** Simple seeded PRNG to get deterministic numbers per week. */
function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function getIsoWeek(): number {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - jan1.getTime()) / 86400000);
  return Math.ceil((days + jan1.getDay() + 1) / 7) + now.getFullYear() * 100;
}

/**
 * Pad a weekly leaderboard with fake entries so it always has at least
 * `minEntries` rows. Fake users rotate deterministically each week.
 */
export function padWeeklyLeaderboard(real: TopCreator[], minEntries: number): TopCreator[] {
  if (real.length >= minEntries) return real;

  const week = getIsoWeek();
  const rand = seededRand(week);

  // Shuffle fake pool deterministically, exclude collisions with real usernames
  const realUsernames = new Set(real.map((c) => c.username));
  const available = FAKE_USERS
    .map((u) => ({ u, sort: rand() }))
    .sort((a, b) => a.sort - b.sort)
    .map((x) => x.u)
    .filter((u) => !realUsernames.has(u));

  // Fake plays stay at or below the lowest real user (or 46 if no real data)
  const lowestReal = real.length > 0
    ? Math.min(...real.map((c) => c.weekly_plays))
    : 46;

  const needed = minEntries - real.length;
  const fakes: TopCreator[] = [];

  for (let i = 0; i < needed && i < available.length; i++) {
    const username = available[i]!;
    const colors = getAvatarColors(username);
    const maxPlays = Math.min(46, lowestReal);
    const plays = Math.max(2, Math.round(2 + rand() * (maxPlays - 2)));
    const quizzes = Math.max(1, Math.round(1 + rand() * 7));
    fakes.push({
      username,
      avatar_url: null,
      avatar_bg: colors.bg,
      avatar_text: colors.text,
      total_quizzes_created: quizzes,
      weekly_plays: plays,
    });
  }

  fakes.sort((a, b) => b.weekly_plays - a.weekly_plays);
  return [...real, ...fakes];
}
