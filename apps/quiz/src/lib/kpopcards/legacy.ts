// KpopCards: the old browser interface (lib/cards/ui-api.ts CardsApi) implemented over the contract, so the components written for lots 3 and 4 (favorite, recycle,
// ad, demo, the opening of one pack) keep working on the same API object as the new screens.
import { newKey } from './registry';
import { isApiError } from './contract';

import type { CardsApi } from '../cards/ui-api';
import type { KpopCardsApi } from './contract';
import type { OpenResult } from '../cards/types';

const asErr = (e: { error: string }): { error: string } => ({ error: e.error });

export function legacyApi(kc: KpopCardsApi): CardsApi {
  return {
    async state() {
      const r = await kc.state();
      if (isApiError(r)) return r.error === 'unauthorized' ? null : asErr(r);
      return r;
    },
    async open(source) {
      const r = await kc.open({ key: newKey(), source: source === 'shards' ? 'shards' : 'stock', packs: 1 });
      if (isApiError(r)) return asErr(r);
      const p = r.packs[0]!;
      const out: OpenResult = { pack: { id: p.id, cards: p.cards.map((c) => ({ n: c.n, isNew: c.isNew, completesPair: c.completesPair })), newCount: p.newCount, packNo: p.packNo }, state: r.state };
      return out;
    },
    async adTicket() {
      const r = await kc.adTicket();
      return isApiError(r) ? asErr(r) : { ticket: r.ticket };
    },
    async adGrant(ticket) {
      const r = await kc.adGrant({ key: newKey(), ticket });
      return isApiError(r) ? asErr(r) : { gained: r.gained, shards: r.shards, state: r.state };
    },
    async recycle() {
      const r = await kc.recycle({ key: newKey(), confirm: true });
      return isApiError(r) ? asErr(r) : { recycled: r.recycled, shards: r.shards, state: r.state };
    },
    async favorite(n, on) {
      const r = await kc.favorite({ n, on });
      return !isApiError(r);
    },
    async demoDraw() {
      const r = await kc.demoDraw();
      return isApiError(r) ? asErr(r) : r;
    },
    async demoClaim(token, device) {
      const r = await kc.demoClaim({ token, device });
      return isApiError(r) ? asErr(r) : { added: r.added, state: r.state };
    },
  };
}
