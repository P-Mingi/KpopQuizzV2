import { Icon } from '@/components/ux-v1/icon';
import { MIN_BOARD, WAR_VISIBLE, comma } from '@/lib/ux-v1/p9/format';

import { BoardRows, Podium, personPodiumItems, personRowItems, warPodiumItems, warRowItems } from './board';
import { CreatorPin, CreatorsSwitch, PlayerPin, WarPin } from './islands';

import type { CreatorsBoards, CreatorsView, PersonRow, WarRow } from '@/lib/ux-v1/p9/data';

// The server-rendered boards of the Fandom war, Players and Creators tabs
// (prototype #lb-war, #lb-players, #lb-creators). Real aggregates only; each board
// keeps the live page's 4-row floor.

function Empty({ children }: { children: React.ReactNode }): React.ReactElement {
  return <p className="p9-empty">{children}</p>;
}

/** Fandom war: podium, rows 4 to 10, rows 11 to 30 in a native fold (crawlable),
 *  the fan's own fandom pinned. */
export function WarPane({ rows }: { rows: WarRow[] }): React.ReactElement {
  if (rows.length < MIN_BOARD) {
    return (
      <div id="fandom-war" className="p9-board">
        <Empty>No fandom has points this week yet. Every quiz played for a group adds a point to its fandom.</Empty>
        <WarPin />
      </div>
    );
  }
  const podium = rows.length >= 3 ? rows.slice(0, 3) : [];
  const listed = rows.slice(podium.length, WAR_VISIBLE);
  const more = rows.slice(WAR_VISIBLE);
  return (
    <div id="fandom-war" className="p9-board">
      <h2 className="ux-sr">Fandom war, last 7 days</h2>
      <Podium items={warPodiumItems(podium)} label="Top 3 fandoms" />
      <BoardRows items={warRowItems(listed)} top label={`Fandoms ${listed[0]?.rank ?? 1} to ${listed[listed.length - 1]?.rank ?? 1}`} />
      {more.length ? (
        <details className="p9-more">
          <summary>
            <span className="p9-more-o">Show all {comma(rows.length)} fandoms</span>
            <span className="p9-more-c">Show fewer</span>
            <Icon name="chev" />
          </summary>
          <BoardRows items={warRowItems(more)} label={`Fandoms ${more[0]!.rank} to ${more[more.length - 1]!.rank}`} className="p9-rows-more" />
        </details>
      ) : null}
      <WarPin />
    </div>
  );
}

/** Players: all-time XP (the passport level's XP), your rank pinned. */
export function PlayersPane({ rows }: { rows: PersonRow[] }): React.ReactElement {
  if (rows.length < MIN_BOARD) {
    return (
      <div className="p9-board">
        <Empty>No player has earned XP yet.</Empty>
        <PlayerPin />
      </div>
    );
  }
  const podium = rows.length >= 3 ? rows.slice(0, 3) : [];
  return (
    <div className="p9-board">
      <h2 className="ux-sr">Players, all-time XP</h2>
      <Podium items={personPodiumItems(podium, 'XP')} label="Top 3 players" />
      <BoardRows items={personRowItems(rows.slice(podium.length), 'XP')} top label="Players by XP" />
      <PlayerPin />
    </div>
  );
}

const CREATOR_UNIT: Record<CreatorsView, string> = { all: 'plays', week: 'plays', rising: 'followers' };
const CREATOR_H2: Record<CreatorsView, string> = {
  all: 'Creators, all-time plays received',
  week: 'Creators, plays of this week\'s new quizzes',
  rising: 'Creators, new followers this week',
};

function CreatorBoard({ view, rows }: { view: CreatorsView; rows: PersonRow[] }): React.ReactElement {
  const podium = rows.length >= 3 ? rows.slice(0, 3) : [];
  const u = CREATOR_UNIT[view];
  return (
    <>
      <h2 className="ux-sr">{CREATOR_H2[view]}</h2>
      <Podium items={personPodiumItems(podium, u)} label={`Top 3 creators, ${view === 'all' ? 'all time' : view === 'week' ? 'this week' : 'rising'}`} />
      <BoardRows items={personRowItems(rows.slice(podium.length), u)} top label={CREATOR_H2[view]} />
    </>
  );
}

/** Creators: plays received (all time), with the live This week and Rising boards
 *  when they clear the floor; your all-time standing pinned. */
export function CreatorsPane({ boards, views }: { boards: CreatorsBoards; views: CreatorsView[] }): React.ReactElement {
  if (!views.length) {
    return (
      <div className="p9-board">
        <Empty>No creator board yet.</Empty>
        <CreatorPin />
      </div>
    );
  }
  const nodes: Partial<Record<CreatorsView, React.ReactNode>> = {};
  for (const v of views) nodes[v] = <CreatorBoard view={v} rows={boards[v]} />;
  return (
    <div className="p9-board">
      <CreatorsSwitch views={views} boards={nodes} pin={<CreatorPin />} />
    </div>
  );
}
