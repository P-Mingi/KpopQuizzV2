'use client';

// Bunnyverse Cards, lot 3 A14 (lane ECON): "Craft for N shards" in the page of a MISSING card. Disabled, with the reason written under it
// (and tied to the button for screen readers), when the player is short of shards; a Full Art says it cannot be crafted.
import { useId, useState } from 'react';
import { createPortal } from 'react-dom';

import { craftView } from '@/lib/cards/economy';
import { ECON_ERRORS, craftCard, isEconError } from '@/lib/cards/economy-api';
import { finishedLine } from '@/lib/cards/goals';
import { RARITY_LABEL } from '@/lib/cards/rules';

import { useCards } from './cards-provider';
import { PanoReveal } from './pano-reveal';

import type { Rarity } from '@/lib/cards/types';
import type { SlimCard, SlimPano } from '@/lib/cards/ui-types';

export function CraftButton({ n, rarity, name, after = null }: { n: number; rarity: Rarity; name: string; after?: React.ReactNode }): React.ReactElement | null {
  const { state, status, owned, refresh, toast, panoByP, byN } = useCards();
  const [busy, setBusy] = useState(false);
  // Lot 7: a craft that completes a set gives the panorama: its dedicated reveal, over the page.
  const [reveal, setReveal] = useState<SlimPano | null>(null);
  const note = useId();
  const overlay = reveal && typeof document !== 'undefined'
    ? createPortal(<PanoReveal pano={reveal} parts={reveal.cards.map((x) => byN.get(x)).filter((c): c is SlimCard => !!c)} from="craft" onDone={() => setReveal(null)} />, document.querySelector('.bvc') ?? document.body)
    : null;
  if (status !== 'ready' || !state || owned.has(n)) return overlay;
  const v = craftView(rarity, state.shards, false);
  const click = async (): Promise<void> => {
    if (busy || v.reason) return;
    setBusy(true);
    const r = await craftCard(n);
    if (isEconError(r)) toast(ECON_ERRORS[r.error] ?? ECON_ERRORS.failed!);
    else toast(`${name} is in your binder. ${r.card.cost} shards spent.${finishedLine(r.card.finished ?? []) ? ` ${finishedLine(r.card.finished ?? [])}.` : ''}`);
    await refresh();
    if (!isEconError(r) && r.card.pano !== undefined) { const p = panoByP.get(r.card.pano); if (p) setReveal(p); }
    setBusy(false);
  };
  // The prototype's detail actions: a primary Craft button with its sparkle icon, and the sentence under it (its `small` takes the whole row).
  return (
    <>
      {overlay}
      <button type="button" className="btn-primary" id="d-craft" disabled={busy || v.reason !== null} aria-describedby={note} onClick={() => void click()}>
        <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><use href="#bvc-i-craft" /></svg>{v.cost === null ? `${RARITY_LABEL[rarity]} cards come from packs` : `Craft for ${v.cost} shards`}
      </button>
      {after}
      <small id={note}>{v.reason ?? `You have ${state.shards} shards.`}</small>
    </>
  );
}
