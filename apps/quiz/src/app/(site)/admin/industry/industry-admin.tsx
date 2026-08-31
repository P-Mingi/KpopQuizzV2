'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import type { MvRow, ComebackRow, GroupOption } from './page';

interface Props {
  mvs: MvRow[];
  comebacks: ComebackRow[];
  groups: GroupOption[];
  spotifyTracked: number;
}

const MV_EMPTY = { video_id: '', title: '', artist: '', group_id: '' as number | '' , category: 'comeback' as 'comeback' | 'evergreen', active: true };
const CB_EMPTY = { group_id: '' as number | '', artist: '', title: '', release_date: '', kind: 'single' as string, active: true };

function fmtViews(n: number | null): string {
  if (n == null) return 'no snapshot yet';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('en-US');
}

export function IndustryAdmin({ mvs, comebacks, groups, spotifyTracked }: Props): React.ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // MV form
  const [mvForm, setMvForm] = useState({ ...MV_EMPTY });
  const [mvEditingId, setMvEditingId] = useState<number | null>(null);
  const [mvShowForm, setMvShowForm] = useState(false);
  const [mvSaving, setMvSaving] = useState(false);
  const [mvError, setMvError] = useState<string | null>(null);

  // Comeback form
  const [cbForm, setCbForm] = useState({ ...CB_EMPTY });
  const [cbEditingId, setCbEditingId] = useState<number | null>(null);
  const [cbShowForm, setCbShowForm] = useState(false);
  const [cbSaving, setCbSaving] = useState(false);
  const [cbError, setCbError] = useState<string | null>(null);

  // Run-now
  const [running, setRunning] = useState(false);
  const [runMsg, setRunMsg] = useState<string | null>(null);

  const groupName = (id: number | null): string => (id == null ? '' : groups.find((g) => g.id === id)?.name ?? `#${id}`);

  async function send(url: string, method: string, body?: unknown): Promise<{ ok: boolean; error: string }> {
    const res = await fetch(url, { method, ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: res.ok, error: data.error ?? '' };
  }

  // ---- MVs ----
  function newMv(): void { setMvEditingId(null); setMvForm({ ...MV_EMPTY }); setMvError(null); setMvShowForm(true); }
  function editMv(m: MvRow): void {
    setMvEditingId(m.id);
    setMvForm({ video_id: m.video_id, title: m.title, artist: m.artist, group_id: m.group_id ?? '', category: m.category, active: m.active });
    setMvError(null); setMvShowForm(true);
  }
  async function submitMv(e: React.FormEvent): Promise<void> {
    e.preventDefault(); setMvSaving(true); setMvError(null);
    try {
      const payload = { ...mvForm, group_id: mvForm.group_id === '' ? null : Number(mvForm.group_id) };
      const r = await send(mvEditingId === null ? '/api/admin/mv-tracking' : `/api/admin/mv-tracking/${mvEditingId}`, mvEditingId === null ? 'POST' : 'PUT', payload);
      if (!r.ok) { setMvError(r.error || 'Save failed'); return; }
      setMvShowForm(false); startTransition(() => router.refresh());
    } finally { setMvSaving(false); }
  }
  async function toggleMv(m: MvRow): Promise<void> {
    const r = await send(`/api/admin/mv-tracking/${m.id}`, 'PUT', { video_id: m.video_id, title: m.title, artist: m.artist, group_id: m.group_id, category: m.category, active: !m.active });
    if (r.ok) startTransition(() => router.refresh());
  }
  async function deleteMv(m: MvRow): Promise<void> {
    if (!window.confirm(`Delete "${m.title}" and all its snapshots? This cannot be undone.`)) return;
    const r = await send(`/api/admin/mv-tracking/${m.id}`, 'DELETE');
    if (r.ok) startTransition(() => router.refresh());
  }

  // ---- Comebacks ----
  function newCb(): void { setCbEditingId(null); setCbForm({ ...CB_EMPTY }); setCbError(null); setCbShowForm(true); }
  function editCb(c: ComebackRow): void {
    setCbEditingId(c.id);
    setCbForm({ group_id: c.group_id ?? '', artist: c.artist, title: c.title, release_date: c.release_date, kind: c.kind, active: c.active });
    setCbError(null); setCbShowForm(true);
  }
  async function submitCb(e: React.FormEvent): Promise<void> {
    e.preventDefault(); setCbSaving(true); setCbError(null);
    try {
      const payload = { ...cbForm, group_id: cbForm.group_id === '' ? null : Number(cbForm.group_id) };
      const r = await send(cbEditingId === null ? '/api/admin/comebacks' : `/api/admin/comebacks/${cbEditingId}`, cbEditingId === null ? 'POST' : 'PUT', payload);
      if (!r.ok) { setCbError(r.error || 'Save failed'); return; }
      setCbShowForm(false); startTransition(() => router.refresh());
    } finally { setCbSaving(false); }
  }
  async function deleteCb(c: ComebackRow): Promise<void> {
    if (!window.confirm(`Delete the "${c.title}" comeback entry?`)) return;
    const r = await send(`/api/admin/comebacks/${c.id}`, 'DELETE');
    if (r.ok) startTransition(() => router.refresh());
  }

  async function runSnapshot(which: 'mv' | 'spotify'): Promise<void> {
    setRunning(true); setRunMsg(null);
    try {
      const res = await fetch(`/api/cron/${which === 'mv' ? 'mv-snapshot' : 'spotify-snapshot'}`);
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; skipped?: string; snapshotted?: number; note?: string; error?: string };
      if (!res.ok) { setRunMsg(`${which} run failed: ${data.error ?? res.status}`); return; }
      if (data.skipped) setRunMsg(`${which}: skipped (${data.skipped}) - add the API key(s) in env, then run again.`);
      else setRunMsg(`${which}: snapshotted ${data.snapshotted ?? 0}${data.note ? ` (${data.note})` : ''}.`);
      startTransition(() => router.refresh());
    } finally { setRunning(false); }
  }

  const groupSelect = (value: number | '', onChange: (v: number | '') => void): React.ReactElement => (
    <select className="aiv-select" value={value} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}>
      <option value="">(no group link)</option>
      {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
    </select>
  );

  return (
    <div className="aiv-page">
      <div className="aiv-header">
        <div>
          <h1 className="aiv-title">Industry tracking</h1>
          <p className="aiv-subtitle">
            Manage the MVs snapshotted daily (YouTube views) and the comeback calendar. Spotify follower
            snapshots run weekly for the {spotifyTracked} group(s) that have a Spotify artist id. No public
            industry page yet: it launches once a few months of history exist.
          </p>
        </div>
      </div>

      {/* Run-now */}
      <div className="aiv-form" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="aiv-submit" onClick={() => runSnapshot('mv')} disabled={running}>Run daily YouTube snapshot now</button>
          <button type="button" className="aiv-submit" onClick={() => runSnapshot('spotify')} disabled={running}>Run weekly Spotify snapshot now</button>
        </div>
        {runMsg && <p className="aiv-snippet-text" style={{ margin: 0 }}>{runMsg}</p>}
      </div>

      {/* ---- Tracked MVs ---- */}
      <div className="aiv-header">
        <h2 className="aiv-title" style={{ fontSize: 16 }}>Tracked MVs ({mvs.length})</h2>
        <button type="button" className="aiv-add-btn" onClick={newMv}>+ Add MV</button>
      </div>
      {mvShowForm && (
        <form className="aiv-form" onSubmit={submitMv} style={{ marginBottom: 20 }}>
          <div className="aiv-form-row">
            <label className="aiv-label">YouTube video id
              <input className="aiv-input" value={mvForm.video_id} onChange={(e) => setMvForm({ ...mvForm, video_id: e.target.value })} placeholder="11 chars, e.g. gdZLi9oWNZg" required />
            </label>
            <label className="aiv-label">Category
              <select className="aiv-select" value={mvForm.category} onChange={(e) => setMvForm({ ...mvForm, category: e.target.value as 'comeback' | 'evergreen' })}>
                <option value="comeback">comeback</option>
                <option value="evergreen">evergreen</option>
              </select>
            </label>
          </div>
          <div className="aiv-form-row">
            <label className="aiv-label">Artist (display)
              <input className="aiv-input" value={mvForm.artist} onChange={(e) => setMvForm({ ...mvForm, artist: e.target.value })} placeholder="BTS" required />
            </label>
            <label className="aiv-label">Group link (optional)
              {groupSelect(mvForm.group_id, (v) => setMvForm({ ...mvForm, group_id: v }))}
            </label>
          </div>
          <label className="aiv-label">Title
            <input className="aiv-input" value={mvForm.title} onChange={(e) => setMvForm({ ...mvForm, title: e.target.value })} placeholder="Dynamite" required />
          </label>
          <label className="aiv-checkbox-label aiv-label">
            <input type="checkbox" checked={mvForm.active} onChange={(e) => setMvForm({ ...mvForm, active: e.target.checked })} /> Active (snapshotted daily)
          </label>
          {mvError && <p className="aiv-snippet-text" style={{ color: '#dc2626', margin: 0 }}>{mvError}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="aiv-submit" disabled={mvSaving}>{mvSaving ? 'Saving...' : mvEditingId === null ? 'Add MV' : 'Save changes'}</button>
            <button type="button" className="aiv-filter-tab" onClick={() => setMvShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}
      {mvs.length === 0 ? (
        <p className="aiv-empty">No tracked MVs yet. Add some, then run the daily snapshot.</p>
      ) : (
        <div className="aiv-table-wrap" style={{ marginBottom: 28 }}>
          <table className="aiv-table">
            <thead><tr><th>Title</th><th>Artist</th><th>Group</th><th>Cat</th><th>Latest views</th><th>Active</th><th>Actions</th></tr></thead>
            <tbody>
              {mvs.map((m) => (
                <tr key={m.id} className={m.active ? 'aiv-row-yes' : undefined}>
                  <td className="aiv-td-query"><a href={`https://youtu.be/${m.video_id}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand)' }}>{m.title}</a></td>
                  <td>{m.artist}</td>
                  <td className="aiv-td-date">{groupName(m.group_id)}</td>
                  <td className="aiv-td-date">{m.category}</td>
                  <td className="aiv-td-date">{fmtViews(m.latestViews)}{m.latestDate ? ` (${m.latestDate})` : ''}</td>
                  <td><button type="button" className={`aiv-cited ${m.active ? 'yes' : 'no'}`} onClick={() => toggleMv(m)} style={{ cursor: 'pointer', border: 'none' }}>{m.active ? 'active' : 'paused'}</button></td>
                  <td><div style={{ display: 'flex', gap: 6 }}><button type="button" className="aiv-filter-tab" onClick={() => editMv(m)}>Edit</button><button type="button" className="aiv-filter-tab" onClick={() => deleteMv(m)} style={{ color: '#dc2626' }}>Delete</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ---- Comebacks ---- */}
      <div className="aiv-header">
        <h2 className="aiv-title" style={{ fontSize: 16 }}>Comeback calendar ({comebacks.length})</h2>
        <button type="button" className="aiv-add-btn" onClick={newCb}>+ Add comeback</button>
      </div>
      {cbShowForm && (
        <form className="aiv-form" onSubmit={submitCb} style={{ marginBottom: 20 }}>
          <div className="aiv-form-row">
            <label className="aiv-label">Artist
              <input className="aiv-input" value={cbForm.artist} onChange={(e) => setCbForm({ ...cbForm, artist: e.target.value })} required />
            </label>
            <label className="aiv-label">Group link (optional)
              {groupSelect(cbForm.group_id, (v) => setCbForm({ ...cbForm, group_id: v }))}
            </label>
          </div>
          <div className="aiv-form-row">
            <label className="aiv-label">Release date
              <input className="aiv-input" type="date" value={cbForm.release_date} onChange={(e) => setCbForm({ ...cbForm, release_date: e.target.value })} required />
            </label>
            <label className="aiv-label">Kind
              <select className="aiv-select" value={cbForm.kind} onChange={(e) => setCbForm({ ...cbForm, kind: e.target.value })}>
                <option value="single">single</option><option value="ep">ep</option><option value="album">album</option><option value="mv">mv</option>
              </select>
            </label>
          </div>
          <label className="aiv-label">Title
            <input className="aiv-input" value={cbForm.title} onChange={(e) => setCbForm({ ...cbForm, title: e.target.value })} required />
          </label>
          <label className="aiv-checkbox-label aiv-label">
            <input type="checkbox" checked={cbForm.active} onChange={(e) => setCbForm({ ...cbForm, active: e.target.checked })} /> Active
          </label>
          {cbError && <p className="aiv-snippet-text" style={{ color: '#dc2626', margin: 0 }}>{cbError}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="aiv-submit" disabled={cbSaving}>{cbSaving ? 'Saving...' : cbEditingId === null ? 'Add comeback' : 'Save changes'}</button>
            <button type="button" className="aiv-filter-tab" onClick={() => setCbShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}
      {comebacks.length === 0 ? (
        <p className="aiv-empty">No comebacks yet.</p>
      ) : (
        <div className="aiv-table-wrap">
          <table className="aiv-table">
            <thead><tr><th>Release</th><th>Artist</th><th>Title</th><th>Kind</th><th>Group</th><th>Active</th><th>Actions</th></tr></thead>
            <tbody>
              {comebacks.map((c) => (
                <tr key={c.id} className={c.active ? 'aiv-row-yes' : undefined}>
                  <td className="aiv-td-date">{c.release_date}</td>
                  <td>{c.artist}</td>
                  <td className="aiv-td-query">{c.title}</td>
                  <td className="aiv-td-date">{c.kind}</td>
                  <td className="aiv-td-date">{groupName(c.group_id)}</td>
                  <td><span className={`aiv-cited ${c.active ? 'yes' : 'no'}`}>{c.active ? 'active' : 'hidden'}</span></td>
                  <td><div style={{ display: 'flex', gap: 6 }}><button type="button" className="aiv-filter-tab" onClick={() => editCb(c)}>Edit</button><button type="button" className="aiv-filter-tab" onClick={() => deleteCb(c)} style={{ color: '#dc2626' }}>Delete</button></div></td>
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
