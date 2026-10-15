'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface ApproveRow { path: string; label: string; score: number; reasons: string[] }

// The monthly approval of the refresh queue's top 5 (/admin/seo). Every page starts ticked;
// the owner unticks any page he does not want refreshed this month, then approves.
export function ApproveForm({ rows, monthLabel }: { rows: ApproveRow[]; monthLabel: string }): React.ReactElement {
  const router = useRouter();
  const [picked, setPicked] = useState<Set<string>>(() => new Set(rows.map((r) => r.path)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (path: string): void => {
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(path)) n.delete(path);
      else n.add(path);
      return n;
    });
  };

  const submit = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    const r = await fetch('/api/admin/seo-refresh', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ paths: rows.map((x) => x.path).filter((p) => picked.has(p)) }),
    }).catch(() => null);
    setBusy(false);
    if (!r || !r.ok) {
      const body = (await r?.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error === 'already_approved' ? 'This month is already approved.' : `That did not save${body?.error ? ` (${body.error})` : ''}. Try again.`);
      return;
    }
    router.refresh();
  };

  return (
    <div className="mb-6">
      {error ? <p className="text-sm mb-2" role="alert">{error}</p> : null}
      <ul className="divide-y divide-[var(--border)] border border-default rounded-lg mb-3">
        {rows.map((r) => (
          <li key={r.path} className="p-3 text-sm">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" className="mt-1" checked={picked.has(r.path)} onChange={() => toggle(r.path)} />
              <span className="flex-1 min-w-0">
                <span className="block text-primary">{r.label} <span className="text-secondary">({r.path}, score {r.score})</span></span>
                {r.reasons.map((t, i) => <span key={i} className="block text-xs text-secondary">{t}</span>)}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="px-3 py-1.5 rounded-md border border-default text-primary disabled:opacity-60"
        disabled={busy || picked.size === 0}
        onClick={() => { void submit(); }}
      >
        {busy ? 'Saving...' : `Approve ${picked.size} page${picked.size === 1 ? '' : 's'} for ${monthLabel}`}
      </button>
    </div>
  );
}
