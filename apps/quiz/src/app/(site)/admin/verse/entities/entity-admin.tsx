'use client';

import { useCallback, useEffect, useState } from 'react';

import { SCENE_LIST, SCENES } from '@/lib/verse/entity-types';

import type { SceneKind } from '@/lib/verse/entity-types';

interface Row { id: number; status: string; source_url: string | null; [k: string]: unknown; }

export function EntityAdmin({ groups }: { groups: Array<{ id: number; name: string }> }): React.ReactElement {
  const [kind, setKind] = useState<SceneKind>('tours');
  const [groupId, setGroupId] = useState<number>(groups[0]?.id ?? 0);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const scene = SCENES[kind];

  const load = useCallback(async () => {
    if (!groupId) return;
    const res = await fetch(`/api/verse/entity?kind=${kind}&group_id=${groupId}`);
    if (res.ok) { const d = await res.json(); setRows(d.rows ?? []); }
  }, [kind, groupId]);

  useEffect(() => { load(); }, [load]);

  async function create() {
    if (!form[scene.titleField]?.trim()) { alert('A title is required.'); return; }
    setBusy(true);
    const res = await fetch('/api/verse/entity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, group_id: groupId, ...form }) });
    setBusy(false);
    if (res.ok) { setForm({}); load(); } else { alert((await res.json()).error ?? 'error'); }
  }

  async function patch(id: number, body: Record<string, unknown>) {
    setBusy(true);
    const res = await fetch('/api/verse/entity', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, id, ...body }) });
    setBusy(false);
    if (res.ok) load(); else alert((await res.json()).error ?? 'error');
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {SCENE_LIST.map((s) => (
            <button key={s.kind} onClick={() => setKind(s.kind)} className={`rounded-full border px-3 py-1 text-sm ${kind === s.kind ? 'bg-primary text-inverse font-semibold' : 'text-secondary'}`}>{s.label}</button>
          ))}
        </div>
        <select value={groupId} onChange={(e) => setGroupId(Number(e.target.value))} className="rounded-lg border border-default bg-transparent px-3 py-1.5 text-sm">
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      <div className="rounded-xl border border-default p-4">
        <p className="mb-2 text-sm font-semibold">New {scene.singular.toLowerCase()}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input placeholder={scene.titleField.replace('_', ' ')} value={form[scene.titleField] ?? ''} onChange={(e) => setForm({ ...form, [scene.titleField]: e.target.value })} className="rounded-lg border border-default bg-transparent px-3 py-1.5 text-sm" aria-label={scene.titleField} />
          {scene.fields.map((f) => (
            f.type === 'enum'
              ? <select key={f.key} value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="rounded-lg border border-default bg-transparent px-3 py-1.5 text-sm" aria-label={f.label}>
                  <option value="">{f.label}</option>
                  {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              : <input key={f.key} type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'} placeholder={f.label} value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="rounded-lg border border-default bg-transparent px-3 py-1.5 text-sm" aria-label={f.label} />
          ))}
          <input placeholder="Source URL (required to publish)" value={form.source_url ?? ''} onChange={(e) => setForm({ ...form, source_url: e.target.value })} className="rounded-lg border border-default bg-transparent px-3 py-1.5 text-sm sm:col-span-2" aria-label="Source URL" />
        </div>
        <button onClick={create} disabled={busy} className="mt-2 rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-inverse disabled:opacity-50">Add draft</button>
      </div>

      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-default px-3 py-2 text-sm">
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${r.status === 'published' ? 'bg-green-600 text-white' : 'bg-neutral-500 text-white'}`}>{r.status}</span>
            <span className="font-semibold">{String(r[scene.titleField] ?? '(untitled)')}</span>
            {!r.source_url ? <span className="text-xs text-tertiary">no source</span> : null}
            <div className="ml-auto flex gap-2">
              {r.status === 'draft'
                ? <button onClick={() => patch(r.id, { status: 'published' })} disabled={busy} className="rounded border border-default px-2 py-0.5 text-xs">Publish</button>
                : <button onClick={() => patch(r.id, { status: 'draft' })} disabled={busy} className="rounded border border-default px-2 py-0.5 text-xs">Unpublish</button>}
            </div>
          </li>
        ))}
        {rows.length === 0 ? <li className="text-sm text-tertiary">No {scene.label.toLowerCase()} for this group yet.</li> : null}
      </ul>
    </div>
  );
}
