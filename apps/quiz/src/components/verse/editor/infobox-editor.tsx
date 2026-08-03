'use client';

import { useState } from 'react';
import { SectionHeader } from '@/components/verse/primitives/section-header';

import type { FieldDef } from '@/lib/verse/fields';

export interface FieldRow { def: FieldDef; value: string; sourceUrl: string; isOverride: boolean; }

interface Props {
  entityType: string;
  entityId: string;
  rows: FieldRow[];
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Typed infobox editor. Only whitelisted fields render (structural living-persons:
 * no personal-life field exists in the registry). Every fact edit requires a
 * source; Save is blocked without one. Writes entity_overrides (W1 precedence).
 */
export function InfoboxEditor({ entityType, entityId, rows: initialRows, onClose, onSaved }: Props): React.ReactElement {
  const [rows, setRows] = useState(initialRows);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Record<string, string>>({});

  const set = (i: number, patch: Partial<FieldRow>) => setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));

  async function save(i: number) {
    const row = rows[i]; if (!row) return;
    setBusy(row.def.key); setMsg((m) => ({ ...m, [row.def.key]: '' }));
    const res = await fetch('/api/verse/override', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_type: entityType, entity_id: entityId, field: row.def.key, value: row.value, source_url: row.sourceUrl }),
    });
    setBusy(null);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = d.error === 'source_required' ? 'A source is required to change a fact.' : (d.error ?? 'Could not save. Try again.');
      setMsg((m) => ({ ...m, [row.def.key]: err }));
      return;
    }
    set(i, { isOverride: !d.cleared });
    setMsg((m) => ({ ...m, [row.def.key]: d.cleared ? 'Cleared' : 'Saved' }));
    onSaved();
  }

  return (
    <div className="rounded-xl border border-default bg-surface p-4" style={{ borderColor: 'var(--verse-line)' }}>
      <SectionHeader kicker="Edit facts" as="h3" action={<button onClick={onClose} className="text-xs font-semibold text-secondary hover:text-primary">Done</button>} />
      <p className="mb-3 text-[11px] text-tertiary">Every change needs a source. Only these typed fields exist, by policy.</p>
      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={row.def.key} className="rounded-lg border border-default p-2.5" style={{ borderColor: 'var(--verse-line)' }}>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-semibold text-secondary" htmlFor={`f-${row.def.key}`}>{row.def.label}{row.def.unit ? ` (${row.def.unit})` : ''}</label>
              {row.isOverride ? <span className="rounded px-1 text-[9px] font-bold uppercase" style={{ background: 'var(--verse-soft)', color: 'var(--verse-ink)' }}>cur</span> : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {row.def.type === 'enum' ? (
                <select id={`f-${row.def.key}`} value={row.value} onChange={(e) => set(i, { value: e.target.value })} className="rounded border border-default bg-transparent px-2 py-1 text-sm" style={{ borderColor: 'var(--verse-line)' }}>
                  <option value="">(clear)</option>
                  {row.def.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input id={`f-${row.def.key}`} type={row.def.type === 'date' ? 'date' : row.def.type === 'number' ? 'number' : 'text'}
                  value={row.value} placeholder={row.def.placeholder ?? ''} onChange={(e) => set(i, { value: e.target.value })}
                  className="min-w-0 flex-1 rounded border border-default bg-transparent px-2 py-1 text-sm" style={{ borderColor: 'var(--verse-line)' }} />
              )}
              <input type="url" value={row.sourceUrl} onChange={(e) => set(i, { sourceUrl: e.target.value })} placeholder="Source URL (required)"
                className="min-w-0 flex-1 rounded border border-default bg-transparent px-2 py-1 text-sm" style={{ borderColor: 'var(--verse-line)' }} aria-label={`Source for ${row.def.label}`} />
              <button onClick={() => save(i)} disabled={busy === row.def.key}
                className="rounded-full px-3 py-1 text-xs font-bold disabled:opacity-50" style={{ background: 'var(--verse-accent)', color: 'var(--verse-accent-text)' }}>
                {busy === row.def.key ? '...' : 'Save'}
              </button>
            </div>
            {msg[row.def.key] ? <p className="mt-1 text-[11px]" style={{ color: msg[row.def.key] === 'Saved' || msg[row.def.key] === 'Cleared' ? 'var(--verse-ink)' : 'var(--wrong,var(--verse-danger))' }}>{msg[row.def.key]}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
