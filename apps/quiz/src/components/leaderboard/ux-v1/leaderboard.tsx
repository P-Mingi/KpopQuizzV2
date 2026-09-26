import { UxPage } from '@/components/ux-v1/page';
import { safeFetch } from '@/lib/error-handling';
import {
  creatorViews, readCreators, readFeeds, readFresh, readPlayers, readQotd, readToday, readWarBoard,
} from '@/lib/ux-v1/p9/data';

import { AroundCommunity } from './around';
import { LbTabs, RankedPane } from './islands';
import { CreatorsPane, PlayersPane, WarPane } from './panes';
import { HowPoints } from './points';

// UX v11 /leaderboard (P9; prototype #leaderboard, DESIGN-SPEC 13.5, 16.7, 17.1,
// 17.3): tabs Fandom war / Players / Ranked / Creators, frameless podium, rows with
// the change since last week, your row pinned, How points work. Server component,
// static/ISR (the route keeps revalidate = 300); the per-viewer bits are islands.
//
// SEO lock (brief P9 + COMMON rule 6): the H1 and the intro stay the live page's
// ("Community" / "Discover fans, creators, and rising stars."); title, meta and
// canonical stay on the route. Every link of the live page is served here too (the
// boards + "Around the community").

const NO_CREATORS = { all: [], week: [], rising: [] };
const NO_FEEDS = { happening: [], comments: [], badges: [] };

export async function LeaderboardV11(): Promise<React.ReactElement> {
  const [war, players, creators, today, qotd, feeds, fresh] = await Promise.all([
    safeFetch(readWarBoard(), [], '[ux-leaderboard] war'),
    safeFetch(readPlayers(), [], '[ux-leaderboard] players'),
    safeFetch(readCreators(), NO_CREATORS, '[ux-leaderboard] creators'),
    safeFetch(readToday(), null, '[ux-leaderboard] today'),
    safeFetch(readQotd(), null, '[ux-leaderboard] qotd'),
    safeFetch(readFeeds(), NO_FEEDS, '[ux-leaderboard] feeds'),
    safeFetch(readFresh(), [], '[ux-leaderboard] fresh'),
  ]);
  const views = creatorViews(creators);

  return (
    <UxPage width="text" className="p9-lb">
      <header className="ux-ph">
        <h1>Community</h1>
        <p>Discover fans, creators, and rising stars.</p>
      </header>

      <LbTabs
        panes={[
          { id: 'war', label: 'Fandom war', icon: 'flag', hash: 'fandom-war', content: <WarPane rows={war} /> },
          { id: 'players', label: 'Players', icon: 'user', hash: 'players', content: <PlayersPane rows={players} /> },
          {
            id: 'ranked',
            label: 'Ranked',
            icon: 'trophy',
            hash: 'ranked',
            content: <div className="p9-board"><h2 className="ux-sr">Ranked, season ladder</h2><RankedPane /></div>,
          },
          { id: 'creators', label: 'Creators', icon: 'pen', hash: 'creators', content: <CreatorsPane boards={creators} views={views} /> },
        ]}
      />

      <HowPoints creatorViews={views} />

      <AroundCommunity data={{ today, qotd, ...feeds, fresh }} />
    </UxPage>
  );
}
