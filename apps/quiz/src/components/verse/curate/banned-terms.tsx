'use client';

import { useCallback, useEffect, useState } from 'react';

interface Term { id: number; term: string; action: string; note: string | null }

/** W4.8 - global banned-terms manager (global admins only). block = reject, flag = queue. */
export function BannedTerms(): React.ReactElement {
  const [terms, setTerms] = useState<Term[]>([]);
  const [term, setTerm] = useState('');
  const [action, setAction] = useState<'flag' | 'block'>('flag');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch('/api/verse/banned-terms');
    if (r.ok) setTerms((await r.json()).terms ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function add() {
    if (term.trim().length < 2) return;
    setBusy(true);
    const r = await fetch('/api/verse/banned-terms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ term, action }) });
    setBusy(false);
    if (r.ok) { setTerm(''); load(); } else alert((await r.json()).error ?? 'error');
  }
  async function remove(id: number) { const r = await fetch(`/api/verse/banned-terms?id=${id}`, { method: 'DELETE' }); if (r.ok) load(); }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Term" className="flex-1 rounded-lg border border-default bg-transparent px-3 py-1.5 text-sm" />
        <select value={action} onChange={(e) => setAction(e.target.value as 'flag' | 'block')} className="rounded-lg border border-default bg-transparent px-2 py-1.5 text-sm"><option value="flag">flag</option><option value="block">block</option></select>
        <button onClick={add} disabled={busy} className="rounded-lg bg-primary px-4 text-sm font-semibold text-inverse disabled:opacity-50">Add</button>
      </div>
      {terms.length === 0 ? <p className="text-sm text-tertiary">No banned terms yet.</p> : (
        <ul className="flex flex-wrap gap-2">
          {terms.map((t) => (
            <li key={t.id} className="inline-flex items-center gap-1.5 rounded-full border border-default px-2.5 py-1 text-xs">
              <span className="font-semibold">{t.term}</span>
              <span className="text-tertiary">{t.action}</span>
              <button onClick={() => remove(t.id)} className="text-tertiary hover:text-secondary" aria-label={`Remove ${t.term}`}>✕</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
