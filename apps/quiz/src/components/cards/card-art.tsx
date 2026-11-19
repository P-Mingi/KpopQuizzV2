// Bunnyverse Cards, lane U: the card, its back and the small marks, ported from the approved prototype v4 (cardHTML, backHTML, the gem sprite).
// Server-safe: no hook, no state. The finishes (silver keyline, spotlight beams, holo film, era, gold foil, full art) are CSS, in
// styles/cards/cards-art.css, keyed by the classes ed-* and k-*. A card with a photo (an idol or a group) shows it as a cover crop at its
// focal point; a card without one (an event, a subject whose photo is not readable) keeps the drawn figure.
import { RARITY_LABEL } from '@/lib/cards/rules';
import { withBasePath } from '@/lib/site/base-path';
import { MASCOT_PATH } from '@/lib/cards/ui-logo';
import { SOLOIST } from '@/lib/cards/ui-model';
import { eventShort, monogram, nameSize, paletteFor } from '@/lib/cards/ui-palette';

import type { Rarity } from '@/lib/cards/types';
import type { SlimCard, SlimPano } from '@/lib/cards/ui-types';

type Vars = React.CSSProperties & Record<`--${string}`, string | number>;

/** One rarity gem (a symbol of the sprite in CardsSprite). */
export function Gem({ r, className = 'gem' }: { r: Rarity; className?: string }): React.ReactElement {
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><use href={`#bvc-g-${r}`} /></svg>;
}

/** One icon of the sprite (the prototype's `ico(id)`): `name` is the prototype id without its prefix ("pack", "check"...). */
export function Ico({ name, className = 'ico' }: { name: string; className?: string }): React.ReactElement {
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><use href={`#bvc-i-${name}`} /></svg>;
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
        {/* the icons of the v6 prototype, ids prefixed bvc-i- */}
        <symbol id="bvc-i-pack" viewBox="0 0 24 24"><path d="M7 3h10l1 3v13l-1 2H7l-1-2V6z" /><path d="M6 7h12M6 17h12" /></symbol>
        <symbol id="bvc-i-binder" viewBox="0 0 24 24"><path d="M5 4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z" /><path d="M5 7h2M5 12h2M5 17h2M10 8h6M10 12h6" /></symbol>
        <symbol id="bvc-i-goals" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r=".9" /></symbol>
        <symbol id="bvc-i-help" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M9.6 9.4a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.1-2.4 3.7M12 17.2v.3" /></symbol>
        <symbol id="bvc-i-sound" viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></symbol>
        <symbol id="bvc-i-filter" viewBox="0 0 24 24"><path d="M4 6.5h16M7 12h10M10 17.5h4" /></symbol>
        <symbol id="bvc-i-check" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></symbol>
        <symbol id="bvc-i-heart" viewBox="0 0 24 24"><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20z" /></symbol>
        <symbol id="bvc-i-x" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></symbol>
        <symbol id="bvc-i-craft" viewBox="0 0 24 24"><path d="M4 20L14 10" /><path d="M15.5 3.5v3M19.5 5l-2 2M20.5 9.5h-3M12.5 5l1.5 1.5" /></symbol>
        <symbol id="bvc-i-camera" viewBox="0 0 24 24"><path d="M4 8h3l1.5-2h7L17 8h3v11H4z" /><circle cx="12" cy="13.2" r="3.4" /></symbol>
        <symbol id="bvc-i-trophy" viewBox="0 0 24 24"><path d="M8 4h8v5a4 4 0 0 1-8 0z" /><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4" /></symbol>
      </defs>
    </svg>
  );
}

const CROWD = [72, 86, 94, 86, 72];

/** The photo of a card: a plain img, the cover crop of the stored file centred on its focal point (no image optimiser on this path). */
function Photo({ card, img }: { card: SlimCard; img: NonNullable<SlimCard['img']> }): React.ReactElement {
  const el = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="c-photo" src={img.src} srcSet={img.srcSet ?? undefined} sizes={img.srcSet ? '320px' : undefined} alt="" loading="lazy" decoding="async" draggable={false}
      style={{ objectPosition: `${card.fx}% ${card.fy}%` }}
    />
  );
  // Lot 2: a half of a group photo from the source photo (no cut file yet): the 11:8.5 window of the pair is a box twice as wide as the
  // card, cover-cropped at the focal point; half 1 shows its left side (offset 0), half 2 its right side (offset -100%). A cut half is its
  // own file and shows as is.
  // Lot 7: a photo in 3 cards has a window three cards wide (16.5:8.5); the third part shows its right side (offset -200%).
  if ((card.part === 1 || card.part === 2 || card.part === 3) && !img.cut) return <span className={`c-pair c-half${card.part}${card.parts === 3 ? ' c-p3' : ''}`} data-part={card.part}>{el}</span>;
  return el;
}

function Art({ card }: { card: SlimCard }): React.ReactElement {
  // Owner decision 2026-11-18: a card the player owns whose photo left shows its number, edition and name on this frame, no image, until a new photo comes.
  if (card.soon) {
    return (
      <>
        <i className="c-bg" />
        <span className="c-soon" data-soon="true">
          <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#bvc-i-camera" /></svg>
          <b>New photo</b>
          <b>coming</b>
        </span>
      </>
    );
  }
  if (card.kind === 'idol') {
    return (
      <>
        <i className="c-bg" />
        {card.img ? <Photo card={card} img={card.img} /> : (
          <>
            <span className="c-mono">{monogram(card.name)}</span>
            <i className="c-fig" />
          </>
        )}
      </>
    );
  }
  if (card.kind === 'group') {
    // Review 1 finding 4: a group card shows its photo like an idol card; the drawn crowd is only the fallback without one.
    if (card.img) {
      return (
        <>
          <i className="c-bg" />
          <Photo card={card} img={card.img} />
        </>
      );
    }
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
  if (card.kind === 'idol') return `${card.group ?? SOLOIST}${card.debutYear ? ` · ${card.debutYear}` : ''}`;
  // Lot 2 (owner decision 2026-11-12): a disbanded group kept in the game says so, with the year it disbanded. The debut year stays on the
  // card page: both do not fit the card's meta line (the year would be cut).
  if (card.kind === 'group' && card.endYear) return `Disbanded ${card.endYear}`;
  if (card.kind === 'group') return card.debutYear ? `Debut ${card.debutYear}` : 'Group';
  return `${card.sub ?? 'Event'}${card.debutYear ? ` · ${card.debutYear}` : ''}`;
}

/** The kind tag of a group or event card: a half of a group photo says which half of the pair it is ("Group · 1/2"). */
export function kindTag(card: Pick<SlimCard, 'kind' | 'part' | 'parts'>): string | null {
  if (card.kind === 'group') return card.part === 1 || card.part === 2 || card.part === 3 ? `Group · ${card.part}/${card.parts ?? 2}` : 'Group';
  return card.kind === 'event' ? 'Event' : null;
}

/** The chip of a card's kind, as the prototype draws it: "Group 1/2", the word going away on a card under 150 px (the container query keeps "1/2"). */
function KindChip({ card }: { card: Pick<SlimCard, 'kind' | 'part' | 'parts'> }): React.ReactElement | null {
  if (card.kind === 'group') {
    const half = card.part === 1 || card.part === 2 || card.part === 3;
    return <span className="c-kind"><span className="kw">Group{half ? ' ' : ''}</span>{half ? <span className="kh">{card.part}/{card.parts ?? 2}</span> : null}</span>;
  }
  return card.kind === 'event' ? <span className="c-kind">Event</span> : null;
}

/** The front of a card: the markup of the prototype's cardHTML (the rim of a Full Art, the rarity line under the name, the sheen and the glare). */
export function CardFront({ card, className = '' }: { card: SlimCard; className?: string }): React.ReactElement {
  const p = paletteFor(card.entity);
  const half = card.part === 1 || card.part === 2 || card.part === 3;
  return (
    <div className={`card r-${card.rarity} ed-${card.edition} k-${card.kind}${half ? ` h${card.part} half half-${card.part}${card.parts === 3 ? ' p3' : ''}` : ''} ${className}`.trim()} style={{ '--a': p.a, '--b': p.b, '--c': p.c } as Vars}>
      <div className="c-in">
        {card.edition === 'full' ? <i className="c-rim" /> : null}
        <div className="c-art"><Art card={card} /><i className="c-foil" /></div>
        <KindChip card={card} />
        <div className="c-plate">
          <b className="c-name" style={{ '--nf': `${nameSize(card.name)}cqi` } as Vars}>{card.name}</b>
          {/* The one place the edition is named on a card, under the name, in the edition's own colour (v6: the Full Art line adds its rate). */}
          <div className={`c-rar rc-${card.rarity}`}><Gem r={card.rarity} className="" /><span>{RARITY_LABEL[card.rarity]}</span>{card.rarity === 'L' && card.rate ? <em>{card.rate}</em> : null}</div>
          <div className="c-meta">
            <span>{metaLine(card)}</span>
            <span className="c-no">{card.num.slice(4)}</span>
          </div>
        </div>
        <i className="c-frame" /><i className="c-sheen" /><i className="c-glare" />
      </div>
    </div>
  );
}

/** The back of every card: the rabbit of Bunnyverse and the name of the game. */
export function CardBack(): React.ReactElement {
  return (
    <div className="cback">
      <span className="bm">
        {/* The real mascot (public/mascot), not a redrawn emblem. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={withBasePath(MASCOT_PATH)} alt="" width={128} height={128} />
      </span>
      <span className="bt">KPOPCARDS</span>
    </div>
  );
}

export const LOCK_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
);
export const STAR_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.4l2.65 5.37 5.93.86-4.29 4.18 1.01 5.9L12 16.93l-5.3 2.79 1.01-5.9-4.29-4.18 5.93-.86z" /></svg>
);

/** Lot 7: the picture of a panorama: its own file (the whole window), the parts' files side by side, or the source photo cropped in CSS to the window. */
function PanoPhoto({ pano }: { pano: SlimPano }): React.ReactElement | null {
  const img = pano.img;
  if (!img) return null;
  if (img.kind === 'parts') {
    return (
      <span className="c-strip">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {img.parts.map((u, k) => <img key={k} className="c-photo" src={u} alt="" loading="lazy" decoding="async" draggable={false} />)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="c-photo" src={img.src} srcSet={img.srcSet ?? undefined} sizes={img.srcSet ? `${pano.parts * 320}px` : undefined} alt="" loading="lazy" decoding="async" draggable={false}
      style={img.kind === 'source' ? { objectPosition: `${pano.fx}% ${pano.fy}%` } : undefined}
    />
  );
}

/** The meta line of a panorama: the group's years, as the group cards print them. */
export function panoMeta(pano: Pick<SlimPano, 'debutYear' | 'endYear'>): string {
  if (pano.endYear) return `Disbanded ${pano.endYear}`;
  return pano.debutYear ? `Debut ${pano.debutYear}` : 'Group';
}

/**
 * Lot 7: the front of a panorama, the landscape card of a complete group photo, in the frame of the v6 card: its edition's finish, its P number,
 * the group's name, the rarity line, the credit on its page. It is the window of the photo (11:8.5 or 16.5:8.5), the parts' frame kept at the
 * size of ONE part (every size in the CSS is a share of the card width divided by the number of parts).
 */
export function PanoFront({ pano, className = '' }: { pano: SlimPano; className?: string }): React.ReactElement {
  const p = paletteFor(pano.entity);
  const r = pano.rarity;
  return (
    <div className={`card pano pano-${pano.parts} r-${r} ed-${pano.edition} k-group ${className}`.trim()} style={{ '--a': p.a, '--b': p.b, '--c': p.c } as Vars} data-pano={pano.p}>
      <div className="c-in">
        {pano.edition === 'full' ? <i className="c-rim" /> : null}
        <div className="c-art"><i className="c-bg" /><PanoPhoto pano={pano} /><i className="c-foil" /></div>
        <span className="c-kind"><span className="kw">Panorama</span></span>
        <div className="c-plate">
          <b className="c-name" style={{ '--nf': `${nameSize(pano.name)}cqi` } as Vars}>{pano.name}</b>
          <div className={`c-rar rc-${r}`}><Gem r={r} className="" /><span>{RARITY_LABEL[r]}</span></div>
          <div className="c-meta">
            <span>{panoMeta(pano)}</span>
            <span className="c-no">{pano.num}</span>
          </div>
        </div>
        <i className="c-frame" /><i className="c-sheen" /><i className="c-glare" />
      </div>
    </div>
  );
}
