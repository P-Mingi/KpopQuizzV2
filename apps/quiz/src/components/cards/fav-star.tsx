'use client';

// Bunnyverse Cards, lane U: the star on an owned card (the prototype's favorite button, outside the card, white). It reads and writes
// the player's favorites through the provider (POST /api/cards/favorite). Not drawn for a card the player does not own.
// Lot 3 point B1: the star, the copies badge and the New badge sit in the foot of the pocket, under the card, never over its face
// (the edition name and the card number stay readable).
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

/** The foot of a pocket: under the card, a row at least 44 px high holding the New badge, the copies badge and the star. */
export function PocketFoot({ n, name, edition, isNew = false, copies = 1 }: { n: number; name: string; edition: string; isNew?: boolean; copies?: number }): React.ReactElement {
  return (
    <div className="pw-foot">
      <span className="pw-tags">
        {isNew ? <span className="newb">New</span> : null}
        {copies > 1 ? <span className="cnt" aria-hidden="true">&times;{copies}</span> : null}
      </span>
      <FavStar n={n} name={name} edition={edition} />
    </div>
  );
}
