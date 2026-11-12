'use client';

// Bunnyverse Cards, lane B, bridge 4: the "Binder" link of the account menu (kpopquiz.org through the signed-in jump, the hub directly).
// Rendered through the `accountExtra` slot of UxNavActions, only with NEXT_PUBLIC_NET_CARDS_BRIDGES on.
import { Icon } from '@/components/ux-v1/icon';
import { BINDER_PATH, cardsHref } from '@/lib/cards-bridge/links';

export function CardsMenuLink({ close }: { close: () => void }): React.ReactElement {
  return (
    <a className="ux-mi" href={cardsHref(BINDER_PATH)} onClick={close}><Icon name="grid" />Binder</a>
  );
}
