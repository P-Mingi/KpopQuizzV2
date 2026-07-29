'use client';

import { useEffect, useState } from 'react';

/** W4.6 - follow / unfollow a Verse page. Client island so pages stay ISR. Watching
 * sends a notification (through the existing spine) when the page changes. */
export function WatchButton({ entityType, entityId }: { entityType: string; entityId: string }): React.ReactElement | null {
  const [state, setState] = useState<{ signedIn: boolean; watching: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/verse/watch?entity_type=${entityType}&entity_id=${entityId}`).then((r) => (r.ok ? r.json() : null)).then(setState).catch(() => {});
  }, [entityType, entityId]);

  if (!state) return null;

  async function toggle() {
    if (!state!.signedIn) { window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname)}`; return; }
    setBusy(true);
    const res = await fetch('/api/verse/watch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entity_type: entityType, entity_id: entityId, action: state!.watching ? 'unwatch' : 'watch' }) });
    setBusy(false);
    if (res.ok) { const d = await res.json(); setState((s) => (s ? { ...s, watching: !!d.watching } : s)); }
  }

  const on = state.watching;
  return (
    <button onClick={toggle} disabled={busy} aria-pressed={on}
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold no-underline transition-colors"
      style={{ borderColor: 'var(--verse-line)', color: on ? 'var(--verse-ink)' : 'var(--text-secondary)', background: on ? 'var(--verse-soft)' : 'transparent' }}>
      <svg viewBox="0 0 24 24" width="13" height="13" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden><path d="M12 3a6 6 0 0 0-6 6c0 5-2 7-2 7h16s-2-2-2-7a6 6 0 0 0-6-6ZM10.5 20a1.8 1.8 0 0 0 3 0" /></svg>
      {on ? 'Watching' : 'Watch'}
    </button>
  );
}
