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

/**
 * The foot of a pocket: a band 30 px high under the card (point A1), never over its face. From the left: the New badge and the copies count,
 * then the SLOT (`slot`, an extra control; lane ECON's wishlist heart goes here under a missing card), then the star of an owned card.
 * Every control in the band keeps a 44 px hit area (the band is 30 px; the hit area overflows it, see .pw-foot in cards-ui.css).
 * `n`, `name` and `edition` are the card's, for the star's label.
 */
export function PocketFoot({ n, name, edition, isNew = false, copies = 1, slot = null }: { n: number; name: string; edition: string; isNew?: boolean; copies?: number; slot?: React.ReactNode }): React.ReactElement {
  return (
    <div className="pw-foot">
      <span className="pw-tags">
        {isNew ? <span className="newb">New</span> : null}
        {copies > 1 ? <span className="cnt" aria-hidden="true">&times;{copies}</span> : null}
      </span>
      <span className="pw-slot" data-slot="pocket-extra">{slot}</span>
      <FavStar n={n} name={name} edition={edition} />
    </div>
  );
}
