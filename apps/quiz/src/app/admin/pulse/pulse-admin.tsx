'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import type { CitationRow, ReportRow } from './page';

interface Props {
  citations: CitationRow[];
  reports: ReportRow[];
  currentMonth: string;
}

const EMPTY = { source: 'soridata', claim: '', url: 'https://soridata.com', as_of_date: '', active: true, ord: 0 };

export function PulseAdmin({ citations, reports, currentMonth }: Props): React.ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Citation form (add when editingId === null, edit otherwise).
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Regenerate.
  const [regenMonth, setRegenMonth] = useState(currentMonth);
  const [regenerating, setRegenerating] = useState(false);
  const [regenMsg, setRegenMsg] = useState<string | null>(null);

  function startNew(): void {
    setEditingId(null);
    setForm({ ...EMPTY, ord: citations.length });
    setError(null);
    setShowForm(true);
  }

  function startEdit(c: CitationRow): void {
    setEditingId(c.id);
    setForm({ source: c.source, claim: c.claim, url: c.url, as_of_date: c.as_of_date, active: c.active, ord: c.ord });
    setError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(editingId === null ? '/api/admin/pulse-citations' : `/api/admin/pulse-citations/${editingId}`, {
        method: editingId === null ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { setError(data.error ?? 'Save failed'); return; }
      setShowForm(false);
      startTransition(() => router.refresh());
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(c: CitationRow): Promise<void> {
    const res = await fetch(`/api/admin/pulse-citations/${c.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...c, active: !c.active }),
    });
    if (res.ok) startTransition(() => router.refresh());
  }

  async function handleDelete(c: CitationRow): Promise<void> {
    if (!window.confirm(`Delete this ${c.source} citation? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/pulse-citations/${c.id}`, { method: 'DELETE' });
    if (res.ok) startTransition(() => router.refresh());
  }

  async function handleRegenerate(): Promise<void> {
    if (!/^\d{4}-\d{2}$/.test(regenMonth)) { setRegenMsg('Month must be YYYY-MM'); return; }
    setRegenerating(true);
    setRegenMsg(null);
    try {
      // announce=0 keeps this silent (no Discord post from an admin regenerate).
      const res = await fetch(`/api/cron/pulse-generate?month=${regenMonth}&announce=0`);
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; headline?: { fandom: string | null; plays: number; newFans: number }; error?: string };
      if (!res.ok || !data.ok) { setRegenMsg(data.error ?? 'Regeneration failed'); return; }
      const h = data.headline;
      setRegenMsg(`Regenerated ${regenMonth}: ${h?.fandom ?? 'no fandom'}, ${h?.plays?.toLocaleString('en-US') ?? 0} plays, ${h?.newFans ?? 0} new fans. Public page refreshes within the hour (ISR).`);
      startTransition(() => router.refresh());
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div className="aiv-page">
      <div className="aiv-header">
        <div>
          <h1 className="aiv-title">Monthly Pulse</h1>
          <p className="aiv-subtitle">
            Edit the context-corner citations and regenerate a month. Citations are baked into each report
            at generation, so a change only shows on the public page after you regenerate that month.
          </p>
        </div>
        <button type="button" className="aiv-add-btn" onClick={startNew}>+ Add citation</button>
      </div>

      {/* Regenerate */}
      <div className="aiv-form" style={{ marginBottom: 24 }}>
        <div className="aiv-form-row" style={{ alignItems: 'flex-end' }}>
          <label className="aiv-label" style={{ maxWidth: 160 }}>
            Month to regenerate
            <input className="aiv-input" value={regenMonth} onChange={(e) => setRegenMonth(e.target.value)} placeholder="YYYY-MM" />
          </label>
          <button type="button" className="aiv-submit" onClick={handleRegenerate} disabled={regenerating} style={{ maxWidth: 200 }}>
            {regenerating ? 'Regenerating...' : `Regenerate ${regenMonth}`}
          </button>
        </div>
        {regenMsg && <p className="aiv-snippet-text" style={{ margin: 0 }}>{regenMsg}</p>}
        {reports.length > 0 && (
          <p className="aiv-notes-text" style={{ margin: 0 }}>
            Generated months: {reports.map((r) => `${r.month} (${r.fandom ?? 'n/a'}, ${r.plays.toLocaleString('en-US')} plays)`).join('  ·  ')}
          </p>
        )}
      </div>

      {/* Citation form */}
      {showForm && (
        <form className="aiv-form" onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
          <div className="aiv-form-row">
            <label className="aiv-label">
              Source
              <input className="aiv-input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} required />
            </label>
            <label className="aiv-label">
              As of date
              <input className="aiv-input" type="date" value={form.as_of_date} onChange={(e) => setForm({ ...form, as_of_date: e.target.value })} required />
            </label>
            <label className="aiv-label" style={{ maxWidth: 100 }}>
              Order
              <input className="aiv-input" type="number" value={form.ord} onChange={(e) => setForm({ ...form, ord: Number(e.target.value) })} />
            </label>
          </div>
          <label className="aiv-label">
            URL
            <input className="aiv-input" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} required />
          </label>
          <label className="aiv-label">
            Claim (the sentence shown, e.g. &ldquo;According to soridata, ...&rdquo;)
            <textarea className="aiv-textarea" rows={2} value={form.claim} onChange={(e) => setForm({ ...form, claim: e.target.value })} required />
          </label>
          <label className="aiv-checkbox-label aiv-label">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            Active (shown on the public page)
          </label>
          {error && <p className="aiv-snippet-text" style={{ color: '#dc2626', margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="aiv-submit" disabled={saving}>{saving ? 'Saving...' : editingId === null ? 'Add citation' : 'Save changes'}</button>
            <button type="button" className="aiv-filter-tab" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {/* Citations table */}
      {citations.length === 0 ? (
        <p className="aiv-empty">No citations yet. Add one to fill the context corner.</p>
      ) : (
        <div className="aiv-table-wrap">
          <table className="aiv-table">
            <thead>
              <tr>
                <th>Ord</th>
                <th>Source</th>
                <th>Claim</th>
                <th>As of</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {citations.map((c) => (
                <tr key={c.id} className={c.active ? 'aiv-row-yes' : undefined}>
                  <td>{c.ord}</td>
                  <td style={{ textTransform: 'capitalize' }}>{c.source}</td>
                  <td className="aiv-td-snippet">
                    <p className="aiv-snippet-text" style={{ margin: 0 }}>{c.claim}</p>
                    <a className="aiv-notes-text" href={c.url} target="_blank" rel="noopener noreferrer" style={{ fontStyle: 'normal', color: 'var(--brand)' }}>{c.url}</a>
                  </td>
                  <td className="aiv-td-date">{c.as_of_date}</td>
                  <td>
                    <button type="button" className={`aiv-cited ${c.active ? 'yes' : 'no'}`} onClick={() => toggleActive(c)} style={{ cursor: 'pointer', border: 'none' }}>
                      {c.active ? 'active' : 'hidden'}
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" className="aiv-filter-tab" onClick={() => startEdit(c)}>Edit</button>
                      <button type="button" className="aiv-filter-tab" onClick={() => handleDelete(c)} style={{ color: '#dc2626' }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isPending && <div className="aiv-loading">Refreshing...</div>}
    </div>
  );
}
