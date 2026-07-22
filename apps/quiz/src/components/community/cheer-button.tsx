'use client';

import { useState } from 'react';

import { useToast } from '@/components/ui/toast-provider';

// F2b B7 - a cheer on a happening-now activity. One tap, one per user per event.
// The count is baked at ISR; this island makes only the viewer's own tap live:
// optimistic bump + lock, reconciled with the server count. Anon tap nudges to
// sign in. Rendered only on rows with a real person (never on anonymous rows).
export function CheerButton({ eventId, initialCount }: { eventId: number; initialCount: number }): React.ReactElement {
  const { showToast } = useToast();
  const [count, setCount] = useState(initialCount);
  const [cheered, setCheered] = useState(false);
  const [busy, setBusy] = useState(false);

  async function cheer(): Promise<void> {
    if (busy || cheered) return;
    setBusy(true);
    setCheered(true);
    setCount((c) => c + 1); // optimistic
    try {
      const res = await fetch('/api/cheer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ event_id: eventId }),
      });
      if (res.status === 401) {
        setCheered(false);
        setCount(initialCount);
        showToast('Sign in to cheer', 'info');
        return;
      }
      const d = (await res.json().catch(() => ({}))) as { count?: number };
      if (res.ok && typeof d.count === 'number') setCount(d.count);
      else { setCheered(false); setCount(initialCount); }
    } catch {
      setCheered(false);
      setCount(initialCount);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void cheer()}
      aria-pressed={cheered}
      aria-label={cheered ? 'Cheered' : 'Cheer'}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
        border: 'none', background: 'transparent', cursor: cheered ? 'default' : 'pointer',
        color: cheered ? 'var(--brand)' : 'var(--txt3)', padding: '4px 6px', borderRadius: 8,
        fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
        transition: 'color .16s ease',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill={cheered ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
      </svg>
      {count > 0 && <span>{count}</span>}
    </button>
  );
}
