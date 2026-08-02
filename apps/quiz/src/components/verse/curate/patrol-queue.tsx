'use client';

import { useCallback, useEffect, useState } from 'react';
import { EmptyState } from '@/components/verse/primitives/empty-state';

interface Flag { id: number; target_type: string; target_id: number; reporter: string | null; reason: string; created_at: string; preview: string; targetStatus: string }

/** W4.8 - curator patrol queue: open flags (reports + banned-term auto-flags) with actions. */
export function PatrolQueue({ groupId }: { groupId: number }): React.ReactElement {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/verse/flags?group_id=${groupId}`);
    if (r.ok) setFlags((await r.json()).flags ?? []);
  }, [groupId]);
  useEffect(() => { load(); }, [load]);

  async function act(id: number, action: string) {
    setBusy(true);
    const r = await fetch('/api/verse/flags', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action }) });
    setBusy(false);
    if (r.ok) load(); else alert((await r.json()).error ?? 'error');
  }

  if (flags.length === 0) return <EmptyState headline="Nothing flagged." body="The queue is clear." />;

  return (
    <ul className="space-y-2">
      {flags.map((f) => (
        <li key={f.id} className="rounded-xl border border-default p-3 text-sm">
          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded px-1.5 py-0.5 font-bold uppercase text-tertiary" style={{ border: '1px solid var(--border)' }}>{f.target_type}</span>
            <span className="text-secondary">{f.reason}</span>
            <span className="text-tertiary">{f.reporter ? 'reported' : 'auto-flag'}</span>
          </div>
          <p className="rounded-lg px-3 py-2 text-secondary" style={{ background: 'var(--verse-soft, var(--surface-1))' }}>{f.preview.slice(0, 300)}</p>
          <div className="mt-2 flex gap-2">
            {f.target_type === 'comment' && f.targetStatus === 'visible' ? <button onClick={() => act(f.id, 'hide')} disabled={busy} className="rounded border border-default px-2 py-1 text-xs font-semibold">Hide comment</button> : null}
            <button onClick={() => act(f.id, 'resolve')} disabled={busy} className="rounded border border-default px-2 py-1 text-xs">Resolve</button>
            <button onClick={() => act(f.id, 'dismiss')} disabled={busy} className="rounded border border-default px-2 py-1 text-xs text-tertiary">Dismiss</button>
          </div>
        </li>
      ))}
    </ul>
  );
}
