'use client';

import { useState } from 'react';

export interface HiddenRow { id: number; type: string; preview: string; reports: number; hiddenAt: string; href: string | null }

const LABEL: Record<string, string> = { thread: 'Thread', essay: 'Blog', comment: 'Reply', debate: 'Debate', challenge: 'Challenge', reply: 'Reply' };

export function RestoreList({ rows }: { rows: HiddenRow[] }): React.ReactElement {
  const [done, setDone] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!rows.length) return <p className="text-sm text-secondary">Nothing is hidden right now.</p>;

  const restore = async (id: number): Promise<void> => {
    setBusy(id);
    setError(null);
    const r = await fetch('/api/admin/community-reports', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) }).catch(() => null);
    setBusy(null);
    if (!r || !r.ok) { setError('That did not restore. Try again.'); return; }
    setDone((s) => new Set(s).add(id));
  };

  return (
    <>
      {error ? <p className="text-sm mb-2" role="alert">{error}</p> : null}
      <ul className="divide-y divide-[var(--border)] border border-default rounded-lg">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-3 p-3 text-sm">
            <span className="text-xs font-medium text-secondary w-20 shrink-0">{LABEL[r.type] ?? r.type}</span>
            <span className="flex-1 min-w-0">
              <span className="block text-primary truncate">{r.href && done.has(r.id) ? <a href={r.href} className="underline">{r.preview}</a> : r.preview}</span>
              <span className="block text-xs text-secondary">{r.reports} reports · hidden {new Date(r.hiddenAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</span>
            </span>
            {done.has(r.id)
              ? <span className="text-xs text-secondary">Restored</span>
              : <button type="button" className="px-3 py-1.5 rounded-md border border-default text-primary disabled:opacity-60" disabled={busy === r.id} onClick={() => { void restore(r.id); }}>{busy === r.id ? 'Restoring...' : 'Restore'}</button>}
          </li>
        ))}
      </ul>
    </>
  );
}
