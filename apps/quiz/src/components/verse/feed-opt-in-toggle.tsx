'use client';

import { useEffect, useState } from 'react';

// V-COMM-3 step 4 - the per-space cross-space-feed opt-in (curator+ only). Client
// island: the community page is cached, and this is a role-gated control. Renders
// nothing for non-curators; a curator flips whether the space's highlights surface
// in the global Community feed.
export function FeedOptInToggle({ groupId }: { groupId: number }): React.ReactElement | null {
  const [state, setState] = useState<{ optIn: boolean; canManage: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    fetch(`/api/verse/space-feed?group_id=${groupId}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (live && d) setState({ optIn: !!d.optIn, canManage: !!d.canManage }); })
      .catch(() => {});
    return () => { live = false; };
  }, [groupId]);

  if (!state?.canManage) return null;

  const toggle = async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    const next = !state.optIn;
    const r = await fetch('/api/verse/space-feed', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ group_id: groupId, opt_in: next }) });
    setBusy(false);
    if (r.ok) setState({ ...state, optIn: next });
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border p-3" style={{ borderColor: 'var(--verse-line)', background: 'var(--verse-soft)' }}>
      <div>
        <p className="text-sm font-bold" style={{ color: 'var(--verse-ink)' }}>Surface in the global feed</p>
        <p className="text-xs text-tertiary">New pages, essays and threads appear in the shared Community hub.</p>
      </div>
      <button
        type="button" onClick={toggle} disabled={busy} aria-pressed={state.optIn}
        aria-label={`Surface in the global feed: ${state.optIn ? 'on' : 'off'}`}
        className="v-tap inline-flex min-h-[36px] shrink-0 items-center rounded-full px-4 text-sm font-bold transition-colors disabled:opacity-50"
        style={state.optIn
          ? { background: 'var(--verse-cta, var(--verse-accent))', color: 'var(--verse-cta-text, #fff)' }
          : { border: '1px solid var(--verse-line)', color: 'var(--verse-ink)', background: 'transparent' }}
      >{state.optIn ? 'On' : 'Off'}</button>
    </div>
  );
}
