// The Collection card of the Bunnyverse passport (owner, 2026-11-22, the passport redesign): the same two numbers as the Collection section
// of kpopquiz.org /me (lib/cards-bridge/collection.ts readCollection, counted in the database), drawn as a card with a bar and the share
// complete. Server component, loaded only by loadCollectionHub; kpopquiz.org keeps components/cards-bridge/collection-section.tsx.
import { BINDER_PATH, cardsHref } from '@/lib/cards-bridge/links';
import { passportWords as ht } from '@/lib/site/hub/passport-page';

import type { Collection } from '@/lib/cards-bridge/collection';

const fmt = (n: number): string => n.toLocaleString('en-US');

/** The share owned, rounded down so it never reads 100% before the last card; 0 to 100. */
export function collectionPct(c: Collection): number {
  if (c.total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.floor((c.owned / c.total) * 100)));
}

export function hubCollectionCard(c: Collection): React.ReactElement {
  const pct = collectionPct(c);
  return (
    <section className="hub-pp-band hub-pp-coll" aria-labelledby="hub-pp-coll-h" data-testid="cards-collection">
      <div className="hub-pp-coll-in">
        <span aria-hidden="true" className="hub-pp-coll-fan"><span /><span /><span /></span>
        <div className="hub-pp-coll-text">
          <h2 id="hub-pp-coll-h" className="hub-pp-h2">{ht('collH')}</h2>
          <p className="hub-pp-coll-line"><span className="hub-pp-num">{ht('collLine', { owned: fmt(c.owned), total: fmt(c.total) })}</span></p>
          <span aria-hidden="true" className="hub-pp-bar hub-pp-bar-cards"><span style={{ '--pp-p': `${pct}%` } as React.CSSProperties} /></span>
          <p className="hub-pp-meta">{ht('collPct', { pct })}</p>
        </div>
        <a className="hub-pp-cta hub-pp-cta-solid" href={cardsHref(BINDER_PATH)}>
          {ht('collCta')}
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </a>
      </div>
    </section>
  );
}
