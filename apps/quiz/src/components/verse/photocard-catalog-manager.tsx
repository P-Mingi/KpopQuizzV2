'use client';

import { useCallback, useEffect, useState } from 'react';

import { useBuildMode } from '@/components/verse/build-mode';

// V-CARDS-MAX step 6 - the CURATOR side (editor parity: ships with the binder).
// Lives in Build mode. Contributors SUBMIT cards as drafts; curators publish
// (source-gated: no source, no publish) and work the review queue. The API
// enforces the same gates, so this UI only mirrors them.
const TYPES = ['album', 'pob', 'fansign', 'fanmeeting', 'event', 'trading', 'season_greetings', 'md', 'other'];

interface Draft { id: number; name: string; era: string | null; version: string | null; card_type: string | null; source_url: string | null; source_note: string | null }
interface Opt { id: number; label: string }

export function PhotocardCatalogManager({ groupId, albums, idols }: {
  groupId: number; albums: Opt[]; idols: Opt[];
}): React.ReactElement | null {
  const { on } = useBuildMode();
  const [role, setRole] = useState('visitor');
  const [form, setForm] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isContributor = ['contributor', 'curator', 'space_admin'].includes(role);
  const isCurator = ['curator', 'space_admin'].includes(role);

  const loadDrafts = useCallback(() => {
    fetch(`/api/verse/photocards?group_id=${groupId}&scope=review`).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d?.drafts) setDrafts(d.drafts); }).catch(() => {});
  }, [groupId]);

  useEffect(() => {
    if (!on) return;
    fetch(`/api/verse/membership?group_id=${groupId}`, { credentials: 'include' }).then((r) => (r.ok ? r.json() : null)).then((d) => setRole(d?.role ?? 'visitor')).catch(() => {});
  }, [on, groupId]);
  useEffect(() => { if (on && isCurator) loadDrafts(); }, [on, isCurator, loadDrafts]);

  if (!on || !isContributor) return null;

  async function submit(publish: boolean): Promise<void> {
    if (!form.name?.trim()) { setMsg('A card name is required.'); return; }
    if (publish && !form.source_url?.trim()) { setMsg('Publishing needs a source link (an official listing).'); return; }
    setBusy(true);
    const res = await fetch('/api/verse/photocards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ group_id: groupId, publish, ...form }) });
    setBusy(false);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(d.error === 'source_required' ? 'Publishing needs a source link.' : d.error === 'publish_needs_curator' ? 'Only curators can publish; submitted as a draft instead.' : d.error ?? 'Could not save.'); return; }
    setMsg(d.status === 'published' ? 'Card published.' : 'Submitted for review. A curator will publish it.'); setForm({}); if (isCurator) loadDrafts();
  }
  async function publishDraft(dft: Draft): Promise<void> {
    const res = await fetch('/api/verse/photocards', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: dft.id, status: 'published' }) });
    if (res.ok) loadDrafts(); else setMsg('That submission still needs a source before it can publish.');
  }
  async function reject(dft: Draft): Promise<void> {
    if (!confirm(`Reject and delete "${dft.name}"?`)) return;
    await fetch(`/api/verse/photocards?id=${dft.id}`, { method: 'DELETE' });
    loadDrafts();
  }

  const field = 'rounded-lg border bg-transparent px-2.5 py-1.5 text-sm';
  const border = { borderColor: 'var(--verse-line)' };

  return (
    <section aria-label="Manage the catalog" className="mt-8 rounded-2xl border p-4 sm:p-5" style={{ borderColor: 'var(--verse-cta, var(--verse-accent))', background: 'var(--verse-soft)' }}>
      <h2 className="v-section-title">Manage the catalog</h2>
      <div className="v-section-rule" aria-hidden />
      <p className="mb-3 max-w-[66ch] text-xs text-tertiary">{isCurator ? 'Add cards and publish them; every published card needs a source (an official listing). Review contributor submissions below.' : 'Add cards for a curator to review. Include a source when you can; curators publish once it is sourced.'}</p>

      <div className="grid gap-2 sm:grid-cols-2">
        <input placeholder="Card name (required)" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className={field} style={border} aria-label="Card name" />
        <select value={form.card_type ?? ''} onChange={(e) => setForm({ ...form, card_type: e.target.value })} className={field} style={border} aria-label="Type"><option value="">Type</option>{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
        <select value={form.album_id ?? ''} onChange={(e) => setForm({ ...form, album_id: e.target.value })} className={field} style={border} aria-label="Set (album)"><option value="">Set (album)</option>{albums.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</select>
        <select value={form.idol_id ?? ''} onChange={(e) => setForm({ ...form, idol_id: e.target.value })} className={field} style={border} aria-label="Member"><option value="">Member</option>{idols.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}</select>
        <input placeholder="Era" value={form.era ?? ''} onChange={(e) => setForm({ ...form, era: e.target.value })} className={field} style={border} aria-label="Era" />
        <input placeholder="Version" value={form.version ?? ''} onChange={(e) => setForm({ ...form, version: e.target.value })} className={field} style={border} aria-label="Version" />
        <input placeholder="Source URL (official listing)" value={form.source_url ?? ''} onChange={(e) => setForm({ ...form, source_url: e.target.value })} className={`${field} sm:col-span-2`} style={border} aria-label="Source URL" />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {isCurator ? <button type="button" onClick={() => void submit(true)} disabled={busy} className="v-tap rounded-full px-4 py-1.5 text-sm font-bold" style={{ background: 'var(--verse-cta, var(--verse-accent))', color: 'var(--verse-cta-text, var(--verse-accent-text))' }}>Publish card</button> : null}
        <button type="button" onClick={() => void submit(false)} disabled={busy} className="v-tap rounded-full border px-4 py-1.5 text-sm font-bold" style={{ ...border, color: 'var(--verse-ink)' }}>{isCurator ? 'Save as draft' : 'Submit for review'}</button>
        {msg ? <span role="status" className="text-xs text-secondary">{msg}</span> : null}
      </div>

      {isCurator ? (
        <div className="mt-6">
          <h3 className="text-sm font-bold" style={{ color: 'var(--verse-ink)' }}>Review queue <span className="tabular-nums text-tertiary">{drafts.length}</span></h3>
          {drafts.length === 0 ? (
            <p className="mt-1 text-xs text-tertiary">No submissions waiting.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {drafts.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--bg-surface)' }}>
                  <span className="font-bold" style={{ color: 'var(--verse-ink)' }}>{d.name}</span>
                  <span className="text-xs text-tertiary">{[d.era, d.version, d.card_type].filter(Boolean).join(' · ')}</span>
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
