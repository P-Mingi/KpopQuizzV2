// P5 (CR-025), links 11 and 12: "The One Piece character of the day · Play" on the page of a series (board "Page de la série One Piece" of Passerelles.dc.html). An async server component, rendered only
// when lib/passerelles/series.ts says the game is open. It reads dle_day directly (a game that went off must hide its card, which unstable_cache would not do) and fails closed: no day, no card.
// No stylesheet import, no client code: its rules travel with it in one inline style tag. Only the number of the day reaches the markup, never an answer. The words come from the game's own columns.
import { UxButton } from '@/components/ux-v1/button';
import { gameCopy } from '@/lib/dle/copy';
import { dleGame } from '@/lib/dle/games';
import { readDay } from '@/lib/dle/read';
import { editorialHref } from '@/lib/network/links';
import { createPublicReadClient } from '@/lib/supabase/server';

import type { DleGameId } from '@/lib/dle/games';

/** The columns the card names, per game (the five the board names for One Piece; the same count for Dragon Ball). Their labels are read from the game's copy. */
export const SERIES_CARD_COLUMNS: Readonly<Partial<Record<DleGameId, readonly string[]>>> = {
  'otakudle-one-piece': ['affiliation', 'devil_fruit_type', 'haki', 'bounty', 'sea_of_origin'],
  'otakudle-dragon-ball': ['race', 'affiliation', 'home_planet', 'universe', 'debut_saga'],
};

const CSS = `
.p5-sd { position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: flex-start; gap: 12px; padding: 22px; border-radius: 22px; background: var(--ux-pink-soft); color: var(--ux-ink); }
.p5-sd-deco { position: absolute; right: -30px; top: -30px; width: 140px; height: 140px; transform: rotate(18deg); border-radius: 30px; border: 20px solid var(--ux-pink-line); pointer-events: none; }
.p5-sd-no { font-size: 13px; font-weight: 700; color: var(--ux-pink-soft-ink); }
.p5-sd h2 { font-size: 22px; line-height: 1.3; font-weight: 800; }
.p5-sd p { font-size: 15px; line-height: 1.5; color: var(--ux-ink); }
.p5-sd .ux-btn { min-height: 46px; }
@media (max-width: 760px) { .p5-sd { padding: 18px; } .p5-sd .ux-btn { width: 100%; } }
`;

export function SeriesDailyCardView({ game, gameNo }: { game: DleGameId; gameNo: number }): React.ReactElement {
  const g = dleGame(game);
  const w = gameCopy(game, 'en');
  const clues = (SERIES_CARD_COLUMNS[game] ?? Object.keys(w.columns).slice(0, 5)).map((k) => w.columns[k]?.label).filter((x): x is string => Boolean(x));
  return (
    <section className="p5-sd" aria-labelledby={`p5-sd-h-${game}`} data-game={game}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <span className="p5-sd-deco" aria-hidden="true" />
      <p className="p5-sd-no ux-num">{w.noLabel ?? g.brand}, no. {gameNo}</p>
      <h2 id={`p5-sd-h-${game}`}>The {g.guess.en}</h2>
      <p>{clues.join(' · ')}. A new character every day at 00:00 UTC, unlimited tries.</p>
      <UxButton href={editorialHref('hub', g.path)} size="lg">Play</UxButton>
    </section>
  );
}

export async function SeriesDailyCard({ game }: { game: DleGameId }): Promise<React.ReactElement | null> {
  try {
    const day = await readDay(createPublicReadClient(), game);
    if (!day || day.game !== game || !Number.isInteger(day.game_no) || day.game_no < 1) return null;
    return <SeriesDailyCardView game={game} gameNo={day.game_no} />;
  } catch (err) {
    console.error('[series] daily game card hidden:', (err as Error)?.message ?? err);
    return null;
  }
}
