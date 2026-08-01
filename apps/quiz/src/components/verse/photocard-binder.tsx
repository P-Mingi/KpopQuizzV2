'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

import { CoverArt } from '@/components/verse/cover-art';

import type { BinderSet, CardState } from '@/lib/verse/photocards';

// V-CARDS-MAX step 2 - THE BINDER. The real-binder mental model: one page per
// set, pockets at photocard ratio (5.5 : 8.5), owned solid / wanted dashed ghost /
// gap visible. Auto-by-set out of the box; an Arrange mode adds manual drag
// (pointer = touch + mouse) with move buttons as the keyboard fallback and an
// announced reorder. The catalog shell renders from props (crawlable); the
// personal own/want state is fetched client-side for the signed-in owner only, so
// a binder is never logged-out or another user's to read.

const RATIO = '55 / 85';

interface Layout { pageOrder?: string[]; pockets?: Record<string, number[]>; stickers?: Record<string, number[]> }

function applyLayout(sets: BinderSet[], layout: Layout): BinderSet[] {
  let ordered = sets;
  if (layout.pageOrder?.length) {
    const at = new Map(layout.pageOrder.map((k, i) => [k, i] as const));
    ordered = [...sets].sort((a, b) => (at.get(a.key) ?? 1e9) - (at.get(b.key) ?? 1e9));
  }
  return ordered.map((s) => {
    const order = layout.pockets?.[s.key];
    if (!order?.length) return s;
    const pos = new Map(order.map((id, i) => [id, i] as const));
    return { ...s, cards: [...s.cards].sort((a, b) => (pos.get(a.id) ?? 1e9) - (pos.get(b.id) ?? 1e9)) };
  });
}

function Ring({ owned, total }: { owned: number; total: number }): React.ReactElement {
  const pct = total ? Math.round((owned / total) * 100) : 0;
  const done = total > 0 && owned >= total;
  return (
    <span className="relative inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full"
      style={{ background: `conic-gradient(var(--verse-cta, var(--verse-accent)) ${pct}%, var(--verse-line) ${pct}% 100%)` }}
      role="img" aria-label={`${owned} of ${total} owned, ${pct} percent`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-extrabold tabular-nums" style={{ background: 'var(--bg-surface)', color: 'var(--verse-ink)' }}>
        {done ? (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--verse-cta, var(--verse-accent))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6 9 17l-5-5" /></svg>
        ) : `${pct}%`}
      </span>
    </span>
  );
}

const THEMES: { key: string; label: string }[] = [
  { key: 'classic', label: 'Classic' }, { key: 'neon', label: 'Neon' }, { key: 'soft', label: 'Soft' }, { key: 'scrapbook', label: 'Scrapbook' },
];

export function PhotocardBinder({ sets: rawSets, groupId, groupSlug, fandomName, stickerAssets = [] }: {
  sets: BinderSet[]; groupId: number; groupSlug: string; fandomName: string; stickerAssets?: { id: number; url: string }[];
}): React.ReactElement {
  const [states, setStates] = useState<Record<number, CardState>>({});
  const [signedIn, setSignedIn] = useState(false);
  const [layout, setLayout] = useState<Layout>({});
  const [theme, setTheme] = useState('classic');
  const [page, setPage] = useState(0);
  const [arrange, setArrange] = useState(false);
  const [announce, setAnnounce] = useState('');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`/api/verse/collection?group_id=${groupId}`).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) { setSignedIn(!!d.signedIn); setStates(d.states ?? {}); } }).catch(() => {});
    fetch(`/api/verse/binder?group_id=${groupId}&surface=binder`).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) { if (d.layout) setLayout(d.layout); if (d.theme) setTheme(d.theme); } }).catch(() => {});
  }, [groupId]);

  function saveTheme(t: string): void {
    setTheme(t);
    void fetch('/api/verse/binder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ group_id: groupId, surface: 'binder', theme: t }) });
  }
  // Scrapbook sticker slots reuse the space's existing sticker assets; placements
  // live in layout.stickers[setKey]. Toggling a sticker adds/removes it from the page.
  function toggleSticker(setKey: string, assetId: number): void {
    const cur = layout.stickers?.[setKey] ?? [];
    const nextIds = cur.includes(assetId) ? cur.filter((x) => x !== assetId) : [...cur, assetId];
    const next: Layout = { ...layout, stickers: { ...layout.stickers, [setKey]: nextIds } };
    setLayout(next); persist(next);
  }

  const sets = useMemo(() => applyLayout(rawSets, layout), [rawSets, layout]);
  const active = sets[Math.min(page, sets.length - 1)];
  const total = sets.reduce((n, s) => n + s.cards.length, 0);
  const ownedTotal = Object.values(states).filter((s) => s === 'owned').length;
  const setsComplete = sets.filter((s) => s.cards.length > 0 && s.cards.every((c) => states[c.id] === 'owned')).length;

  const persist = useCallback((next: Layout) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void fetch('/api/verse/binder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ group_id: groupId, surface: 'binder', layout: next }) });
    }, 600);
  }, [groupId]);

  async function setState(cardId: number, next: CardState | 'none'): Promise<void> {
    if (!signedIn) { window.location.href = `/login?returnTo=/verse/${groupSlug}/photocards`; return; }
    setStates((s) => { const n = { ...s }; if (next === 'none') delete n[cardId]; else n[cardId] = next; return n; });
    await fetch('/api/verse/collection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photocard_id: cardId, state: next }) });
  }

  function movePocket(from: number, to: number): void {
    if (!active || to < 0 || to >= active.cards.length || from === to) return;
    const ids = active.cards.map((c) => c.id);
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved!);
    const next: Layout = { ...layout, pockets: { ...layout.pockets, [active.key]: ids } };
    setLayout(next); persist(next);
    setAnnounce(`Moved ${active.cards[from]!.name} to position ${to + 1} of ${ids.length}.`);
  }

  function movePage(from: number, to: number): void {
    if (to < 0 || to >= sets.length || from === to) return;
    const keys = sets.map((s) => s.key);
    const [moved] = keys.splice(from, 1);
    keys.splice(to, 0, moved!);
    const next: Layout = { ...layout, pageOrder: keys };
    setLayout(next); persist(next); setPage(to);
    setAnnounce(`Moved the ${sets[from]!.label} page to position ${to + 1} of ${keys.length}.`);
  }

  // Pointer drag (touch + mouse): reorder pockets live using the element under
  // the pointer; move buttons are the keyboard-accessible equivalent.
  const dragFrom = useRef<number | null>(null);
  function onHandleDown(e: React.PointerEvent, idx: number): void {
    e.preventDefault();
    dragFrom.current = idx;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onHandleMove(e: React.PointerEvent): void {
    if (dragFrom.current === null) return;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-pocket-index]') as HTMLElement | null;
    if (!el) return;
    const to = Number(el.dataset.pocketIndex);
    if (!Number.isNaN(to) && to !== dragFrom.current) { movePocket(dragFrom.current, to); dragFrom.current = to; }
  }
  function onHandleUp(): void { dragFrom.current = null; }

  if (!rawSets.length) {
    return <p className="rounded-xl border border-dashed px-5 py-10 text-center text-secondary" style={{ borderColor: 'var(--verse-line)' }}>No photocards catalogued yet. The {fandomName} binder starts the moment a curator adds the first set.</p>;
  }

  return (
    <div className="v-binder" data-binder-theme={theme}>
      {/* Summary band: the whole binder in numbers. */}
      <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl px-5 py-4" style={{ background: 'var(--binder-surface)' }}>
        <div><p className="text-[2rem] font-extrabold leading-none tabular-nums" style={{ color: 'var(--verse-ink)' }}>{ownedTotal}</p><p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-tertiary">Owned</p></div>
        <div><p className="text-[2rem] font-extrabold leading-none tabular-nums text-secondary">{total}</p><p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-tertiary">In the catalog</p></div>
        <div><p className="text-[2rem] font-extrabold leading-none tabular-nums text-secondary">{setsComplete}<span className="text-lg text-tertiary">/{sets.length}</span></p><p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-tertiary">Sets complete</p></div>
        <div className="ml-auto flex items-center gap-3">
          {signedIn ? (
            <button type="button" onClick={() => setArrange((a) => !a)} aria-pressed={arrange}
              className="v-tap inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3.5 text-xs font-bold"
              style={arrange ? { background: 'var(--verse-cta, var(--verse-accent))', color: 'var(--verse-cta-text, var(--verse-accent-text))', borderColor: 'transparent' } : { borderColor: 'var(--verse-line)', color: 'var(--verse-ink)' }}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M5 9h14M5 15h14M9 5v14M15 5v14" /></svg>
              Arrange
            </button>
          ) : (
            <Link href={`/login?returnTo=/verse/${groupSlug}/photocards`} className="v-tap inline-flex min-h-[36px] items-center rounded-full px-4 text-xs font-bold no-underline" style={{ background: 'var(--verse-cta, var(--verse-accent))', color: 'var(--verse-cta-text, var(--verse-accent-text))' }}>Sign in to start your binder</Link>
          )}
        </div>
      </div>

      {/* Theme picker (owner): the binder wears the fandom's mood. Editor parity -
          the reader owns their binder's look just as curators own the space's. */}
      {signedIn ? (
        <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Binder theme">
          <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary">Theme</span>
          {THEMES.map((t) => (
            <button key={t.key} type="button" onClick={() => saveTheme(t.key)} aria-pressed={theme === t.key}
              className="v-tap rounded-full border px-3 py-1 text-xs font-semibold"
              style={theme === t.key ? { borderColor: 'var(--verse-cta, var(--verse-accent))', background: 'var(--verse-soft-strong)', color: 'var(--verse-ink)' } : { borderColor: 'var(--verse-line)', color: 'var(--text-secondary)' }}>
              {t.label}
            </button>
          ))}
        </div>
      ) : null}

      {/* Page rail: every set is a page you can flip to. Plain toggle buttons
          (aria-pressed for the active page) rather than a half-built tab pattern:
          each button is its own tab stop and there is no tabpanel relationship. */}
      <div className="mb-4 flex items-center gap-2">
        <div role="group" aria-label="Binder pages" className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {sets.map((s, i) => {
            const on = i === Math.min(page, sets.length - 1);
            const owned = s.cards.filter((c) => states[c.id] === 'owned').length;
            return (
              <div key={s.key} className="inline-flex items-center">
                <button type="button" aria-pressed={on} aria-label={`Show the ${s.label} page`} onClick={() => setPage(i)}
                  className="v-tap max-w-[42vw] truncate rounded-full border px-3 py-1 text-xs font-semibold"
                  style={on ? { borderColor: 'var(--verse-cta, var(--verse-accent))', background: 'var(--verse-soft-strong)', color: 'var(--verse-ink)' } : { borderColor: 'var(--verse-line)', color: 'var(--text-secondary)' }}>
                  {s.label} <span className="tabular-nums text-tertiary">{owned}/{s.cards.length}</span>
                </button>
                {arrange ? (
                  <span className="ml-0.5 inline-flex">
                    <button type="button" aria-label={`Move ${s.label} page earlier`} aria-disabled={i === 0} onClick={() => movePage(i, i - 1)} className="v-tap px-1 text-tertiary aria-disabled:opacity-30">‹</button>
                    <button type="button" aria-label={`Move ${s.label} page later`} aria-disabled={i === sets.length - 1} onClick={() => movePage(i, i + 1)} className="v-tap px-1 text-tertiary aria-disabled:opacity-30">›</button>
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* The set-pages. All render for SEO; only the active one is shown + interactive. */}
      {sets.map((s, i) => {
        const owned = s.cards.filter((c) => states[c.id] === 'owned').length;
        const isActive = i === Math.min(page, sets.length - 1);
        return (
          <section key={s.key} hidden={!isActive} aria-label={`${s.label} page`}
            className="v-binder-page rounded-2xl border p-4 sm:p-5" style={{ borderColor: 'var(--binder-page-border)', background: 'var(--binder-surface)' }}>
            <header className="mb-4 flex items-center gap-3">
              {s.mbid ? <CoverArt mbid={s.mbid} title={s.label} className="w-12 flex-shrink-0 rounded-md" /> : null}
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-extrabold" style={{ color: 'var(--verse-ink)' }}>{s.label}</h2>
                <p className="text-xs text-tertiary tabular-nums">{s.releaseYear ? `${s.releaseYear} · ` : ''}{owned} of {s.cards.length} owned</p>
              </div>
              <Ring owned={owned} total={s.cards.length} />
            </header>

            {/* Scrapbook: sticker slots from the space's existing sticker set. */}
            {theme === 'scrapbook' ? (
              <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-2" style={{ borderColor: 'var(--binder-page-border)' }}>
                <span className="text-[10px] font-bold uppercase tracking-wider text-tertiary">Stickers</span>
                {stickerAssets.length === 0 ? (
                  <span className="text-[11px] text-tertiary">Curators add stickers in the studio; they decorate your scrapbook here.</span>
                ) : stickerAssets.map((a, si) => {
                  const on = (layout.stickers?.[s.key] ?? []).includes(a.id);
                  return (
                    <button key={a.id} type="button" onClick={() => signedIn && toggleSticker(s.key, a.id)} aria-pressed={on} disabled={!signedIn}
                      aria-label={on ? `Remove sticker ${si + 1} from this page` : `Place sticker ${si + 1} on this page`}
                      className="v-tap inline-flex h-9 w-9 items-center justify-center rounded-md border disabled:opacity-50" style={{ borderColor: on ? 'var(--verse-cta, var(--verse-accent))' : 'var(--verse-line)', background: on ? 'var(--verse-soft-strong)' : 'transparent' }} title={on ? 'Placed - tap to remove' : 'Tap to place'}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={a.url} alt="" className="h-6 w-6 object-contain" />
                    </button>
                  );
                })}
              </div>
            ) : null}

            {/* Fixed card-sized pockets: 2-up on mobile (2x3 mental model), more
                on desktop, capped so a photocard-ratio pocket never balloons. */}
            <ul className="grid justify-start gap-2.5 sm:gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(128px, 150px))', maxWidth: '920px' }}>
              {s.cards.map((c, idx) => {
                const st = states[c.id];
                const ownedC = st === 'owned', wantedC = st === 'wanted';
                return (
                  <li key={c.id} data-pocket-index={idx} className="flex flex-col">
                    <Link href={`/verse/${groupSlug}/photocards/${c.id}`} aria-label={`${c.name}${ownedC ? ', owned' : wantedC ? ', wanted' : ''}`}
                      className="group relative flex items-end overflow-hidden rounded-lg p-2 no-underline transition-colors"
                      style={{
                        aspectRatio: RATIO,
                        borderRadius: 'var(--binder-radius)',
                        background: ownedC ? 'var(--binder-owned)' : 'transparent',
                        border: ownedC ? '1px solid transparent' : wantedC ? '2px dashed var(--verse-ink)' : '1.5px dashed var(--v-hairline, var(--verse-line))',
                        color: ownedC ? 'var(--binder-owned-text)' : 'var(--verse-ink)',
                        opacity: !st ? 0.62 : 1,
                        boxShadow: st ? 'inset 0 1px 3px rgba(0,0,0,0.10)' : 'none',
                      }}>
                      <span className="line-clamp-3 text-[11px] font-bold leading-tight">{c.name}</span>
                      {c.version || c.card_type ? <span className="absolute right-1.5 top-1.5 rounded px-1 py-0.5 text-[8.5px] font-bold uppercase tracking-wide" style={{ background: ownedC ? 'rgba(255,255,255,0.22)' : 'var(--verse-soft-strong)', color: ownedC ? 'inherit' : 'var(--text-secondary)' }}>{c.version || c.card_type}</span> : null}
                    </Link>

                    {arrange ? (
                      <div className="mt-1 flex items-center justify-center gap-1">
                        <button type="button" aria-label={`Move ${c.name} left`} aria-disabled={idx === 0} onClick={() => movePocket(idx, idx - 1)} className="v-tap px-1 text-tertiary aria-disabled:opacity-30">‹</button>
                        <span onPointerDown={(e) => onHandleDown(e, idx)} onPointerMove={onHandleMove} onPointerUp={onHandleUp} role="button" tabIndex={-1} aria-hidden
                          className="cursor-grab touch-none px-1.5 text-tertiary active:cursor-grabbing" title="Drag to reorder">
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden><circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" /><circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" /></svg>
                        </span>
                        <button type="button" aria-label={`Move ${c.name} right`} aria-disabled={idx === s.cards.length - 1} onClick={() => movePocket(idx, idx + 1)} className="v-tap px-1 text-tertiary aria-disabled:opacity-30">›</button>
                      </div>
                    ) : signedIn ? (
                      <div className="mt-1 flex gap-1">
                        <button type="button" onClick={() => setState(c.id, ownedC ? 'none' : 'owned')} aria-pressed={ownedC} className="v-tap flex-1 rounded-md py-1 text-[10.5px] font-bold" style={ownedC ? { background: 'var(--verse-cta, var(--verse-accent))', color: 'var(--verse-cta-text, var(--verse-accent-text))' } : { border: '1px solid var(--verse-line)', color: 'var(--text-secondary)' }}>Own</button>
                        <button type="button" onClick={() => setState(c.id, wantedC ? 'none' : 'wanted')} aria-pressed={wantedC} className="v-tap flex-1 rounded-md py-1 text-[10.5px] font-bold" style={wantedC ? { background: 'var(--verse-soft-strong)', color: 'var(--verse-ink)' } : { border: '1px solid var(--verse-line)', color: 'var(--text-secondary)' }}>Want</button>
                      </div>
                    ) : null}
                    {/* Logged-out sees the catalog shell only: no own/want controls,
                        no personal state - the binder is an invitation to start, not
                        a working binder (V-CARDS owner ruling). */}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {/* Prev / next flip. */}
      {sets.length > 1 ? (
        <div className="mt-4 flex items-center justify-between">
          <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={Math.min(page, sets.length - 1) === 0} className="v-tap inline-flex items-center gap-1 rounded-full border px-4 py-1.5 text-sm font-bold disabled:opacity-40" style={{ borderColor: 'var(--verse-line)', color: 'var(--verse-ink)' }}>‹ Previous</button>
          <span className="text-xs font-semibold text-tertiary tabular-nums">Page {Math.min(page, sets.length - 1) + 1} of {sets.length}{active ? ` · ${active.label}` : ''}</span>
          <button type="button" onClick={() => setPage((p) => Math.min(sets.length - 1, p + 1))} disabled={Math.min(page, sets.length - 1) === sets.length - 1} className="v-tap inline-flex items-center gap-1 rounded-full border px-4 py-1.5 text-sm font-bold disabled:opacity-40" style={{ borderColor: 'var(--verse-line)', color: 'var(--verse-ink)' }}>Next ›</button>
        </div>
      ) : null}

      <p role="status" aria-live="polite" className="sr-only">{announce}</p>
    </div>
  );
}
