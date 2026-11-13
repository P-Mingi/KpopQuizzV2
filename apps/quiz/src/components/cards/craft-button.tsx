'use client';

// Bunnyverse Cards, lot 3 A14 (lane ECON): "Craft for N shards" in the page of a MISSING card. Disabled, with the reason written under it
// (and tied to the button for screen readers), when the player is short of shards; a Full Art says it cannot be crafted.
import { useId, useState } from 'react';

import { craftView } from '@/lib/cards/economy';
import { ECON_ERRORS, craftCard, isEconError } from '@/lib/cards/economy-api';
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
    else toast(`${name} is in your binder. ${r.card.cost} shards spent.`);
    await refresh();
    setBusy(false);
  };
  // The prototype's detail actions: a primary Craft button with its sparkle icon, and the sentence under it (its `small` takes the whole row).
  return (
    <>
      <button type="button" className="btn-primary" id="d-craft" disabled={busy || v.reason !== null} aria-describedby={note} onClick={() => void click()}>
        <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><use href="#bvc-i-craft" /></svg>{v.cost === null ? `${RARITY_LABEL[rarity]} cards come from packs` : `Craft for ${v.cost} shards`}
      </button>
      <small id={note}>{v.reason ?? `You have ${state.shards} shards.`}</small>
    </>
  );
}
