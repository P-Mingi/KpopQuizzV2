// Bunnyverse Cards, lane B: "{Idol} cards" on a kpopquiz.org idol page (/verse/<group>/members/<idol>), loaded only by lib/cards-bridge/group.ts with the bridges
// on. Server component: one plain <a> to the hub's idol page through the signed-in jump, nofollow, with the real count of the idol's cards. No picture.
import { idolCardsCount, idolCardsLink } from '@/lib/cards-bridge/copy';
import { cardsHref } from '@/lib/cards-bridge/links';

import type { IdolCards } from '@/lib/cards-bridge/group';

export function cardsIdol(found: IdolCards): React.ReactElement {
  return (
    <section className="mb-6" aria-label={idolCardsLink(found.name)} data-testid="cards-idol">
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={cardsHref(`/kpopcards/idol/${found.slug}`)}
          rel="nofollow"
          className="verse-tile rounded-xl border border-default bg-surface px-4 py-3 text-sm font-semibold no-underline"
          style={{ color: 'var(--verse-ink)' }}
        >
          {idolCardsLink(found.name)}
        </a>
        <span className="text-xs text-tertiary">{idolCardsCount(found.count)}</span>
      </div>
    </section>
  );
}
