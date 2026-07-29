'use client';

import { useCallback, useEffect, useState } from 'react';

import type { Collectible, CollectibleState, CollectibleKind } from '@/lib/verse/collectibles';

const KINDS: Array<{ key: CollectibleKind; label: string; blurb: string }> = [
  { key: 'merch', label: 'Merch', blurb: 'Official merchandise' },
  { key: 'lightstick', label: 'Lightsticks', blurb: 'Official lightsticks and versions' },
];

/** W5.3 - merch + lightstick gallery with a personal owned/wanted checklist + curator entry.
 * Gallery is server-rendered (crawlable); collection state + curator tools are client. */
export function CollectibleGallery({ items: initial, groupId, groupSlug }: { items: Collectible[]; groupId: number; groupSlug: string }): React.ReactElement {
  const [items, setItems] = useState<Collectible[]>(initial);
  const [states, setStates] = useState<Record<number, CollectibleState>>({});
  const [signedIn, setSignedIn] = useState(false);
  const [canCurate, setCanCurate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({ kind: 'merch' });

  const loadStates = useCallback(async () => {
    const r = await fetch(`/api/verse/collectible-collection?group_id=${groupId}`);
    if (r.ok) { const d = await r.json(); setSignedIn(!!d.signedIn); setStates(d.states ?? {}); }
  }, [groupId]);
  useEffect(() => { loadStates(); }, [loadStates]);
  useEffect(() => { fetch(`/api/verse/can-edit?group=${encodeURIComponent(groupSlug)}`).then((r) => (r.ok ? r.json() : null)).then((d) => setCanCurate(!!d?.canEdit)).catch(() => {}); }, [groupSlug]);

  async function set(itemId: number, next: CollectibleState | 'none') {
    if (!signedIn) { window.location.href = `/login?returnTo=/verse/${groupSlug}/collectibles`; return; }
    setStates((s) => { const n = { ...s }; if (next === 'none') delete n[itemId]; else n[itemId] = next; return n; });
    await fetch('/api/verse/collectible-collection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ collectible_id: itemId, state: next }) });
  }

  async function addItem() {
    if (!form.name?.trim() || !form.kind) return;
    setBusy(true);
    const r = await fetch('/api/verse/collectibles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ group_id: groupId, publish: true, ...form }) });
    setBusy(false);
    if (r.ok) {
      const cat = await fetch(`/api/verse/collectibles?group_id=${groupId}`); if (cat.ok) setItems((await cat.json()).items ?? []);
      setForm({ kind: form.kind });
    } else alert((await r.json()).error ?? 'error');
  }

  const owned = Object.values(states).filter((s) => s === 'owned').length;
  const field = 'rounded-lg border border-default bg-transparent px-2.5 py-1.5 text-sm';

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-lg font-bold" style={{ color: 'var(--verse-ink)' }}>Collectibles</h1>
        {items.length > 0 ? <span className="text-sm text-secondary tabular-nums">{owned} of {items.length} owned</span> : null}
      </div>

      {canCurate ? (
        <div className="mb-5 rounded-xl border border-default p-3">
          <p className="mb-2 text-xs font-semibold text-secondary">Add an item</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <select value={form.kind ?? 'merch'} onChange={(e) => setForm({ ...form, kind: e.target.value })} className={field} aria-label="Kind">{KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}</select>
            <input placeholder="Item name" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className={field} aria-label="Item name" />
            <input placeholder="Category" value={form.category ?? ''} onChange={(e) => setForm({ ...form, category: e.target.value })} className={field} aria-label="Category" />
            <input placeholder="Era" value={form.era ?? ''} onChange={(e) => setForm({ ...form, era: e.target.value })} className={field} aria-label="Era" />
            <input placeholder="Version" value={form.version ?? ''} onChange={(e) => setForm({ ...form, version: e.target.value })} className={field} aria-label="Version" />
            <input placeholder="Source URL" value={form.source_url ?? ''} onChange={(e) => setForm({ ...form, source_url: e.target.value })} className={`${field} sm:col-span-2`} aria-label="Source URL" />
          </div>
          <button onClick={addItem} disabled={busy} className="mt-2 rounded-lg px-4 py-1.5 text-sm font-bold" style={{ background: 'var(--verse-accent)', color: 'var(--verse-accent-text)' }}>Publish item</button>
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed px-5 py-10 text-center text-secondary" style={{ borderColor: 'var(--verse-line)' }}>No merch or lightsticks catalogued yet.</p>
      ) : (
        KINDS.map((k) => {
          const group = items.filter((it) => it.kind === k.key);
          if (group.length === 0) return null;
          return (
            <section key={k.key} className="mb-6">
              <div className="mb-2 flex items-baseline gap-2">
                <h2 className="text-sm font-bold" style={{ color: 'var(--verse-ink)' }}>{k.label}</h2>
                <span className="text-xs text-tertiary">{k.blurb}</span>
              </div>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {group.map((c) => {
                  const st = states[c.id];
                  return (
                    <li key={c.id} className="rounded-xl border p-2.5" style={{ borderColor: 'var(--verse-line)', background: 'var(--verse-soft)' }}>
                      <div className="mb-2 flex aspect-square items-center justify-center overflow-hidden rounded-lg" style={{ background: 'var(--verse-soft-strong)' }}>
                        {c.image_url ? <img src={c.image_url} alt={c.name} className="h-full w-full object-cover" loading="lazy" /> : <span className="px-2 text-center text-[11px] font-semibold text-tertiary">{c.era ?? c.name}</span>}
                      </div>
                      <p className="truncate text-xs font-bold" style={{ color: 'var(--verse-ink)' }} title={c.name}>{c.name}</p>
                      <p className="truncate text-[11px] text-tertiary">{[c.era, c.version, c.category].filter(Boolean).join(' · ')}</p>
                      <div className="mt-1.5 flex gap-1.5">
                        <button onClick={() => set(c.id, st === 'owned' ? 'none' : 'owned')} aria-pressed={st === 'owned'} className="flex-1 rounded-md py-1 text-[11px] font-bold" style={st === 'owned' ? { background: 'var(--verse-accent)', color: 'var(--verse-accent-text)' } : { border: '1px solid var(--verse-line)', color: 'var(--text-secondary)' }}>Own</button>
                        <button onClick={() => set(c.id, st === 'wanted' ? 'none' : 'wanted')} aria-pressed={st === 'wanted'} className="flex-1 rounded-md py-1 text-[11px] font-bold" style={st === 'wanted' ? { background: 'var(--verse-soft-strong)', color: 'var(--verse-ink)' } : { border: '1px solid var(--verse-line)', color: 'var(--text-secondary)' }}>Want</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
