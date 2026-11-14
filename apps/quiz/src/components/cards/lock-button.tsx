'use client';

// KpopCards (lot 5): the lock on an owned card, in the card view. A locked card is never recycled (the server keeps every copy of it).
// The prototype has no lock, so it sits under the editions, out of the sheet's top row (the close button and the star stay the prototype's two),
// drawn as the prototype's own on/off row (the Sound and Vibration rows of the avatar menu: a label of 62 px with a switch).
// The state is read from the collection call (the card's own row), written with POST /api/cards/lock.
import { useEffect, useState } from 'react';

import { isApiError } from '@/lib/kpopcards/contract';

import { useCards } from './cards-provider';

export function LockSwitch({ n, name }: { n: number; name: string }): React.ReactElement | null {
  const { kc, owned, toast, refresh } = useCards();
  const [on, setOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const has = owned.has(n);
  useEffect(() => {
    let live = true;
    setOn(null);
    if (!kc || !has) return undefined;
    void kc.collection({ q: name, show: 'owned', per: 120 }).then((r) => {
      if (!live || isApiError(r)) return;
      const it = r.items.find((x) => x.type === 'card' && x.n === n);
      setOn(it && it.type === 'card' ? it.locked : false);
    });
    return () => { live = false; };
  }, [kc, n, name, has]);
  if (!has || on === null || !kc) return null;
  const change = (next: boolean): void => {
    if (busy) return;
    setBusy(true);
    void kc.lock({ n, on: next }).then((r) => {
      setBusy(false);
      if (isApiError(r)) { toast('Could not change the lock. Try again.'); return; }
      setOn(r.locked);
      toast(r.locked ? `${name} is locked. It will not be recycled.` : `${name} is unlocked.`);
      void refresh();
    });
  };
  return (
    <label className="srow lockrow" htmlFor="d-lock">
      <span><b>Lock this card</b><small>{on ? 'Locked: Recycle extras keeps every copy of it.' : 'A locked card is never recycled.'}</small></span>
      <input type="checkbox" className="switch" role="switch" id="d-lock" checked={on} aria-busy={busy} onChange={(e) => change(e.target.checked)} />
    </label>
  );
}
