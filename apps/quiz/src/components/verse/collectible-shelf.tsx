'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

import type { Collectible, CollectibleState, ShelfRow } from '@/lib/verse/collectibles';

// V-CARDS-MAX step 5 - THE SHELF. Its own metaphor, not a second binder: objects
// stand on a display ledge. Lightsticks wear a drawn silhouette; merch a
// typographic block. Same own/want truth (/api/verse/collectible-collection) and
// the same arrange machinery as the binder (verse_binders surface='shelf').

interface Layout { rowOrder?: string[]; objects?: Record<string, number[]> }

function applyLayout(rows: ShelfRow[], layout: Layout): ShelfRow[] {
  let ordered = rows;
  if (layout.rowOrder?.length) {
    const at = new Map(layout.rowOrder.map((k, i) => [k, i] as const));
    ordered = [...rows].sort((a, b) => (at.get(a.key) ?? 1e9) - (at.get(b.key) ?? 1e9));
  }
  return ordered.map((r) => {
    const order = layout.objects?.[r.key];
    if (!order?.length) return r;
    const pos = new Map(order.map((id, i) => [id, i] as const));
    return { ...r, items: [...r.items].sort((a, b) => (pos.get(a.id) ?? 1e9) - (pos.get(b.id) ?? 1e9)) };
  });
}

function Lightstick({ state }: { state: CollectibleState | undefined }): React.ReactElement {
  const owned = state === 'owned', wanted = state === 'wanted';
  const fill = owned ? 'var(--verse-cta, var(--verse-accent))' : 'none';
  const stroke = owned ? 'var(--verse-cta, var(--verse-accent))' : 'var(--verse-ink)';
  return (
    <svg viewBox="0 0 40 92" width="38" height="88" fill="none" aria-hidden style={{ opacity: state ? 1 : 0.5 }}>
      <circle cx="20" cy="19" r="15" fill={fill} stroke={stroke} strokeWidth="2" strokeDasharray={wanted ? '4 3' : undefined} />
      <rect x="15.5" y="33" width="9" height="52" rx="4" fill={fill} stroke={stroke} strokeWidth="2" strokeDasharray={wanted ? '4 3' : undefined} />
    </svg>
  );
}

function MerchBlock({ item, state }: { item: Collectible; state: CollectibleState | undefined }): React.ReactElement {
  const owned = state === 'owned', wanted = state === 'wanted';
  return (
    <span className="flex h-[72px] w-[58px] flex-col justify-end rounded-md p-1.5 text-center"
      style={{ background: owned ? 'var(--verse-cta, var(--verse-accent))' : 'transparent', border: owned ? '1px solid transparent' : wanted ? '2px dashed var(--verse-ink)' : '1.5px dashed var(--v-hairline, var(--verse-line))', color: owned ? 'var(--verse-cta-text, var(--verse-accent-text))' : 'var(--verse-ink)', opacity: state ? 1 : 0.55 }}>
      <span className="line-clamp-2 text-[8.5px] font-bold leading-tight">{item.category ?? item.name}</span>
    </span>
  );
}

export function CollectibleShelf({ rows: rawRows, groupId, groupSlug, fandomName }: {
  rows: ShelfRow[]; groupId: number; groupSlug: string; fandomName: string;
}): React.ReactElement {
  const [states, setStates] = useState<Record<number, CollectibleState>>({});
  const [signedIn, setSignedIn] = useState(false);
  const [layout, setLayout] = useState<Layout>({});
  const [arrange, setArrange] = useState(false);
  const [announce, setAnnounce] = useState('');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`/api/verse/collectible-collection?group_id=${groupId}`).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) { setSignedIn(!!d.signedIn); setStates(d.states ?? {}); } }).catch(() => {});
    fetch(`/api/verse/binder?group_id=${groupId}&surface=shelf`).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d?.layout) setLayout(d.layout); }).catch(() => {});
  }, [groupId]);

  const rows = useMemo(() => applyLayout(rawRows, layout), [rawRows, layout]);
  const total = rows.reduce((n, r) => n + r.items.length, 0);
  const owned = Object.values(states).filter((s) => s === 'owned').length;

  const persist = useCallback((next: Layout) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void fetch('/api/verse/binder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ group_id: groupId, surface: 'shelf', layout: next }) }); }, 600);
  }, [groupId]);

  async function setState(id: number, next: CollectibleState | 'none'): Promise<void> {
    if (!signedIn) { window.location.href = `/login?returnTo=/verse/${groupSlug}/collectibles`; return; }
    setStates((s) => { const n = { ...s }; if (next === 'none') delete n[id]; else n[id] = next; return n; });
    await fetch('/api/verse/collectible-collection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ collectible_id: id, state: next }) });
  }

  function moveObject(rowKey: string, from: number, to: number): void {
    const row = rows.find((r) => r.key === rowKey);
    if (!row || to < 0 || to >= row.items.length || from === to) return;
    const ids = row.items.map((it) => it.id);
    const [m] = ids.splice(from, 1); ids.splice(to, 0, m!);
    const next: Layout = { ...layout, objects: { ...layout.objects, [rowKey]: ids } };
    setLayout(next); persist(next);
    setAnnounce(`Moved ${row.items[from]!.name} to position ${to + 1} of ${ids.length}.`);
  }

  const dragFrom = useRef<{ row: string; idx: number } | null>(null);
  function onDown(e: React.PointerEvent, row: string, idx: number): void { e.preventDefault(); dragFrom.current = { row, idx }; (e.target as HTMLElement).setPointerCapture(e.pointerId); }
  function onMove(e: React.PointerEvent): void {
    if (!dragFrom.current) return;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-obj-index]') as HTMLElement | null;
    if (!el || el.dataset.objRow !== dragFrom.current.row) return;
    const to = Number(el.dataset.objIndex);
    if (!Number.isNaN(to) && to !== dragFrom.current.idx) { moveObject(dragFrom.current.row, dragFrom.current.idx, to); dragFrom.current = { row: dragFrom.current.row, idx: to }; }
  }
  function onUp(): void { dragFrom.current = null; }

  if (!rawRows.length) {
    return <p className="rounded-xl border border-dashed px-5 py-10 text-center text-secondary" style={{ borderColor: 'var(--verse-line)' }}>No collectibles catalogued yet. The {fandomName} shelf fills as curators add lightsticks and merch.</p>;
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl px-5 py-4" style={{ background: 'var(--verse-soft)' }}>
        <div><p className="text-[2rem] font-extrabold leading-none tabular-nums" style={{ color: 'var(--verse-ink)' }}>{owned}</p><p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-tertiary">Owned</p></div>
        <div><p className="text-[2rem] font-extrabold leading-none tabular-nums text-secondary">{total}</p><p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-tertiary">On the shelf</p></div>
        <div className="ml-auto">
          {signedIn ? (
            <button type="button" onClick={() => setArrange((a) => !a)} aria-pressed={arrange} className="v-tap inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3.5 text-xs font-bold" style={arrange ? { background: 'var(--verse-cta, var(--verse-accent))', color: 'var(--verse-cta-text, var(--verse-accent-text))', borderColor: 'transparent' } : { borderColor: 'var(--verse-line)', color: 'var(--verse-ink)' }}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M5 9h14M5 15h14M9 5v14M15 5v14" /></svg>Arrange
            </button>
          ) : (
            <Link href={`/login?returnTo=/verse/${groupSlug}/collectibles`} className="v-tap inline-flex min-h-[36px] items-center rounded-full px-4 text-xs font-bold no-underline" style={{ background: 'var(--verse-cta, var(--verse-accent))', color: 'var(--verse-cta-text, var(--verse-accent-text))' }}>Sign in to track your shelf</Link>
          )}
        </div>
      </div>

      <div className="space-y-8">
        {rows.map((r) => (
          <section key={r.key} aria-label={`${r.label} shelf`}>
            <h2 className="mb-1 text-lg font-extrabold" style={{ color: 'var(--verse-ink)' }}>{r.label} <span className="text-sm font-semibold text-tertiary tabular-nums">{r.items.filter((it) => states[it.id] === 'owned').length}/{r.items.length}</span></h2>
            {/* The display ledge: objects stand on a board with a contact shadow. */}
            <div className="rounded-2xl px-4 pt-4" style={{ background: 'var(--verse-soft)' }}>
              <ul className="flex flex-wrap items-end gap-x-6 gap-y-6">
                {r.items.map((it, idx) => {
                  const st = states[it.id];
                  return (
                    <li key={it.id} data-obj-index={idx} data-obj-row={r.key} className="flex w-[74px] flex-col items-center">
                      <span className="flex h-[92px] items-end justify-center">{r.key === 'lightstick' ? <Lightstick state={st} /> : <MerchBlock item={it} state={st} />}</span>
                      <span className="mt-1 line-clamp-2 text-center text-[10px] font-bold leading-tight" style={{ color: 'var(--verse-ink)' }}>{it.version ?? it.name}</span>
                      {arrange ? (
                        <span className="mt-1 inline-flex items-center gap-0.5">
                          <button type="button" aria-label={`Move ${it.name} left`} disabled={idx === 0} onClick={() => moveObject(r.key, idx, idx - 1)} className="v-tap px-1 text-tertiary disabled:opacity-30">‹</button>
                          <span onPointerDown={(e) => onDown(e, r.key, idx)} onPointerMove={onMove} onPointerUp={onUp} aria-hidden className="cursor-grab touch-none px-0.5 text-tertiary active:cursor-grabbing" title="Drag to reorder">
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden><circle cx="9" cy="8" r="1.5" /><circle cx="15" cy="8" r="1.5" /><circle cx="9" cy="16" r="1.5" /><circle cx="15" cy="16" r="1.5" /></svg>
                          </span>
                          <button type="button" aria-label={`Move ${it.name} right`} disabled={idx === r.items.length - 1} onClick={() => moveObject(r.key, idx, idx + 1)} className="v-tap px-1 text-tertiary disabled:opacity-30">›</button>
                        </span>
                      ) : (
                        <span className="mt-1 flex gap-1">
                          <button type="button" onClick={() => setState(it.id, st === 'owned' ? 'none' : 'owned')} aria-pressed={st === 'owned'} className="v-tap rounded-md px-2 py-0.5 text-[10px] font-bold" style={st === 'owned' ? { background: 'var(--verse-cta, var(--verse-accent))', color: 'var(--verse-cta-text, var(--verse-accent-text))' } : { border: '1px solid var(--verse-line)', color: 'var(--text-secondary)' }}>Own</button>
                          <button type="button" onClick={() => setState(it.id, st === 'wanted' ? 'none' : 'wanted')} aria-pressed={st === 'wanted'} className="v-tap rounded-md px-2 py-0.5 text-[10px] font-bold" style={st === 'wanted' ? { background: 'var(--verse-soft-strong)', color: 'var(--verse-ink)' } : { border: '1px solid var(--verse-line)', color: 'var(--text-secondary)' }}>Want</button>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
              {/* The ledge board. */}
              <div className="mt-3 h-[6px] rounded-full" style={{ background: 'var(--verse-soft-strong)', boxShadow: '0 2px 5px rgba(0,0,0,0.12)' }} />
            </div>
          </section>
        ))}
      </div>
      <p role="status" aria-live="polite" className="sr-only">{announce}</p>
    </div>
  );
}
