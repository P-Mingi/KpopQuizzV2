'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

import { useBuildMode } from '@/components/verse/build-mode';

// V-ESSAYS-MAX step 5 - the CURATOR side (parity: ships with the author tools).
// Build-mode only, curator-gated. The review queue (publish/return), the featured
// HERO pick (one at a time), unpublish-with-reason (logged), and series management
// (approve proposals, rename, reorder). Mirrors the essays API's gates.
interface QueueEssay { id: number; title: string; author: { username: string | null; displayName: string | null } | null }
interface PubEssay { id: number; title: string; is_hero: boolean }
interface Series { id: number; title: string; slug: string | null; status: string }

export function EssayCuratorPanel({ groupId, groupSlug }: { groupId: number; groupSlug: string }): React.ReactElement | null {
  const { on } = useBuildMode();
  const [isCurator, setIsCurator] = useState(false);
  const [queue, setQueue] = useState<QueueEssay[]>([]);
  const [pub, setPub] = useState<PubEssay[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const [q, p, s] = await Promise.all([
      fetch(`/api/verse/essays?group_id=${groupId}&scope=queue`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/verse/essays?group_id=${groupId}&scope=published`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/verse/essays/series?group_id=${groupId}&scope=manage`).then((r) => (r.ok ? r.json() : null)),
    ]);
    if (q?.essays) setQueue(q.essays); if (p?.essays) setPub(p.essays); if (s?.series) setSeries(s.series);
  }, [groupId]);

  useEffect(() => {
    if (!on) return;
    fetch(`/api/verse/membership?group_id=${groupId}`, { credentials: 'include' }).then((r) => (r.ok ? r.json() : null)).then((d) => setIsCurator(['curator', 'space_admin'].includes(d?.role)) ).catch(() => {});
  }, [on, groupId]);
  useEffect(() => { if (on && isCurator) void load(); }, [on, isCurator, load]);

  async function essayAction(id: number, action: string, note?: string): Promise<void> {
    const r = await fetch('/api/verse/essays', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action, note }) });
    if (r.ok) { setMsg(''); void load(); } else setMsg((await r.json().catch(() => ({}))).error ?? 'Could not update.');
  }
  async function seriesAction(id: number, action: string, extra?: Record<string, unknown>): Promise<void> {
    const r = await fetch('/api/verse/essays/series', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action, ...extra }) });
    if (r.ok) void load(); else setMsg((await r.json().catch(() => ({}))).error ?? 'Could not update.');
  }

  if (!on || !isCurator) return null;
  const proposed = series.filter((s) => s.status === 'proposed');
  const approved = series.filter((s) => s.status === 'approved');
  const B = 'v-tap rounded-full border px-3 py-1 text-xs font-semibold';

  return (
    <section aria-label="Manage essays" className="mt-10 rounded-2xl border p-4 sm:p-5" style={{ borderColor: 'var(--verse-cta, var(--verse-accent))', background: 'var(--verse-soft)' }}>
      <h2 className="v-section-title">Manage essays</h2>
      <div className="v-section-rule" aria-hidden />
      {msg ? <p role="status" className="mb-2 text-xs" style={{ color: 'var(--verse-cta, var(--verse-accent))' }}>{msg}</p> : null}

      {/* Review queue. */}
      <h3 className="text-sm font-bold" style={{ color: 'var(--verse-ink)' }}>Review queue <span className="tabular-nums text-tertiary">{queue.length}</span></h3>
      {queue.length === 0 ? <p className="mt-1 text-xs text-tertiary">No submissions waiting.</p> : (
        <ul className="mt-2 space-y-2">
          {queue.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--bg-surface)' }}>
              <Link href={`/verse/${groupSlug}/essays/${e.id}`} className="font-bold no-underline" style={{ color: 'var(--verse-ink)' }}>{e.title}</Link>
              <span className="text-xs text-tertiary">by {e.author?.displayName || e.author?.username || 'a fan'}</span>
              <span className="ml-auto flex gap-1.5">
                <button type="button" onClick={() => void essayAction(e.id, 'feature')} className="v-tap rounded-full px-3 py-1 text-xs font-bold" style={{ background: 'var(--verse-cta, var(--verse-accent))', color: 'var(--verse-cta-text, var(--verse-accent-text))' }}>Publish</button>
                <button type="button" onClick={() => { const n = window.prompt('Reason to return (optional):') ?? undefined; void essayAction(e.id, 'reject', n); }} className={B} style={{ borderColor: 'var(--verse-line)', color: 'var(--text-secondary)' }}>Return</button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Published: hero pick + unpublish. */}
      <h3 className="mt-5 text-sm font-bold" style={{ color: 'var(--verse-ink)' }}>Published <span className="tabular-nums text-tertiary">{pub.length}</span></h3>
      {pub.length === 0 ? <p className="mt-1 text-xs text-tertiary">Nothing published yet.</p> : (
        <ul className="mt-2 space-y-2">
          {pub.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--bg-surface)' }}>
              <Link href={`/verse/${groupSlug}/essays/${e.id}`} className="font-bold no-underline" style={{ color: 'var(--verse-ink)' }}>{e.title}</Link>
              {e.is_hero ? <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: 'var(--verse-cta, var(--verse-accent))', color: 'var(--verse-cta-text, var(--verse-accent-text))' }}>Hero</span> : null}
              <span className="ml-auto flex gap-1.5">
                <button type="button" onClick={() => void essayAction(e.id, e.is_hero ? 'unhero' : 'hero')} className={B} style={{ borderColor: 'var(--verse-line)', color: 'var(--verse-ink)' }}>{e.is_hero ? 'Remove hero' : 'Make hero'}</button>
                <button type="button" onClick={() => { const n = window.prompt('Reason to unpublish (logged):') ?? undefined; if (n !== undefined) void essayAction(e.id, 'unpublish', n); }} className={B} style={{ borderColor: 'var(--verse-line)', color: 'var(--text-secondary)' }}>Unpublish</button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Series. */}
      <h3 className="mt-5 text-sm font-bold" style={{ color: 'var(--verse-ink)' }}>Series</h3>
      {proposed.length ? (
        <div className="mt-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-tertiary">Proposed</p>
          <ul className="mt-1 space-y-1.5">
            {proposed.map((s) => (
              <li key={s.id} className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm" style={{ background: 'var(--bg-surface)' }}>
                <span className="font-semibold" style={{ color: 'var(--verse-ink)' }}>{s.title}</span>
                <span className="ml-auto flex gap-1.5">
                  <button type="button" onClick={() => void seriesAction(s.id, 'approve')} className="v-tap rounded-full px-3 py-1 text-xs font-bold" style={{ background: 'var(--verse-cta, var(--verse-accent))', color: 'var(--verse-cta-text, var(--verse-accent-text))' }}>Approve</button>
                  <button type="button" onClick={() => void seriesAction(s.id, 'delete')} className={B} style={{ borderColor: 'var(--verse-line)', color: 'var(--text-secondary)' }}>Discard</button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {approved.length ? (
        <ul className="mt-2 space-y-1.5">
          {approved.map((s, i) => (
            <li key={s.id} className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm" style={{ background: 'var(--bg-surface)' }}>
              <span className="font-semibold" style={{ color: 'var(--verse-ink)' }}>{s.title}</span>
              <span className="ml-auto flex gap-1">
                <button type="button" aria-label={`Move ${s.title} up`} aria-disabled={i === 0} onClick={() => void seriesAction(s.id, 'move', { dir: 'up' })} className="v-tap px-1.5 text-tertiary aria-disabled:opacity-30">‹</button>
                <button type="button" aria-label={`Move ${s.title} down`} aria-disabled={i === approved.length - 1} onClick={() => void seriesAction(s.id, 'move', { dir: 'down' })} className="v-tap px-1.5 text-tertiary aria-disabled:opacity-30">›</button>
                <button type="button" onClick={() => { const t = window.prompt('Rename series:', s.title); if (t?.trim()) void seriesAction(s.id, 'rename', { title: t.trim() }); }} className={B} style={{ borderColor: 'var(--verse-line)', color: 'var(--text-secondary)' }}>Rename</button>
              </span>
            </li>
          ))}
        </ul>
      ) : proposed.length ? null : <p className="mt-1 text-xs text-tertiary">No series yet.</p>}
    </section>
  );
}
