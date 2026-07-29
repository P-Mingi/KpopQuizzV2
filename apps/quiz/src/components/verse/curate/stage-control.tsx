'use client';

import { useState } from 'react';

const DESC: Record<string, string> = {
  A: 'Curator-authored. Members suggest edits; curators write and review. (current default)',
  B: 'Members edit through pre-moderation. Their saves queue for curator approval.',
  C: 'Reputation unlocks live editing. Trusted contributors (Veteran) edit directly.',
};

/** W4.11 - collaboration stage flip (global admins only). Built but OFF: every space
 * defaults to A. Flipping to B/C is a launch-day decision. */
export function StageControl({ groupId, initial }: { groupId: number; initial: string }): React.ReactElement {
  const [stage, setStage] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function set(next: string) {
    if (next === stage) return;
    if (!confirm(`Move this space to Stage ${next}? This changes who can edit.`)) return;
    setBusy(true); setSaved(false);
    const res = await fetch('/api/verse/space-config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ group_id: groupId, stage: next }) });
    setBusy(false);
    if (res.ok) { setStage(next); setSaved(true); } else alert((await res.json()).error ?? 'error');
  }

  return (
    <div>
      <div className="flex gap-2">
        {['A', 'B', 'C'].map((s) => (
          <button key={s} onClick={() => set(s)} disabled={busy} aria-pressed={stage === s}
            className="rounded-lg border px-3 py-1.5 text-sm font-bold"
            style={stage === s ? { borderColor: 'var(--verse-accent)', background: 'var(--verse-soft-strong)', color: 'var(--verse-ink)' } : { borderColor: 'var(--verse-line)', color: 'var(--text-secondary)' }}>
            Stage {s}
          </button>
        ))}
        {saved ? <span className="self-center text-xs text-success">Saved.</span> : null}
      </div>
      <p className="mt-2 text-xs text-secondary">{DESC[stage]}</p>
    </div>
  );
}
