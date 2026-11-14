'use client';

// KpopCards (lot 5): the lock on an owned card, in the card view. A locked card is never recycled (the server keeps every copy of it).
// The prototype has no lock, so it is one more round button in the title row, next to the favorite star: 44 px, a padlock, pressed when
// the card is locked. Its name says what a press does ("Lock this card" / "Unlock this card"); aria-pressed carries the state.
// The state is read from the collection call (the card's own row), written with POST /api/cards/lock (the recycle and craft safeguards are the server's).
import { useEffect, useState } from 'react';

import { isApiError } from '@/lib/kpopcards/contract';

import { useCards } from './cards-provider';

const LOCKED = <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;
const OPEN = <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 7.6-1.7" /></svg>;

export function LockButton({ n, name }: { n: number; name: string }): React.ReactElement | null {
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
  if (!has || !kc) return null;
  const change = (): void => {
    if (busy || on === null) return;
    const next = !on;
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
    <button
      type="button" className="lockbtn" id="d-lock" aria-pressed={on === true} aria-busy={busy || on === null} disabled={on === null}
      aria-label={on ? 'Unlock this card' : 'Lock this card'} title={on ? 'Locked: Recycle extras keeps every copy of it' : 'A locked card is never recycled'}
      // The capture of the click stops here: a lock never flips the card behind it.
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); change(); }}
    >
      {on ? LOCKED : OPEN}
    </button>
  );
}
