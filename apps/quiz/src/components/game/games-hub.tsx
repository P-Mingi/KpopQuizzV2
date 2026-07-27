import Link from 'next/link';

import { GameModeCard } from './game-mode-card';
import { GamesDailyStrip } from './games-daily-strip';
import { formatCount } from '@/lib/utils';

import type { GameOfTheDayData } from '@/lib/db/queries/game-of-the-day';
import type { RankingIndexItem } from '@/lib/db/queries/duels';

// Lean games PICKER (redesign per docs/games-ux-audit.md). This is a mode
// picker, not a catalog: a hero, the game-of-the-day strip, a 4-mode grid, and
// one live-ranking teaser. The full catalogs live on their own index pages
// (/personality, /blindtest, /games/this-or-that/all, /games/name-all, /rankings).

export interface GamesHubCounts {
  personality: number;
  songs: number;
  categories: number;
  nameAll: number;
  sortIt: number;
  matchUp: number;
}

interface GamesHubProps {
  gotd: GameOfTheDayData | null;
  // Tolerate a missing/partial counts object: this renders server-side from
  // live DB fetches, and a failed/absent count must degrade gracefully, never
  // crash the whole hub (each card falls back to a call-to-action stat).
  counts?: Partial<GamesHubCounts> | null;
  liveRanking: RankingIndexItem | null;
}

const ICON_MATCH = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /><path d="m17 11 1.5 1.5L21 10" /></svg>
);
const ICON_BLIND = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
);
const ICON_TOT = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 3 4 4-4 4" /><path d="M20 7H4" /><path d="m8 21-4-4 4-4" /><path d="M4 17h16" /></svg>
);
const ICON_NAME = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" /></svg>
);
const ICON_SORT = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="6" rx="1.5" /><path d="M12 9v3" /><path d="M12 12H6v3" /><path d="M12 12h6v3" /><path d="M4 15h4v6H4z" /><path d="M16 15h4v6h-4z" /></svg>
);
const ICON_MATCH_UP = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="7" height="6" rx="1.5" /><rect x="14" y="4" width="7" height="6" rx="1.5" /><rect x="3" y="14" width="7" height="6" rx="1.5" /><rect x="14" y="14" width="7" height="6" rx="1.5" /><path d="M10 7h4" /><path d="M10 17h4" /></svg>
);

export function GamesHub({ gotd, counts, liveRanking }: GamesHubProps): React.ReactElement {
  // Normalize once so a missing object or field can never throw. Each stat
  // shows the real count when present and a call-to-action otherwise.
  const c = {
    personality: counts?.personality ?? 0,
    songs: counts?.songs ?? 0,
    categories: counts?.categories ?? 0,
    nameAll: counts?.nameAll ?? 0,
    sortIt: counts?.sortIt ?? 0,
    matchUp: counts?.matchUp ?? 0,
  };
  const personalityStat = c.personality > 0 ? `${c.personality} groups` : 'Find your match';
  const songsStat = c.songs > 0 ? `${formatCount(c.songs)} songs · daily challenge` : 'Daily challenge';
  const categoriesStat = c.categories > 0 ? `${c.categories} categories` : 'Vote now';
  const nameAllStat = c.nameAll > 0 ? `${c.nameAll} rosters` : 'Beat the timer';
  const sortItStat = c.sortIt > 0 ? `${c.sortIt} sorting quizzes` : 'Beat the clock';
  const matchUpStat = c.matchUp > 0 ? `${c.matchUp} matching games` : 'Beat the clock';

  return (
    <main className="games-page">
      <div className="games-hero">
        <p className="games-eyebrow">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="6" y1="11" x2="10" y2="11" /><line x1="8" y1="9" x2="8" y2="13" /><line x1="15" y1="12" x2="15.01" y2="12" /><line x1="18" y1="10" x2="18.01" y2="10" /><rect x="2" y="6" width="20" height="12" rx="2" />
          </svg>
          Games
        </p>
        <h1 className="games-title">Pick your <span>game.</span></h1>
        <p className="games-sub">Guess songs, pick sides, name members, find your match.</p>
      </div>

      <GamesDailyStrip data={gotd} />

      <div className="gm-grid">
        <GameModeCard
          name="Which member are you?"
          desc="A 10-question personality quiz that matches you to a member of your group."
          href="/personality"
          tint="--brand"
          icon={ICON_MATCH}
          stat={personalityStat}
          highlight
          index={0}
        />
        <GameModeCard
          name="Blind test"
          desc="Name the song or the group from a 10-second clip. A fresh set every day."
          href="/blindtest"
          tint="--blind"
          icon={ICON_BLIND}
          stat={songsStat}
          index={1}
        />
        <GameModeCard
          name="This or that"
          desc="Two options, one winner. Vote in head-to-head matchups and move the ranking."
          href="/games/this-or-that/all"
          tint="--tot"
          icon={ICON_TOT}
          stat={categoriesStat}
          index={2}
        />
        <GameModeCard
          name="Name all members"
          desc="Type every member before the timer runs out. Sounds easy. It never is."
          href="/games/name-all"
          tint="--nam"
          icon={ICON_NAME}
          stat={nameAllStat}
          index={3}
        />
        <GameModeCard
          name="Sort it"
          desc="Boy group or girl group? 3rd gen or 4th gen? Sort real groups against the clock."
          href="/games/sort-it"
          tint="--sit"
          icon={ICON_SORT}
          stat={sortItStat}
          index={4}
        />
        <GameModeCard
          name="Match-Up"
          desc="Match songs to groups, idols to groups, or split song titles. Clear the board fast."
          href="/games/match-up"
          tint="--mup"
          icon={ICON_MATCH_UP}
          stat={matchUpStat}
          badge="New"
          index={5}
        />
      </div>

      {liveRanking && (
        <section className="games-rank-teaser">
          <div className="games-sec-head">
            <span className="games-sec-label">Live fan ranking</span>
            <Link href="/rankings" className="games-sec-see">All rankings &rarr;</Link>
          </div>
          <Link href={`/rankings/${liveRanking.group_slug}/${liveRanking.question_type}`} className="grt-card">
            {liveRanking.top_entity?.image
              ? <img className="grt-avatar" src={liveRanking.top_entity.image} alt="" loading="lazy" />
              : <span className="grt-avatar" />}
            <span className="grt-body">
              <span className="grt-prompt">{liveRanking.prompt}</span>
              <span className="grt-meta">
                {liveRanking.top_entity ? `#1 ${liveRanking.top_entity.name} · ` : ''}
                {liveRanking.total_votes.toLocaleString('en-US')} votes
              </span>
            </span>
            <span className="grt-live"><span className="rank-live-dot" />Live</span>
          </Link>
        </section>
      )}
    </main>
  );
}
