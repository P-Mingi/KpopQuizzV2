// C2: the Kpopdle module of the kpopquiz.org home, loaded only by lib/ux-v1/p1/kpopdle-home.ts with NET_KPOPDLE_HOME on. A server component with no
// stylesheet import and no client code of its own: its rules travel with it in one inline style tag, so a page without the module carries none of them.
// Fail closed, in this order: the hub's dailyGuess switch, the hub's route map (never a link to a page answering 404), the game's own page, then
// dle_day (an error, dle_unavailable, or production without the dle tables throws, and the loader reads that as no module). dle_day is read directly, not through
// getDleDay: unstable_cache keeps serving its last answer when a refresh fails, which would keep the module up on a game that went off. The home's own ISR is the cache.
// It reads no token, so dle_day never gives a play or a target; only the game number and the count of wins reach the markup, never yesterday's answer.
import { GameMark, firstSavedIcon } from '@/components/photos/game-mark';
import { Icon } from '@/components/ux-v1/icon';
import { UxButton } from '@/components/ux-v1/button';
import { formatCount } from '@/lib/dle/copy';
import { DAILY_PATH, dleGame } from '@/lib/dle/games';
import { readDay } from '@/lib/dle/read';
import { editorialHref } from '@/lib/network/links';
import { GAME_ICON_BOX_STYLE, loadGameIcons } from '@/lib/photos/game-icons';
import { getLiveIcons } from '@/lib/photos/icons-read';
import { HOME_TODAY_ICON } from '@/lib/photos/slots';
import { dailyGuessOn } from '@/lib/site/hub/daily-guess';
import { REGISTRY } from '@/lib/site/registry';
import { isKnownRouteFor } from '@/lib/site/routing';
import { createPublicReadClient } from '@/lib/supabase/server';

import type { DleDay } from '@/lib/dle/types';
import type { GameIcon } from '@/lib/photos/game-icons';
import type { LiveIcon } from '@/lib/photos/icons-read';
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

// Owner, 2026-11-23: "Put the daily game and daily quiz side by side". The module is one card, the twin of the quiz of the day row (qotd-row.tsx):
// a pink label (the h2 "Daily game") with the game number beside it, the title, one line of facts, then the actions at the foot of the card. ux-home.tsx
// sets it next to the quiz of the day (p1-today in styles/ux-v1/p1.css); alone, it takes the full width with the same layout.
const CSS = `
.p1-kd { height: 100%; container: p1kd / inline-size; }
.p1-kd-card { position: relative; box-sizing: border-box; display: flex; align-items: flex-start; gap: 20px; height: 100%; padding: 22px 24px; border: 1px solid var(--ux-line); border-radius: 20px; background: var(--ux-raised); color: var(--ux-ink); transition: border-color .15s; }
.p1-kd-card:has(.p1-kd-go:hover) { border-color: var(--ux-pink-ink); }
.p1-kd-tiles { flex: none; display: grid; grid-template-columns: repeat(4, 16px); gap: 4px; padding: 12px; border-radius: 16px; background: var(--ux-pink-soft); }
.p1-kd-t { display: block; width: 16px; height: 16px; border-radius: 4px; background: var(--ux-ok); }
.p1-kd-near { background: repeating-linear-gradient(135deg, var(--ux-close-2) 0 3px, var(--ux-close) 3px 6px); }
.p1-kd-off { background: var(--ux-no); }
.p1-kd-mark { flex: none; display: grid; width: 96px; height: 96px; }
.p1-kd-main { flex: 1; min-width: 0; align-self: stretch; display: flex; flex-direction: column; }
.p1-kd-head { display: flex; align-items: center; gap: 4px 12px; flex-wrap: wrap; }
.p1-kd-head h2 { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; line-height: 1.6; letter-spacing: 0; color: var(--ux-pink-ink); }
.p1-kd-head h2 .ux-ico { width: 14px; height: 14px; }
.p1-kd-no { font-size: 13px; line-height: 1.6; color: var(--ux-muted); }
.p1-kd-main h3 { font-size: 20px; line-height: 1.3; font-weight: 700; letter-spacing: -0.015em; margin-top: 6px; }
.p1-kd-line { font-size: 14px; line-height: 1.6; color: var(--ux-muted); margin-top: 4px; }
.p1-kd-foot { margin-top: 2px; }
.p1-kd-acts { display: flex; align-items: center; gap: 8px 20px; flex-wrap: wrap; margin-top: auto; padding-top: 16px; }
.p1-kd-go { flex: 0 0 auto; height: 44px; justify-content: center; }
.p1-kd-go svg { width: 14px; height: 14px; }
.p1-kd-acts .ux-lnk { font-size: 14px; }
/* Next to the quiz of the day on a mid-size screen the card is narrow: the picture goes above the text, as on a phone. */
@container p1kd (max-width: 440px) {
  .p1-kd-card { flex-direction: column; gap: 14px; }
  .p1-kd-main { width: 100%; }
}
@media (max-width: 560px) {
  /* The same stack as the Daily games cards of OtakuQuiz (anime-daily-home.tsx): tiles, text, then the full-width button. */
  .p1-kd-card { flex-direction: column; align-items: flex-start; gap: 14px; padding: 18px; }
  .p1-kd-main { width: 100%; }
  .p1-kd-go { width: 100%; box-sizing: border-box; }
}
`;

/**
 * The picture of the card, in this order (owner, 2026-11-23: "je le veux ici", the admin's Icônes du jeu, Accueil, jeux du jour, Kpopdle):
 * `mark`, the icon the owner saved for the game: the slot of its switch on the game page (k-idol), else the slot of the Kpopdle card of the bunnyverse.org
 * home (lib/photos/icons-read.ts); drawn plain and large, with no frame (owner, 2026-11-25); else `icon`, the picture of Bannières et images, "Icône de la carte Kpopdle" (o1/adminpics); else the grid of
 * squares, as before. A slot with nothing saved changes nothing.
 */
export function KpopdleHomeCard({ view, icon, mark }: { view: KpopdleHomeView; icon?: GameIcon | undefined; mark?: LiveIcon | undefined }): React.ReactElement {
  const facts = [
    `${KPOPDLE_CLUES} clues per guess`,
    'unlimited tries',
    view.fansFound === null ? null : `${formatCount(view.fansFound, 'en')} ${view.fansFound === 1 ? 'fan' : 'fans'} found it`,
    'new idol at 00:00 UTC',
  ].filter((x): x is string => x !== null);

  return (
    <section className="p1-kd" aria-labelledby="p1-kd-h">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="p1-kd-card">
        {mark ? (
          <span className="p1-kd-mark" aria-hidden="true">
            <GameMark icon={mark} size={96} slot={mark.id} />
          </span>
        ) : (
          <span className="p1-kd-tiles" aria-hidden="true" {...(icon ? { style: GAME_ICON_BOX_STYLE } : {})}>
            {icon ? (
              // The owner's icon: a fixed WebP of the bucket, so a plain img (no image optimiser), the size and rounding of the grid it replaces.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={icon.src} alt="" width={100} height={80} loading="lazy" decoding="async" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', objectPosition: icon.position }} />
            ) : TILES.map((t, i) => <span key={i} className={TILE_CLASS[t]} />)}
          </span>
        )}
        <div className="p1-kd-main">
          <div className="p1-kd-head">
            <h2 id="p1-kd-h"><Icon name="grid" />Daily game</h2>
            <span className="p1-kd-no ux-num">Kpopdle · Idol no. {view.gameNo}</span>
          </div>
          <h3>Guess today&apos;s K-pop idol</h3>
          <p className="p1-kd-line ux-num">{facts.join(' · ')}</p>
          <p className="p1-note p1-kd-foot">A free daily game on bunnyverse.org, our sister site.</p>
          <div className="p1-kd-acts">
            <UxButton href={editorialHref('hub', dleGame(GAME).path)} className="p1-kd-go">
              Play Kpopdle
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>
            </UxButton>
            <a href={editorialHref('hub', DAILY_PATH)} className="ux-lnk">All daily games</a>
          </div>
        </div>
      </div>
    </section>
  );
}

/** The module for this render, or null. A failed read throws to the loader. */
export async function kpopdleHome(): Promise<React.ReactElement | null> {
  if (!kpopdleHomeOpen()) return null;
  const view = kpopdleHomeView(await readDay(createPublicReadClient(), GAME));
  if (!view) return null;
  const [icons, mark] = await Promise.all([loadGameIcons(), savedMark()]);
  return <KpopdleHomeCard view={view} icon={icons[GAME]} mark={mark} />;
}

/** The Kpopdle icon the owner saved in the Icônes du jeu (a live row of k-idol, else of the home slot), or undefined: the defaults of the slot never replace the card's picture. */
async function savedMark(): Promise<LiveIcon | undefined> {
  try {
    return firstSavedIcon(await getLiveIcons(), 'k-idol', HOME_TODAY_ICON.kpopdle) ?? undefined;
  } catch {
    return undefined;
  }
}
