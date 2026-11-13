'use client';

// Bunnyverse Cards, lot 3 A17 (lane ECON): the focus pack. Once a Paris day a pack of the stack can be opened for a group the player picks:
// its 2nd and 4th cards come from that group. The picker lists the groups of the catalog; the pack is opened through POST /api/cards/open with
// { source: 'stock', focus }. `onResult` gets the pack like any other opening.
import { useId, useMemo, useState } from 'react';

import { focusGroups } from '@/lib/cards/economy';
import { ECON_ERRORS, isEconError, openFocus } from '@/lib/cards/economy-api';

import { useCards } from './cards-provider';

import type { OpenResult } from '@/lib/cards/types';

export function FocusPicker({ onResult, busy: outerBusy = false }: { onResult: (r: OpenResult) => void; busy?: boolean }): React.ReactElement | null {
  const { state, status, catalog, toast } = useCards();
  const [group, setGroup] = useState('');
  const [busy, setBusy] = useState(false);
  const id = useId();
  const groups = useMemo(() => focusGroups(catalog.cards), [catalog.cards]);
  if (status !== 'ready' || !state || groups.length === 0) return null;
  const used = state.focusUsed === true;
  const empty = state.stock <= 0;
  const reason = used ? 'Today’s focus pack is opened. Another one is ready after midnight, Paris time.' : empty ? 'You need a pack in your stack.' : null;
  const go = async (): Promise<void> => {
    if (!group) { toast(ECON_ERRORS.bad_request!); return; }
    setBusy(true);
    const r = await openFocus(group);
    setBusy(false);
    if (isEconError(r)) toast(ECON_ERRORS[r.error] ?? ECON_ERRORS.failed!);
    else onResult(r);
  };
  return (
    <div className="focus-picker">
      <h2 className="h2">Focus pack</h2>
      <p className="hint">Once a day, pick a group. The 2nd and 4th cards of the pack come from it.</p>
      <label className="focus-label" htmlFor={id}>Group</label>
      <div className="focus-row">
        <select id={id} className="focus-select" value={group} onChange={(e) => setGroup(e.target.value)} disabled={used || busy || outerBusy} aria-describedby={reason ? `${id}-why` : undefined}>
          <option value="">Pick a group</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <button type="button" className="btn-outline sm" onClick={() => void go()} disabled={used || empty || busy || outerBusy || !group}>Open</button>
      </div>
      {reason ? <p className="hint" id={`${id}-why`}>{reason}</p> : null}
    </div>
  );
}
