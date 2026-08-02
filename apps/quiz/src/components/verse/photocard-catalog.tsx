'use client';

import { useCallback, useEffect, useState } from 'react';
import { EmptyState } from '@/components/verse/primitives/empty-state';

import type { Photocard, CardState } from '@/lib/verse/photocards';

const TYPES = ['album', 'pob', 'fansign', 'fanmeeting', 'event', 'trading', 'season_greetings', 'md', 'other'];

/** W5.2 - photocard catalog with a personal owned/wanted checklist + curator entry.
 * Catalog is server-rendered (crawlable); collection state + curator tools are client. */
export function PhotocardCatalog({ cards: initial, groupId, groupSlug }: { cards: Photocard[]; groupId: number; groupSlug: string }): React.ReactElement {
  const [cards, setCards] = useState<Photocard[]>(initial);
  const [states, setStates] = useState<Record<number, CardState>>({});
  const [signedIn, setSignedIn] = useState(false);
  const [canCurate, setCanCurate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const loadStates = useCallback(async () => {
    const r = await fetch(`/api/verse/collection?group_id=${groupId}`);
    if (r.ok) { const d = await r.json(); setSignedIn(!!d.signedIn); setStates(d.states ?? {}); }
  }, [groupId]);
  useEffect(() => { loadStates(); }, [loadStates]);
  useEffect(() => { fetch(`/api/verse/can-edit?group=${encodeURIComponent(groupSlug)}`).then((r) => (r.ok ? r.json() : null)).then((d) => setCanCurate(!!d?.canEdit)).catch(() => {}); }, [groupSlug]);

  async function set(cardId: number, next: CardState | 'none') {
    if (!signedIn) { window.location.href = `/login?returnTo=/verse/${groupSlug}/photocards`; return; }
    setStates((s) => { const n = { ...s }; if (next === 'none') delete n[cardId]; else n[cardId] = next; return n; });
    await fetch('/api/verse/collection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photocard_id: cardId, state: next }) });
  }

  async function addCard() {
    if (!form.name?.trim()) return;
    setBusy(true);
    const r = await fetch('/api/verse/photocards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ group_id: groupId, publish: true, ...form }) });
    setBusy(false);
    if (r.ok) {
      const cat = await fetch(`/api/verse/photocards?group_id=${groupId}`); if (cat.ok) setCards((await cat.json()).cards ?? []);
      setForm({});
    } else alert((await r.json()).error ?? 'error');
  }

  const owned = Object.values(states).filter((s) => s === 'owned').length;
  const field = 'rounded-lg border border-default bg-transparent px-2.5 py-1.5 text-sm';

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-lg font-bold" style={{ color: 'var(--verse-ink)' }}>Photocards</h1>
        {cards.length > 0 ? <span className="text-sm text-secondary tabular-nums">{owned} of {cards.length} owned</span> : null}
      </div>

      {canCurate ? (
        <div className="mb-5 rounded-xl border border-default p-3">
          <p className="mb-2 text-xs font-semibold text-secondary">Add a card</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input placeholder="Card name" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className={field} aria-label="Card name" />
            <select value={form.card_type ?? ''} onChange={(e) => setForm({ ...form, card_type: e.target.value })} className={field} aria-label="Type"><option value="">Type</option>{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
            <input placeholder="Era" value={form.era ?? ''} onChange={(e) => setForm({ ...form, era: e.target.value })} className={field} aria-label="Era" />
            <input placeholder="Version" value={form.version ?? ''} onChange={(e) => setForm({ ...form, version: e.target.value })} className={field} aria-label="Version" />
            <input placeholder="Source URL" value={form.source_url ?? ''} onChange={(e) => setForm({ ...form, source_url: e.target.value })} className={`${field} sm:col-span-2`} aria-label="Source URL" />
          </div>
          <button onClick={addCard} disabled={busy} className="mt-2 rounded-lg px-4 py-1.5 text-sm font-bold" style={{ background: 'var(--verse-accent)', color: 'var(--verse-accent-text)' }}>Publish card</button>
        </div>
      ) : null}

      {cards.length === 0 ? (
        <EmptyState headline="No photocards yet." />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {cards.map((c) => {
            const st = states[c.id];
            return (
              <li key={c.id} className="rounded-xl border p-2.5" style={{ borderColor: 'var(--verse-line)', background: 'var(--verse-soft)' }}>
                <div className="mb-2 flex aspect-[3/4.5] items-center justify-center overflow-hidden rounded-lg" style={{ background: 'var(--verse-soft-strong)' }}>
                  {c.image_url ? <img src={c.image_url} alt={c.name} className="h-full w-full object-cover" loading="lazy" /> : <span className="px-2 text-center text-[11px] font-semibold text-tertiary">{c.era ?? c.name}</span>}
                </div>
                <p className="truncate text-xs font-bold" style={{ color: 'var(--verse-ink)' }} title={c.name}>{c.name}</p>
                <p className="truncate text-[11px] text-tertiary">{[c.era, c.version, c.card_type].filter(Boolean).join(' · ')}</p>
                <div className="mt-1.5 flex gap-1.5">
                  <button onClick={() => set(c.id, st === 'owned' ? 'none' : 'owned')} aria-pressed={st === 'owned'} className="flex-1 rounded-md py-1 text-[11px] font-bold" style={st === 'owned' ? { background: 'var(--verse-accent)', color: 'var(--verse-accent-text)' } : { border: '1px solid var(--verse-line)', color: 'var(--text-secondary)' }}>Own</button>
                  <button onClick={() => set(c.id, st === 'wanted' ? 'none' : 'wanted')} aria-pressed={st === 'wanted'} className="flex-1 rounded-md py-1 text-[11px] font-bold" style={st === 'wanted' ? { background: 'var(--verse-soft-strong)', color: 'var(--verse-ink)' } : { border: '1px solid var(--verse-line)', color: 'var(--text-secondary)' }}>Want</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
