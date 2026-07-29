'use client';

import { useState } from 'react';

interface Link { label: string; url: string }
interface Props { groupId: number; initial: { welcomeLine: string | null; charterText: string | null; snsLinks: Link[] } }

/** W4.3 - curator masthead settings: welcome line, charter, SNS links. */
export function SpaceSettings({ groupId, initial }: Props): React.ReactElement {
  const [welcome, setWelcome] = useState(initial.welcomeLine ?? '');
  const [charter, setCharter] = useState(initial.charterText ?? '');
  const [links, setLinks] = useState<Link[]>(initial.snsLinks.length ? initial.snsLinks : [{ label: '', url: '' }]);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true); setSaved(false);
    const res = await fetch('/api/verse/space-config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: groupId, welcome_line: welcome, charter_text: charter, sns_links: links.filter((l) => l.label && l.url) }),
    });
    setBusy(false);
    if (res.ok) { setSaved(true); } else { alert((await res.json()).error ?? 'error'); }
  }

  const field = 'w-full rounded-lg border border-default bg-transparent px-3 py-2 text-sm';
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-secondary">Welcome line</span>
        <input value={welcome} onChange={(e) => { setWelcome(e.target.value); setSaved(false); }} maxLength={300} placeholder="One line that greets fans" className={field} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-secondary">Charter</span>
        <textarea value={charter} onChange={(e) => { setCharter(e.target.value); setSaved(false); }} rows={4} maxLength={4000} placeholder="How this space is run: rules, roles, tone." className={field} />
      </label>
      <div>
        <span className="mb-1 block text-xs font-semibold text-secondary">Official links</span>
        <div className="space-y-2">
          {links.map((l, i) => (
            <div key={i} className="flex gap-2">
              <input value={l.label} onChange={(e) => { const n = [...links]; n[i] = { ...l, label: e.target.value }; setLinks(n); setSaved(false); }} placeholder="Label" className={`${field} max-w-[140px]`} />
              <input value={l.url} onChange={(e) => { const n = [...links]; n[i] = { ...l, url: e.target.value }; setLinks(n); setSaved(false); }} placeholder="https://…" className={field} />
              <button onClick={() => setLinks(links.filter((_, j) => j !== i))} className="rounded border border-default px-2 text-xs text-tertiary" aria-label="Remove link">✕</button>
            </div>
          ))}
          {links.length < 8 ? <button onClick={() => setLinks([...links, { label: '', url: '' }])} className="text-xs font-semibold text-accent">Add link</button> : null}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={busy} className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-inverse disabled:opacity-50">{busy ? 'Saving…' : 'Save settings'}</button>
        {saved ? <span className="text-xs text-success">Saved. Changes appear after the page revalidates.</span> : null}
      </div>
    </div>
  );
}
