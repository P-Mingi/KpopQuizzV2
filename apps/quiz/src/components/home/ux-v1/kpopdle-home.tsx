// C2: the Kpopdle module of the kpopquiz.org home, loaded only by lib/ux-v1/p1/kpopdle-home.ts with NET_KPOPDLE_HOME on. A server component with no
// stylesheet import and no client code of its own: its rules travel with it in one inline style tag, so a page without the module carries none of them.
// Fail closed, in this order: the hub's dailyGuess switch, the hub's route map (never a link to a page answering 404), the game's own page, then
// dle_day (an error, dle_unavailable, or production without the dle tables throws, and the loader reads that as no module). dle_day is read directly, not through
// getDleDay: unstable_cache keeps serving its last answer when a refresh fails, which would keep the module up on a game that went off. The home's own ISR is the cache.
// It reads no token, so dle_day never gives a play or a target; only the game number and the count of wins reach the markup, never yesterday's answer.
import { SectionHeader } from '@/components/ux-v1/section-header';
import { UxButton } from '@/components/ux-v1/button';
import { formatCount } from '@/lib/dle/copy';
import { DAILY_PATH, dleGame } from '@/lib/dle/games';
import { readDay } from '@/lib/dle/read';
import { editorialHref } from '@/lib/network/links';
import { dailyGuessOn } from '@/lib/site/hub/daily-guess';
import { REGISTRY } from '@/lib/site/registry';
import { isKnownRouteFor } from '@/lib/site/routing';
import { createPublicReadClient } from '@/lib/supabase/server';

import type { DleDay } from '@/lib/dle/types';
import type { SiteFeatures } from '@/lib/site/types';

const GAME = 'kpopdle-idol';

/** The columns of a guess: the 8 rows of dle_attributes in 020-dle-kpop-idol.sql (a test compares them). dle_day does not send them. */
export const KPOPDLE_CLUES = 8;

export interface KpopdleHomeView {
  readonly gameNo: number;
  /** Today's wins. Null under dle_day's floor of 100 plays, and with no win yet. */
  readonly fansFound: number | null;
}

/** True when both links of the module lead to a page: the hub's switch is on, its route map has them, the game has its page. */
export function kpopdleHomeOpen(features: Readonly<SiteFeatures> = REGISTRY.hub.features): boolean {
  const game = dleGame(GAME);
  return dailyGuessOn(features) && game.built && [game.path, DAILY_PATH].every((p) => isKnownRouteFor('hub', p, { v1: true, v12: true }));
}

/** The only facts of dle_day the module keeps. Anything else in the answer stays out of the page. */
export function kpopdleHomeView(day: DleDay | null): KpopdleHomeView | null {
  if (!day || day.game !== GAME || !Number.isInteger(day.game_no) || day.game_no < 1) return null;
  const wins = day.stats?.wins;
  return { gameNo: day.game_no, fansFound: typeof wins === 'number' && wins > 0 ? wins : null };
}

/** The picture of a finished row of clues, as on the board: decoration, the same every day, it says nothing of the idol. */
const TILES = ['', 'n', 'o', '', 'o', '', '', 'n', '', '', '', ''] as const;
const TILE_CLASS = { '': 'p1-kd-t', n: 'p1-kd-t p1-kd-near', o: 'p1-kd-t p1-kd-off' } as const;

const CSS = `
.p1-kd-card { display: flex; align-items: center; gap: 20px; padding: 16px 20px 16px 16px; border: 1px solid var(--ux-line); border-radius: 20px; background: var(--ux-raised); color: var(--ux-ink); }
.p1-kd-tiles { flex: none; display: grid; grid-template-columns: repeat(4, 16px); gap: 4px; padding: 12px; border-radius: 16px; background: var(--ux-pink-soft); }
.p1-kd-t { display: block; width: 16px; height: 16px; border-radius: 4px; background: var(--ux-ok); }
.p1-kd-near { background: repeating-linear-gradient(135deg, var(--ux-close-2) 0 3px, var(--ux-close) 3px 6px); }
.p1-kd-off { background: var(--ux-no); }
.p1-kd-main { flex: 1; min-width: 0; }
.p1-kd-no { font-size: 13px; font-weight: 600; line-height: 1.6; color: var(--ux-pink-ink); }
.p1-kd-main h3 { font-size: 20px; line-height: 1.3; font-weight: 700; letter-spacing: -0.01em; margin-top: 2px; }
.p1-kd-line { font-size: 14px; line-height: 1.6; color: var(--ux-muted); margin-top: 4px; }
.p1-kd-go { flex: 0 0 auto; height: 44px; justify-content: center; }
.p1-kd-go svg { width: 14px; height: 14px; }
.p1-kd-foot { margin-top: 12px; }
@media (max-width: 760px) {
  /* The same stack as the Daily games cards of OtakuQuiz (anime-daily-home.tsx): tiles, text, then the full-width button. */
  .p1-kd-card { flex-direction: column; align-items: flex-start; gap: 14px; padding: 18px; }
  .p1-kd-main { flex: 1 1 auto; width: 100%; }
  .p1-kd-go { width: 100%; box-sizing: border-box; }
}
`;

export function KpopdleHomeCard({ view }: { view: KpopdleHomeView }): React.ReactElement {
  const facts = [
    `${KPOPDLE_CLUES} clues per guess`,
    'unlimited tries',
    view.fansFound === null ? null : `${formatCount(view.fansFound, 'en')} ${view.fansFound === 1 ? 'fan' : 'fans'} found it`,
    'new idol at 00:00 UTC',
  ].filter((x): x is string => x !== null);

  return (
    <section className="ux-sec ux-sec-lg" aria-labelledby="p1-kd-h">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <SectionHeader id="p1-kd-h" icon="grid" title="Daily game" action={{ href: editorialHref('hub', DAILY_PATH), label: 'All daily games' }} />
      <div className="p1-kd-card">
        <span className="p1-kd-tiles" aria-hidden="true">
          {TILES.map((t, i) => <span key={i} className={TILE_CLASS[t]} />)}
        </span>
        <div className="p1-kd-main">
          <p className="p1-kd-no ux-num">Kpopdle · Idol no. {view.gameNo}</p>
          <h3>Guess today&apos;s K-pop idol</h3>
          <p className="p1-kd-line ux-num">{facts.join(' · ')}</p>
        </div>
        <UxButton href={editorialHref('hub', dleGame(GAME).path)} className="p1-kd-go">
          Play Kpopdle
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>
        </UxButton>
      </div>
      <p className="p1-note p1-kd-foot">A free daily game on bunnyverse.org, our sister site.</p>
    </section>
  );
}

/** The module for this render, or null. A failed read throws to the loader. */
export async function kpopdleHome(): Promise<React.ReactElement | null> {
  if (!kpopdleHomeOpen()) return null;
  const view = kpopdleHomeView(await readDay(createPublicReadClient(), GAME));
  return view ? <KpopdleHomeCard view={view} /> : null;
}
