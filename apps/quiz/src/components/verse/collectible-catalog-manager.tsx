'use client';

import { useCallback, useEffect, useState } from 'react';
import { EmptyState } from '@/components/verse/primitives/empty-state';

import { useBuildMode } from '@/components/verse/build-mode';

// V-CARDS-MAX step 6 - the SHELF's curator side (parity with the reader shelf).
// Same shape as the photocard manager: contributors submit, curators publish
// (source-gated) and review. Lives in Build mode.
const KINDS = ['lightstick', 'merch'];

interface Draft { id: number; name: string; kind: string; category: string | null; era: string | null; version: string | null; source_url: string | null }

export function CollectibleCatalogManager({ groupId }: { groupId: number }): React.ReactElement | null {
  const { on } = useBuildMode();
  const [role, setRole] = useState('visitor');
  const [form, setForm] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isContributor = ['contributor', 'curator', 'space_admin'].includes(role);
  const isCurator = ['curator', 'space_admin'].includes(role);

  const loadDrafts = useCallback(() => {
    fetch(`/api/verse/collectibles?group_id=${groupId}&scope=review`).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d?.drafts) setDrafts(d.drafts); }).catch(() => {});
  }, [groupId]);

  useEffect(() => {
    if (!on) return;
    fetch(`/api/verse/membership?group_id=${groupId}`, { credentials: 'include' }).then((r) => (r.ok ? r.json() : null)).then((d) => setRole(d?.role ?? 'visitor')).catch(() => {});
  }, [on, groupId]);
  useEffect(() => { if (on && isCurator) loadDrafts(); }, [on, isCurator, loadDrafts]);

  if (!on || !isContributor) return null;

  async function submit(publish: boolean): Promise<void> {
    if (!form.name?.trim()) { setMsg('A name is required.'); return; }
    if (!form.kind) { setMsg('Pick lightstick or merch.'); return; }
    if (publish && !form.source_url?.trim()) { setMsg('Publishing needs a source link.'); return; }
    setBusy(true);
    const res = await fetch('/api/verse/collectibles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ group_id: groupId, publish, ...form }) });
    setBusy(false);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(d.error === 'source_required' ? 'Publishing needs a source link.' : d.error ?? 'Could not save. Try again.'); return; }
    setMsg(d.status === 'published' ? 'Item published.' : 'Submitted for review.'); setForm({}); if (isCurator) loadDrafts();
  }
  async function publishDraft(dft: Draft): Promise<void> {
    const res = await fetch('/api/verse/collectibles', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: dft.id, status: 'published' }) });
    if (res.ok) loadDrafts(); else setMsg('That submission still needs a source.');
  }
  async function reject(dft: Draft): Promise<void> {
    if (!confirm(`Reject "${dft.name}"?`)) return;
    await fetch(`/api/verse/collectibles?id=${dft.id}`, { method: 'DELETE' });
    loadDrafts();
  }

  const field = 'rounded-lg border bg-transparent px-2.5 py-1.5 text-sm';
  const border = { borderColor: 'var(--verse-line)' };

  return (
    <section aria-label="Manage the shelf" className="mt-8 rounded-2xl border p-4 sm:p-5" style={{ borderColor: 'var(--verse-cta, var(--verse-accent))', background: 'var(--verse-soft)' }}>
      <h2 className="v-section-title">Manage the shelf</h2>
      <div className="v-section-rule" aria-hidden />
      <p className="mb-3 max-w-[66ch] text-xs text-tertiary">{isCurator ? 'Add lightsticks and merch; every published item needs a source. Review submissions below.' : 'Add items for a curator to review; include a source when you can.'}</p>

      <div className="grid gap-2 sm:grid-cols-2">
        <input placeholder="Name (required)" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className={field} style={border} aria-label="Name" />
        <select value={form.kind ?? ''} onChange={(e) => setForm({ ...form, kind: e.target.value })} className={field} style={border} aria-label="Kind"><option value="">Kind (required)</option>{KINDS.map((k) => <option key={k} value={k}>{k}</option>)}</select>
        <input placeholder="Category" value={form.category ?? ''} onChange={(e) => setForm({ ...form, category: e.target.value })} className={field} style={border} aria-label="Category" />
        <input placeholder="Version" value={form.version ?? ''} onChange={(e) => setForm({ ...form, version: e.target.value })} className={field} style={border} aria-label="Version" />
        <input placeholder="Source URL (official listing)" value={form.source_url ?? ''} onChange={(e) => setForm({ ...form, source_url: e.target.value })} className={`${field} sm:col-span-2`} style={border} aria-label="Source URL" />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {isCurator ? <button type="button" onClick={() => void submit(true)} disabled={busy} className="v-tap rounded-full px-4 py-1.5 text-sm font-bold" style={{ background: 'var(--verse-cta, var(--verse-accent))', color: 'var(--verse-cta-text, var(--verse-accent-text))' }}>Publish item</button> : null}
        <button type="button" onClick={() => void submit(false)} disabled={busy} className="v-tap rounded-full border px-4 py-1.5 text-sm font-bold" style={{ ...border, color: 'var(--verse-ink)' }}>{isCurator ? 'Save as draft' : 'Submit for review'}</button>
        {msg ? <span role="status" className="text-xs text-secondary">{msg}</span> : null}
      </div>

      {isCurator ? (
        <div className="mt-6">
          <h3 className="text-sm font-bold" style={{ color: 'var(--verse-ink)' }}>Review queue <span className="tabular-nums text-tertiary">{drafts.length}</span></h3>
          {drafts.length === 0 ? <EmptyState className="mt-1" headline="No submissions waiting." /> : (
            <ul className="mt-2 space-y-2">
              {drafts.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--bg-surface)' }}>
                  <span className="font-bold" style={{ color: 'var(--verse-ink)' }}>{d.name}</span>
                  <span className="text-xs text-tertiary">{[d.kind, d.version, d.category].filter(Boolean).join(' · ')}</span>
                  {d.source_url ? <a href={d.source_url} target="_blank" rel="noreferrer noopener" className="text-xs verse-link">source</a> : <span className="text-xs font-semibold" style={{ color: 'var(--verse-cta, var(--verse-accent))' }}>needs a source</span>}
                  <span className="ml-auto flex gap-1.5">
                    <button type="button" onClick={() => void publishDraft(d)} disabled={!d.source_url} className="v-tap rounded-full px-3 py-1 text-xs font-bold disabled:opacity-40" style={{ background: 'var(--verse-cta, var(--verse-accent))', color: 'var(--verse-cta-text, var(--verse-accent-text))' }}>Publish</button>
                    <button type="button" onClick={() => void reject(d)} className="v-tap rounded-full border px-3 py-1 text-xs font-semibold text-secondary" style={border}>Reject</button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
