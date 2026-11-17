'use client';

// KpopCards lot 7: the panorama in the binder. Its pocket hangs in the row under the parts of its photo (as wide as its parts), a missing one is a
// named silhouette like a missing card (its number, its group, its edition, how many parts the player holds), an owned one opens a large view.
import Link from 'next/link';
import { createContext, useContext, useEffect, useRef } from 'react';

import { kcPath } from '@/lib/cards/kc-paths';
import { RARITY_LABEL } from '@/lib/cards/rules';

import { Gem, Ico, PanoFront } from './card-art';
import { useCards } from './cards-provider';
import { reduced, tilt } from './kc-tilt';

import type { SlimPano } from '@/lib/cards/ui-types';

/** What opening the large view does (set by the binder; a no-op elsewhere). */
export const PanoOpenContext = createContext<(p: SlimPano) => void>(() => undefined);

type Vars = React.CSSProperties & Record<`--${string}`, string | number>;

/** The parts of a panorama's photo the player holds. */
export function partsHeld(pano: SlimPano, owned: ReadonlyMap<number, unknown>): number {
  return pano.cards.filter((n) => owned.has(n)).length;
}

export function PanoPocket({ pano }: { pano: SlimPano }): React.ReactElement {
  const { panoOwned, owned } = useCards();
  const open = useContext(PanoOpenContext);
  const have = panoOwned.has(pano.p);
  const ed = RARITY_LABEL[pano.rarity];
  const held = partsHeld(pano, owned);
  const w = pano.parts;
  return (
    <>
      <div className={`pw pano-pw w${w}`} style={{ '--np': w } as Vars} data-pano={pano.p}>
        {have ? (
          <button type="button" className="pocket pano-pocket" onClick={() => open(pano)} aria-label={`${pano.name} panorama, ${ed}, ${pano.num}. Open it large.`}>
            <PanoFront pano={pano} />
          </button>
        ) : (
          <div className="pocket pano-pocket locked" role="img" aria-label={`${pano.name} panorama, ${ed}, missing. ${held} of ${w} parts.`}>
            <span className="miss">
              <span className="mno">{pano.num}</span>
              <span className={`mic gc-${pano.rarity}`}><Gem r={pano.rarity} className="" /></span>
              <span><span className="mnm">{pano.name}</span><span className="med">Panorama &middot; {ed}</span></span>
            </span>
          </div>
        )}
        <div className="pw-foot"><span className="pano-cap">{have ? <span className="ok">Panorama &middot; set complete</span> : <>Panorama &middot; <b>{held} of {w}</b> parts</>}</span></div>
      </div>
      {w < 3 ? <div className="pano-gap" style={{ gridColumn: `span ${3 - w}` }} aria-hidden="true" /> : null}
    </>
  );
}

/** The large view of an owned panorama: the card at the size of the screen, its facts, the parts it is made of, and the credit of the photo. */
export function PanoSheet({ pano, onClose }: { pano: SlimPano; onClose: () => void }): React.ReactElement {
  const { byN } = useCards();
  const closeRef = useRef<HTMLButtonElement>(null);
  const big = useRef<HTMLDivElement>(null);
  const ed = RARITY_LABEL[pano.rarity];
  useEffect(() => {
    closeRef.current?.focus();
    const key = (e: KeyboardEvent): void => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', key);
    const el = big.current?.querySelector<HTMLElement>('.card') ?? null;
    const off = tilt(el, 12, true);
    if (el && !reduced()) { el.classList.remove('sweep'); void el.offsetWidth; el.classList.add('sweep'); window.setTimeout(() => el.classList.remove('sweep'), 1000); }
    return () => { document.removeEventListener('keydown', key); off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pano.p]);
  return (
    <div className="dt" role="dialog" aria-modal="true" aria-label={`Panorama of ${pano.name}`} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pano-sheet">
        <button type="button" className="close" ref={closeRef} aria-label="Close" onClick={onClose}><Ico name="x" /></button>
        <h2>{pano.name} panorama</h2>
        <div className="pano-big" ref={big} style={{ '--np': pano.parts } as Vars}><PanoFront pano={pano} /></div>
        <div className="tags"><span className="tag"><Gem r={pano.rarity} className={`gem gc-${pano.rarity}`} />{ed}</span><span className="tag num">{pano.num}</span><span className="tag">{pano.parts} cards</span></div>
        <p className="d-sub">The whole photo, from the {pano.parts} cards you hold. It is yours for good, even if you recycle a copy of a part.</p>
        <div className="pano-parts-list" aria-label="The cards of this photo">
          {pano.cards.map((n, k) => { const c = byN.get(n); return c ? <Link key={n} href={kcPath.card(c.num)}>Part {k + 1}/{pano.parts} &middot; {c.num}</Link> : null; })}
        </div>
        {pano.credit ? <p className="credit" data-testid="pano-credit">{pano.credit}</p> : null}
      </div>
    </div>
  );
}
