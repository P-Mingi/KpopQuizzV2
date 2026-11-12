'use client';

// Bunnyverse Cards, lane B, bridge 1: the "Your packs" block of the kpopquiz.org home. Client island: the home is cached, so the stack and the
// timer are read after hydration (GET /api/cards-bridge/me, cards_wallet). The server markup is the guest line; a signed-in fan with a wallet
// sees the stack of the database and the countdown to the next pack. Opening happens on Bunnyverse only.
import { useEffect, useState } from 'react';

import { cardsHref, CARDS_PATH } from '@/lib/cards-bridge/links';
import { countdownText, packsLine } from '@/lib/cards-bridge/copy';

import { useCardsMe } from './use-cards-me';

export function CardsHome(): React.ReactElement {
  const me = useCardsMe();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const w = me?.signedIn ? me.wallet : undefined;
  const href = cardsHref(CARDS_PATH);
  const next = w?.nextAt && now !== null ? countdownText(Date.parse(w.nextAt) - now) : null;
  return (
    <section className="cb-home" aria-labelledby="cb-home-h" data-testid="cards-home">
      <h2 id="cb-home-h">Your packs</h2>
      {w ? (
        <>
          <p className="cb-big">{packsLine(w.stock, w.cap)}</p>
          {next ? <p>Next pack in {next}.</p> : w.nextAt ? null : <p>Your stack is full.</p>}
          <p>At midnight Paris time the stack is topped up to {w.cap}.</p>
        </>
      ) : (
        <p>Open free card packs of your favorite idols on Bunnyverse. Sign in to keep your stack and your binder.</p>
      )}
      <a className="ux-btn ux-btn-primary" href={href}>{w ? 'Open packs on Bunnyverse' : 'See the cards on Bunnyverse'}</a>
    </section>
  );
}
