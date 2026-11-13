'use client';

// Bunnyverse Cards, lot 3 A14 (lane ECON): "Craft for N shards" in the page of a MISSING card. Disabled, with the reason written under it
// (and tied to the button for screen readers), when the player is short of shards; a Full Art says it cannot be crafted.
import { useId, useState } from 'react';

import { craftView } from '@/lib/cards/economy';
import { ECON_ERRORS, craftCard, isEconError } from '@/lib/cards/economy-api';
import { finishedLine } from '@/lib/cards/goals';
import { RARITY_LABEL } from '@/lib/cards/rules';

import { useCards } from './cards-provider';

import type { Rarity } from '@/lib/cards/types';

export function CraftButton({ n, rarity, name }: { n: number; rarity: Rarity; name: string }): React.ReactElement | null {
  const { state, status, owned, refresh, toast } = useCards();
  const [busy, setBusy] = useState(false);
  const note = useId();
  if (status !== 'ready' || !state || owned.has(n)) return null;
  const v = craftView(rarity, state.shards, false);
  const click = async (): Promise<void> => {
    if (busy || v.reason) return;
    setBusy(true);
    const r = await craftCard(n);
    if (isEconError(r)) toast(ECON_ERRORS[r.error] ?? ECON_ERRORS.failed!);
    else toast(`${name} is in your binder. ${r.card.cost} shards spent.${finishedLine(r.card.finished ?? []) ? ` ${finishedLine(r.card.finished ?? [])}.` : ''}`);
    await refresh();
    setBusy(false);
  };
  return (
    <div className="craft">
      <button type="button" className="btn-outline" disabled={busy || v.reason !== null} aria-describedby={v.reason ? note : undefined} onClick={() => void click()}>
        {v.cost === null ? `${RARITY_LABEL[rarity]} cards come from packs` : `Craft for ${v.cost} shards`}
      </button>
      {v.reason ? <p className="hint" id={note}>{v.reason}</p> : <p className="hint">You have {state.shards} shards.</p>}
    </div>
  );
}
