'use client';

// KpopCards (lot 5): the lock on an owned card, next to its star in the card view. A locked card is never recycled (the server keeps every copy of it).
// The state is read from the collection call (the card's own row), written with POST /api/cards/lock.
import { useEffect, useState } from 'react';

import { isApiError } from '@/lib/kpopcards/contract';

import { LOCK_ICON } from './card-art';
import { useCards } from './cards-provider';

export function LockButton({ n, name, edition }: { n: number; name: string; edition: string }): React.ReactElement | null {
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
  const label = `${on ? 'Unlock' : 'Lock'} ${name}, ${edition}${on ? '' : '. A locked card is never recycled'}`;
  return (
    <button
      type="button" className="lockb" aria-pressed={on} aria-label={label} aria-busy={busy} id="d-lock"
      onClick={(e) => {
        e.preventDefault(); e.stopPropagation();
        if (busy) return;
        setBusy(true);
        void kc.lock({ n, on: !on }).then((r) => {
          setBusy(false);
          if (isApiError(r)) { toast('Could not change the lock. Try again.'); return; }
          setOn(r.locked);
          toast(r.locked ? `${name} is locked. It will not be recycled.` : `${name} is unlocked.`);
          void refresh();
        });
      }}
    >
      {LOCK_ICON}
    </button>
  );
}
