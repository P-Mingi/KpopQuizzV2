'use client';

// Bunnyverse Cards, lane U: the star on an owned card (the prototype's favorite button, outside the card, white). It reads and writes
// the player's favorites through the provider (POST /api/cards/favorite). Not drawn for a card the player does not own.
import { STAR_ICON } from './card-art';
import { useCards } from './cards-provider';

export function FavStar({ n, name, edition, className = '' }: { n: number; name: string; edition: string; className?: string }): React.ReactElement | null {
  const { owned, toggleFav } = useCards();
  const o = owned.get(n);
  if (!o) return null;
  const on = o.fav;
  const label = `${on ? 'Remove ' : 'Add '}${name}, ${edition}${on ? ' from favorites' : ' to favorites'}`;
  return (
    <button
      type="button" className={`star ${className}`.trim()} aria-pressed={on} aria-label={label}
      // The capture of the click stops here: a star never opens the card behind it.
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); void toggleFav(n); }}
    >
      {STAR_ICON}
    </button>
  );
}
