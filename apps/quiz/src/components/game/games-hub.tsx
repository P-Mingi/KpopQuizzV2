import Link from 'next/link';

import { BlindStreak } from './blind-streak';
import { HubLastPlayed } from './hub-last-played';
import { SORT_IT_PLAYLISTS } from '@/lib/games/sort-it';
import { MATCH_UP_PLAYLISTS } from '@/lib/games/match-up';
import { NAME_THEM_ALL_PLAYLISTS } from '@/lib/games/name-them-all';

import type { LastPlayedGame } from '@/lib/games/last-played';
import type { RankingIndexItem } from '@/lib/db/queries/duels';

// G-HUB v2 (ledger L-032..L-034, prototype prototypes/games-hub-v2.html).
// No hero carousel. Order: slim header · TODAY rail (blind test of the day +
// coming-soon teaser) · ALL GAMES grid of CSS-art photocard tiles, each with two
// visible actions (Play -> default variant, "All modes" -> lobby) · live-ranking
// bar. Covers are 100% CSS art (legal wall: no idol photos / album art). The Play
// href is the crawlable default variant today; step 4 upgrades it client-side to
// the last-played variant. SEO parity: every /games link the old hub emitted is
// kept (personality, blindtest, this-or-that/all, name-them-all, sort-it,
// match-up, rankings) and Duel (/battle) is added.

export interface GamesHubCounts {
  personality: number;
  songs: number;
  categories: number;
  nameAll: number;
  nameThemAll: number;
  sortIt: number;
  matchUp: number;
}

interface GamesHubProps {
  // Rendered server-side from live DB counts; a missing field degrades to a plain
  // Play tile (no "All modes" chip), never a crash (min-gate + ISR fail-closed).
  counts?: Partial<GamesHubCounts> | null;
  liveRanking: RankingIndexItem | null;
}

interface Tile {
  key: string;
  name: string;
  line: string;
  cover: string;
  big: string;
  bigSize: number;
  play: string;
  lobby: string | null;
  modes: number;
  // When set, the client upgrades this tile's Play href to the last-played variant.
  lp?: LastPlayedGame;
}

const firstSlug = (list: ReadonlyArray<{ slug: string }>, fallback: string): string =>
  list[0]?.slug ?? fallback;

export function GamesHub({ counts, liveRanking }: GamesHubProps): React.ReactElement {
  const c = {
    personality: counts?.personality ?? 0,
    songs: counts?.songs ?? 0,
    categories: counts?.categories ?? 0,
    nameAll: counts?.nameAll ?? 0,
    nameThemAll: counts?.nameThemAll ?? 0,
    sortIt: counts?.sortIt ?? 0,
    matchUp: counts?.matchUp ?? 0,
  };

  // Six game tiles. `play` = default variant (crawlable now, last-played later);
  // `lobby` + `modes` drive the secondary "All modes" chip (shown only when >= 2).
  const games: Tile[] = [
    {
      key: 'name', name: 'Name Them All', line: 'Type every member before the timer',
      cover: 'cv-name', big: 'A B C', bigSize: 30,
      play: `/games/name-them-all/${firstSlug(NAME_THEM_ALL_PLAYLISTS, 'name-all-kpop-groups')}`,
      lobby: '/games/name-them-all', modes: c.nameThemAll, lp: 'name-them-all',
    },
    {
      key: 'sort', name: 'Sort It', line: 'Two sides, tap the right one',
      cover: 'cv-sort', big: '←  →', bigSize: 22,
      play: `/games/sort-it/${firstSlug(SORT_IT_PLAYLISTS, 'boy-group-or-girl-group')}`,
      lobby: '/games/sort-it', modes: c.sortIt, lp: 'sort-it',
    },
    {
      key: 'match', name: 'Match-Up', line: 'Pair the tiles, clear the board',
      cover: 'cv-match', big: '▦', bigSize: 26,
      play: `/games/match-up/${firstSlug(MATCH_UP_PLAYLISTS, 'song-to-group')}`,
      lobby: '/games/match-up', modes: c.matchUp, lp: 'match-up',
    },
    {
      key: 'tot', name: 'This or That', line: 'Vote, move the live ranking',
      cover: 'cv-tot', big: 'VS', bigSize: 24,
      // Play -> the game (auto-starts the default matchup); All modes -> the catalog.
      play: '/games/this-or-that', lobby: '/games/this-or-that/all', modes: c.categories,
    },
    {
      key: 'member', name: 'Which member are you', line: '10 questions, your match',
      cover: 'cv-member', big: 'YOU?', bigSize: 22,
      play: '/personality', lobby: null, modes: 0,
    },
    {
      key: 'duel', name: 'Duel 1v1', line: 'Challenge a fan, climb the Elo',
      cover: 'cv-duel', big: '1v1', bigSize: 24,
      play: '/battle', lobby: null, modes: 0,
    },
  ];

  return (
    <main className="gh2">
      <header className="gh2-hero">
        <div>
          <h1 className="gh2-h1">Pick your game.<br /><em>{"You're in, in one tap."}</em></h1>
          <p className="gh2-sub">No lobby screens. Every button below drops you straight into play.</p>
        </div>
        <span className="gh2-hint">1 tap = playing</span>
      </header>

      <p className="gh2-lbl">Today</p>
      <section className="gh2-today" aria-label="Daily games">
        <Link href="/blindtest" className="gh2-dcard" aria-label="Play today's blind test now">
          <span className="gh2-dcover blind" aria-hidden="true" />
          <span className="gh2-dbody">
            <span className="gh2-dkick">Daily · resets 00:00</span>
            <span className="gh2-dname">Blind test of the day</span>
            <span className="gh2-dmeta">Name the song from a 10-second clip<BlindStreak /></span>
          </span>
          <span className="gh2-play" aria-hidden="true">Play</span>
        </Link>
        <div className="gh2-dcard gh2-soon" aria-label="K-pop Idle, coming soon">
          <span className="gh2-dcover idle" aria-hidden="true" />
          <span className="gh2-dbody">
            <span className="gh2-dkick gh2-dkick-muted">Daily · new</span>
            <span className="gh2-dname">K-pop Idle</span>
            <span className="gh2-dmeta">Guess the idol in 8 tries, clue by clue</span>
          </span>
          <span className="gh2-soon-tag">Coming soon</span>
        </div>
      </section>

      <p className="gh2-lbl">All games</p>
      <section className="gh2-grid" aria-label="All games">
        {games.map((g) => (
          <article className="gh2-tile" key={g.key}>
            <Link
              href={g.play}
              className="gh2-tile-play"
              aria-label={`Play ${g.name} now`}
              {...(g.lp && g.lobby ? { 'data-lp': g.lp, 'data-lp-base': `${g.lobby}/` } : {})}
            >
              <span className={`gh2-cover ${g.cover}`} aria-hidden="true">
                <span className="gh2-cover-big" style={{ fontSize: g.bigSize }}>{g.big}</span>
              </span>
              <span className="gh2-gbody">
                <span className="gh2-gtext">
                  <span className="gh2-name">{g.name}</span>
                  <span className="gh2-line">{g.line}</span>
                </span>
                <span className="gh2-play" aria-hidden="true">Play</span>
              </span>
            </Link>
            {g.lobby && g.modes >= 2 && (
              <Link href={g.lobby} className="gh2-allmodes">All modes · {g.modes}</Link>
            )}
          </article>
        ))}
      </section>

      {liveRanking && (
        <section className="gh2-rank" aria-label="Today's live ranking">
          <span className="gh2-dot" aria-hidden="true" />
          <span className="gh2-rank-body">
            <span className="gh2-q">{liveRanking.prompt}</span>
            <span className="gh2-rank-meta">
              {liveRanking.top_entity ? `#1 ${liveRanking.top_entity.name} · ` : ''}
              {liveRanking.total_votes.toLocaleString('en-US')} votes
            </span>
          </span>
          <span className="gh2-rot">changes daily</span>
          <Link href={`/rankings/${liveRanking.group_slug}/${liveRanking.question_type}`} className="gh2-play gh2-play-sm">Vote</Link>
          <Link href="/rankings" className="gh2-rank-all">All rankings</Link>
        </section>
      )}

      <HubLastPlayed />
    </main>
  );
}
