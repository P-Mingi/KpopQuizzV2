// Bunnyverse Cards, lane B, bridge 4: the "Collection" section of the passports. Server component, loaded only by lib/cards-bridge/collection.ts.
import { collectionLine } from '@/lib/cards-bridge/copy';
import { BINDER_PATH, cardsHref } from '@/lib/cards-bridge/links';

import { CARDS_BRIDGE_CSS } from './styles';

import type { Collection } from '@/lib/cards-bridge/collection';

export function collectionSection(c: Collection): React.ReactElement {
  return (
    <section className="cb-group" aria-labelledby="cb-coll-h" data-testid="cards-collection" style={{ maxWidth: 520, margin: '18px auto 0' }}>
      <style dangerouslySetInnerHTML={{ __html: CARDS_BRIDGE_CSS }} />
      <h2 id="cb-coll-h">Collection</h2>
      <p>{collectionLine(c.owned, c.total)}</p>
      <div className="cb-links"><a className="ux-lnk" href={cardsHref(BINDER_PATH)}>Open your binder on Bunnyverse</a></div>
    </section>
  );
}
