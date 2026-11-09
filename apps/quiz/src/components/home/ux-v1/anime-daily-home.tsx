// P5 (CR-025), link 10: the "Daily games" module of the OtakuQuiz home, loaded only by lib/ux-v1/p1/anime-daily-home.ts with the hub's dailyGuess on. A server component with no stylesheet
// import and no client code: its rules travel with it in one inline style tag, so a page without the module carries none of them. Fail closed, per game: the hub's switch and route map and
// the game's page (hubGameOpen), then dle_day, read directly (unstable_cache would keep a game that went off). A game that fails hides its own card; no card left, no module (min-gate).
// It reads no token, so dle_day never gives a play or a target: only the game number and the count of wins reach the markup, never an answer. No K-pop game, and no link to the Burrow,
// which lists K-pop games too: OtakuQuiz points only at the three anime games.
import { SectionHeader } from '@/components/ux-v1/section-header';
import { UxButton } from '@/components/ux-v1/button';
import { formatCount, gameCopy } from '@/lib/dle/copy';
import { dleGame } from '@/lib/dle/games';
import { readDay } from '@/lib/dle/read';
import { editorialHref } from '@/lib/network/links';
import { hubGameOpen } from '@/lib/passerelles/open';
import { createPublicReadClient } from '@/lib/supabase/server';

import type { DleGameId } from '@/lib/dle/games';
import type { DleDay } from '@/lib/dle/types';

/** The games of the module, in the order of the chain (Plan.dc.html, link 8). */
export const ANIME_DAILY_GAMES: readonly DleGameId[] = ['otakudle', 'otakudle-one-piece', 'otakudle-dragon-ball'];

export interface AnimeDailyCardView {
  readonly game: DleGameId;
  readonly gameNo: number;
  /** Today's wins. Null under dle_day's floor of 100 plays, and with no win yet. */
  readonly fansFound: number | null;
}

/** The only facts of dle_day the card keeps. Anything else in the answer stays out of the page. */
export function animeDailyView(game: DleGameId, day: DleDay | null): AnimeDailyCardView | null {
  if (!day || day.game !== game || !Number.isInteger(day.game_no) || day.game_no < 1) return null;
  const wins = day.stats?.wins;
  return { game, gameNo: day.game_no, fansFound: typeof wins === 'number' && wins > 0 ? wins : null };
}

/** The picture of a finished row of clues, as on the board: decoration, the same every day, it says nothing of the character. */
const TILES = ['', 'n', 'o', '', 'o', '', '', 'n', '', '', '', ''] as const;
const TILE_CLASS = { '': 'p5-ad-t', n: 'p5-ad-t p5-ad-near', o: 'p5-ad-t p5-ad-off' } as const;

const CSS = `
/* One row of cards, the same height, the button pinned to the bottom of each. On a phone the row scrolls sideways and snaps, the next card peeking from the right edge. */
.p5-ad-list { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 16px; }
.p5-ad-card { display: flex; flex-direction: column; align-items: flex-start; gap: 14px; padding: 18px; border: 1px solid var(--ux-line); border-radius: 20px; background: var(--ux-raised); color: var(--ux-ink); min-width: 0; }
.p5-ad-tiles { flex: none; display: grid; grid-template-columns: repeat(4, 16px); gap: 4px; padding: 12px; border-radius: 16px; background: var(--ux-pink-soft); }
.p5-ad-t { display: block; width: 16px; height: 16px; border-radius: 4px; background: var(--ux-ok); }
.p5-ad-near { background: repeating-linear-gradient(135deg, var(--ux-no-soft) 0 3px, var(--ux-no) 3px 6px); }
.p5-ad-off { background: var(--ux-edge); }
.p5-ad-main { flex: 1 1 auto; min-width: 0; width: 100%; }
.p5-ad-no { font-size: 13px; font-weight: 600; line-height: 1.6; color: var(--ux-pink-ink); }
.p5-ad-main h3 { font-size: 20px; line-height: 1.3; font-weight: 700; letter-spacing: -0.01em; margin-top: 2px; }
.p5-ad-line { font-size: 14px; line-height: 1.6; color: var(--ux-muted); margin-top: 4px; }
.p5-ad-go { flex: 0 0 auto; height: 44px; width: 100%; box-sizing: border-box; justify-content: center; }
.p5-ad-go svg { width: 14px; height: 14px; }
.p5-ad-foot { margin-top: 12px; }
@media (max-width: 760px) {
  .p5-ad-list { grid-auto-columns: 82%; overflow-x: auto; scroll-snap-type: x mandatory; overscroll-behavior-x: contain; padding-bottom: 6px; scroll-padding-inline: 0; }
  .p5-ad-card { scroll-snap-align: start; }
}
`;

export function AnimeDailyCard({ view }: { view: AnimeDailyCardView }): React.ReactElement {
  const g = dleGame(view.game);
  const w = gameCopy(view.game, 'en');
  const facts = [
    'unlimited tries',
    view.fansFound === null ? null : `${formatCount(view.fansFound, 'en')} ${view.fansFound === 1 ? 'fan' : 'fans'} found it`,
    'new character at 00:00 UTC',
  ].filter((x): x is string => x !== null);
  return (
    <div className="p5-ad-card" data-game={view.game}>
      <span className="p5-ad-tiles" aria-hidden="true">
        {TILES.map((t, i) => <span key={i} className={TILE_CLASS[t]} />)}
      </span>
      <div className="p5-ad-main">
        <p className="p5-ad-no ux-num">{w.noLabel ?? g.brand} · no. {view.gameNo}</p>
        <h3>{g.series ? `Guess today's ${g.series.name} character` : "Guess today's anime character"}</h3>
        <p className="p5-ad-line ux-num">{facts.join(' · ')}</p>
      </div>
      <UxButton href={editorialHref('hub', g.path)} className="p5-ad-go">
        {`Play ${g.series ? g.series.name : g.brand}`}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>
      </UxButton>
    </div>
  );
}

export function AnimeDailyModule({ views }: { views: readonly AnimeDailyCardView[] }): React.ReactElement {
  return (
    <section className="ux-sec ux-sec-lg" aria-labelledby="p5-ad-h">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <SectionHeader id="p5-ad-h" icon="grid" title="Daily games" />
      <div className="p5-ad-list">
        {views.map((v) => <AnimeDailyCard key={v.game} view={v} />)}
      </div>
      <p className="p1-note p5-ad-foot">Free daily games on bunnyverse.org, a new character every day.</p>
    </section>
  );
}

/** The module for this render, or null. A game whose read fails or that is not open hides its own card. */
export async function animeDailyHome(): Promise<React.ReactElement | null> {
  const open = ANIME_DAILY_GAMES.filter((id) => hubGameOpen(id));
  if (open.length === 0) return null;
  const db = createPublicReadClient();
  const settled = await Promise.allSettled(open.map(async (id) => animeDailyView(id, await readDay(db, id))));
  const views: AnimeDailyCardView[] = [];
  for (const r of settled) {
    if (r.status === 'fulfilled' && r.value) views.push(r.value);
    else if (r.status === 'rejected') console.error('[home] daily game hidden:', (r.reason as Error)?.message ?? r.reason);
  }
  return views.length > 0 ? <AnimeDailyModule views={views} /> : null;
}
