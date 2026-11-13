'use client';

// Bunnyverse Cards, lot 3 A17 (lane ECON): the heart under a MISSING card: add it to the wishlist or take it off (at most 50). Its own
// component so the binder band under each card can place it: <WishHeart n={card.n} name={card.name} edition={edition} />. Drawn only for a
// signed-in player who does not own the card. The 44 px target is the button; the heart is the icon.
import { useState } from 'react';

import { ECON_ERRORS, isEconError, wishCard } from '@/lib/cards/economy-api';

import { useCards } from './cards-provider';

const HEART = (
  <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-8-4.800-8-10.300A4.500 4.500 0 0 1 12 7.200a4.500 4.500 0 0 1 8 2.500C20 15.200 12 20 12 20z" /></svg>
);

export function WishHeart({ n, name, edition, className = '' }: { n: number; name: string; edition: string; className?: string }): React.ReactElement | null {
  const { state, status, owned, refresh, toast } = useCards();
  const [busy, setBusy] = useState(false);
  if (status !== 'ready' || !state || owned.has(n)) return null;
  const on = (state.wishlist ?? []).includes(n);
  const label = `${on ? 'Remove ' : 'Add '}${name}, ${edition}${on ? ' from your wishlist' : ' to your wishlist'}`;
  const click = async (e: React.MouseEvent): Promise<void> => {
    // A heart never opens the card behind it.
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const r = await wishCard(n, !on);
    if (isEconError(r)) toast(ECON_ERRORS[r.error] ?? ECON_ERRORS.failed!);
    else await refresh();
    setBusy(false);
  };
  return (
    <button type="button" className={`wish ${className}`.trim()} aria-pressed={on} aria-label={label} aria-busy={busy} onClick={(e) => void click(e)}>
      {HEART}
    </button>
  );
}
