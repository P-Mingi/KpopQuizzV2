// Bunnyverse Cards, lane U: the card, its back and the small marks, ported from the approved prototype v4 (cardHTML, backHTML, the gem sprite).
// Server-safe: no hook, no state. The finishes (silver keyline, spotlight beams, holo film, era, gold foil, full art) are CSS, in
// styles/cards/cards-art.css, keyed by the classes ed-* and k-*. A card with a photo shows it as a cover crop at its focal point; a card
// without one (events, groups, an idol whose file is not uploaded yet) keeps the drawn figure.
import { EDITIONS } from '@/lib/cards/rules';
import { MASCOT_SRC } from '@/lib/cards/ui-logo';
import { eventShort, monogram, nameSize, paletteFor } from '@/lib/cards/ui-palette';

import type { Rarity } from '@/lib/cards/types';
import type { SlimCard } from '@/lib/cards/ui-types';

type Vars = React.CSSProperties & Record<`--${string}`, string | number>;

/** One rarity gem (a symbol of the sprite in CardsSprite). */
export function Gem({ r, className = 'gem' }: { r: Rarity; className?: string }): React.ReactElement {
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><use href={`#bvc-g-${r}`} /></svg>;
}

/** The symbols the pages use, drawn once per page. */
export function CardsSprite(): React.ReactElement {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        <symbol id="bvc-g-C" viewBox="0 0 24 24"><circle cx="12" cy="12" r="6.5" /></symbol>
        <symbol id="bvc-g-U" viewBox="0 0 24 24"><path d="M12 3.5l7.5 8.5-7.5 8.5L4.5 12z" /></symbol>
        <symbol id="bvc-g-R" viewBox="0 0 24 24"><path d="M12 2.5l2.8 6.7 6.7 2.8-6.7 2.8L12 21.5l-2.8-6.7L2.5 12l6.7-2.8z" /></symbol>
        <symbol id="bvc-g-SR" viewBox="0 0 24 24"><path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z" /></symbol>
        <symbol id="bvc-g-UR" viewBox="0 0 24 24"><path d="M3.5 18.5h17l-1.4-10-4.6 4.2L12 5.5l-2.5 7.2-4.6-4.2zM4 20h16v1.5H4z" /></symbol>
        <symbol id="bvc-g-L" viewBox="0 0 24 24"><path d="M10 2l1.9 6.1L18 10l-6.1 1.9L10 18l-1.9-6.1L2 10l6.1-1.9zM18.5 13.5l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z" /></symbol>
      </defs>
    </svg>
  );
}

const CROWD = [72, 86, 94, 86, 72];

function Art({ card }: { card: SlimCard }): React.ReactElement {
  if (card.kind === 'idol') {
    return (
      <>
        <i className="c-bg" />
        {card.img ? (
          // A plain img: the cover crop of the stored file, centred on its focal point (no image optimiser on this path).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="c-photo" src={card.img.src} srcSet={card.img.srcSet ?? undefined} sizes={card.img.srcSet ? '320px' : undefined} alt="" loading="lazy" decoding="async" draggable={false}
            style={{ objectPosition: `${card.fx}% ${card.fy}%` }}
          />
        ) : (
          <>
            <span className="c-mono">{monogram(card.name)}</span>
            <i className="c-fig" />
          </>
        )}
      </>
    );
  }
  if (card.kind === 'group') {
    const n = Math.min(5, Math.max(3, 4));
    return (
      <>
        <i className="c-bg" />
        <span className="c-mono">{monogram(card.name)}</span>
        <span className="c-crowd">{Array.from({ length: n }, (_, i) => <i key={i} style={{ '--h': `${CROWD[(i + (5 - n)) % 5]}%` } as Vars} />)}</span>
      </>
    );
  }
  return (
    <>
      <i className="c-bg" />
      <i className="c-beams" />
      <span className="c-screen">{eventShort(card.name)}</span>
      <i className="c-stagefloor" />
      <i className="c-sticks" />
      <i className="c-heads" />
    </>
  );
}

export function metaLine(card: SlimCard): string {
  if (card.kind === 'idol') return `${card.group ?? ''}${card.debutYear ? ` · ${card.debutYear}` : ''}`;
  if (card.kind === 'group') return `Debut ${card.debutYear ?? ''}`.trim();
  return `${card.sub ?? 'Event'}${card.debutYear ? ` · ${card.debutYear}` : ''}`;
}

/** The front of a card. */
export function CardFront({ card, className = '' }: { card: SlimCard; className?: string }): React.ReactElement {
  const p = paletteFor(card.entity);
  const ed = EDITIONS[card.rarity];
  return (
    <div className={`card r-${card.rarity} ed-${card.edition} k-${card.kind} ${className}`.trim()} style={{ '--a': p.a, '--b': p.b, '--c': p.c } as Vars}>
      <div className="c-in">
        <div className="c-art"><Art card={card} /><i className="c-foil" /></div>
        {card.kind === 'group' ? <span className="c-kind">Group</span> : card.kind === 'event' ? <span className="c-kind">Event</span> : null}
        <span className="c-ed">{ed.name}</span>
        <div className="c-plate">
          <b className="c-name" style={{ '--nf': `${nameSize(card.name)}cqi` } as Vars}>{card.name}</b>
          <div className="c-meta">
            <span>{metaLine(card)}</span>
            <span className={`c-gem rc-${card.rarity}`}>{card.num.slice(4)}<Gem r={card.rarity} className="" /></span>
          </div>
        </div>
        <i className="c-frame" /><i className="c-glare" />
      </div>
    </div>
  );
}

/** The back of every card: the rabbit of the three sites and the name. */
export function CardBack(): React.ReactElement {
  return (
    <div className="cback">
      <span className="bm">
        {/* The real mascot (public/mascot), not a redrawn emblem. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={MASCOT_SRC} alt="" width={128} height={128} />
      </span>
      <span className="bt">BUNNYVERSE</span>
    </div>
  );
}

export const LOCK_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
);
export const STAR_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.4l2.65 5.37 5.93.86-4.29 4.18 1.01 5.9L12 16.93l-5.3 2.79 1.01-5.9-4.29-4.18 5.93-.86z" /></svg>
);
