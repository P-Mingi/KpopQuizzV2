'use client';

import { useEffect, useState } from 'react';
import { SectionHeader } from '@/components/verse/primitives/section-header';
import { useRouter } from 'next/navigation';

import { diffLines } from '@/lib/verse/diff';

interface Rev { id: number; author: string; author_name?: string; summary: string | null; minor: boolean; content: unknown; created_at: string; }

interface Props {
  entityType: string;
  entityId: string;
  section: string;
  canEdit: boolean;
  onClose: () => void;
}

function fmt(ts: string): string { return ts.slice(0, 16).replace('T', ' '); }

export function HistoryPanel({ entityType, entityId, section, canEdit, onClose }: Props): React.ReactElement {
  const router = useRouter();
  const [revs, setRevs] = useState<Rev[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/verse/history?entity_type=${entityType}&entity_id=${entityId}&section=${section}`)
      .then((r) => r.json()).then((d) => setRevs(d.revisions ?? [])).catch(() => {});
  }, [entityType, entityId, section]);

  async function restore(revisionId: number) {
    setBusy(true);
    const res = await fetch('/api/verse/history', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_type: entityType, entity_id: entityId, section, revision_id: revisionId }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <div className="rounded-xl border border-default bg-surface" style={{ borderColor: 'var(--verse-line)' }}>
      <SectionHeader kicker="History" as="h3" action={<button onClick={onClose} className="text-xs font-semibold text-secondary hover:text-primary">Close</button>} className="border-b px-3 py-2" />
      {revs.length === 0 ? <p className="px-3 py-4 text-sm text-tertiary">No revisions yet.</p> : (
        <ul className="divide-y divide-[var(--verse-line)]">
          {revs.map((r, i) => {
            const prev = revs[i + 1]; // the version this edit was made from
            const diff = open === r.id ? diffLines(prev?.content ?? { type: 'doc', content: [] }, r.content) : [];
            const isLatest = i === 0;
            return (
              <li key={r.id} className="px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-primary">{r.summary || '(no summary)'}</span>
                  {r.minor ? <span className="rounded px-1 text-[9px] font-bold uppercase" style={{ background: 'var(--verse-soft)', color: 'var(--verse-ink)' }}>minor</span> : null}
                  <span className="text-[11px] text-tertiary">{fmt(r.created_at)} · {r.author_name ?? r.author.slice(0, 8)}</span>
                  <span className="ml-auto flex gap-2">
                    <button onClick={() => setOpen(open === r.id ? null : r.id)} className="text-[11px] font-bold" style={{ color: 'var(--verse-ink)' }}>{open === r.id ? 'Hide diff' : 'Diff'}</button>
                    {canEdit && !isLatest ? <button disabled={busy} onClick={() => restore(r.id)} className="text-[11px] font-bold text-secondary hover:text-primary">Restore</button> : null}
                    {canEdit && isLatest && prev ? <button disabled={busy} onClick={() => restore(prev.id)} className="text-[11px] font-bold text-secondary hover:text-primary">Undo</button> : null}
                  </span>
                </div>
                {open === r.id ? (
                  <pre className="mt-2 overflow-x-auto rounded-lg border border-default p-2 text-[12px] leading-relaxed" style={{ borderColor: 'var(--verse-line)' }}>
                    {diff.map((d, k) => (
                      <div key={k} style={{ color: d.type === 'add' ? '#0F6E56' : d.type === 'del' ? '#A32D2D' : 'var(--txt2)', background: d.type === 'add' ? 'color-mix(in srgb, #0F6E56 10%, transparent)' : d.type === 'del' ? 'color-mix(in srgb, #A32D2D 10%, transparent)' : 'transparent' }}>
                        <span className="select-none opacity-60">{d.type === 'add' ? '+ ' : d.type === 'del' ? '- ' : '  '}</span>{d.text || ' '}
                      </div>
                    ))}
                  </pre>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
