'use client';

import { useCallback, useEffect, useState } from 'react';

import { diffLines } from '@/lib/verse/diff';

interface Suggestion {
  id: number; entity_type: string; entity_id: string; section_key: string;
  author: string | null; content: unknown; current: unknown; summary: string | null; minor: boolean; created_at: string;
}

export function SuggestionsQueue(): React.ReactElement {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(() => {
    fetch('/api/verse/suggestions').then((r) => r.ok ? r.json() : { suggestions: [] })
      .then((d) => { setItems(d.suggestions ?? []); setLoaded(true); }).catch(() => setLoaded(true));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function act(body: Record<string, unknown>) {
    setBusy(true);
    await fetch('/api/verse/suggestions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setBusy(false); load();
  }

  const minorCount = items.filter((s) => s.minor).length;

  return (
    <div className="pb-16">
      <h1 className="text-xl font-semibold text-primary">Suggestion review</h1>
      <p className="mb-4 text-sm text-secondary">Pending edit suggestions from visitors and members. Approving applies the change as a revision attributed to the suggester.</p>

      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm text-secondary">{items.length} pending{minorCount ? ` · ${minorCount} minor` : ''}</span>
        {minorCount > 0 ? <button disabled={busy} onClick={() => act({ action: 'approve_minors' })} className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-white disabled:opacity-50">Approve all {minorCount} minor</button> : null}
      </div>

      {loaded && items.length === 0 ? <p className="rounded-xl border border-default bg-surface px-5 py-8 text-center text-secondary">No pending suggestions.</p> : null}

      <div className="space-y-4">
        {items.map((s) => {
          const diff = diffLines(s.current, s.content);
          return (
            <div key={s.id} className="rounded-xl border border-default bg-surface p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-bold text-primary">{s.entity_type} #{s.entity_id} · {s.section_key}</span>
                {s.minor ? <span className="rounded px-1 text-[9px] font-bold uppercase bg-accent-subtle text-accent">minor</span> : null}
                <span className="text-tertiary">{s.summary || '(no summary)'} · {s.author ? s.author.slice(0, 8) : 'anonymous'} · {s.created_at.slice(0, 16).replace('T', ' ')}</span>
              </div>
              <pre className="mb-2 overflow-x-auto rounded-lg border border-default p-2 text-[12px] leading-relaxed">
                {diff.map((d, k) => (
                  <div key={k} style={{ color: d.type === 'add' ? '#0F6E56' : d.type === 'del' ? '#A32D2D' : 'var(--text-secondary)', background: d.type === 'add' ? 'rgba(15,110,86,0.08)' : d.type === 'del' ? 'rgba(163,45,45,0.08)' : 'transparent' }}>
                    <span className="select-none opacity-60">{d.type === 'add' ? '+ ' : d.type === 'del' ? '- ' : '  '}</span>{d.text || ' '}
                  </div>
                ))}
              </pre>
              <div className="flex gap-2">
                <button disabled={busy} onClick={() => act({ action: 'approve', id: s.id })} className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-white disabled:opacity-50">Approve</button>
                <button disabled={busy} onClick={() => { const reason = window.prompt('Reject reason (optional):') ?? ''; act({ action: 'reject', id: s.id, reason }); }} className="rounded-full border border-default px-3 py-1 text-xs font-semibold text-secondary">Reject</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
