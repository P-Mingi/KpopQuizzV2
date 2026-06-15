'use client';

import { useEffect, useState } from 'react';

// K7 - opt-in "Brag in the Discord" button. Shown only on strong moments
// (good quiz result, battle WIN, L2 level-up overlay). Hidden entirely when
// the server-side kill switch (DISCORD_FLEX_WEBHOOK_URL unset) returns 503.

const DISCORD_ICON = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M13.554 2.893A12.634 12.634 0 0 0 10.436 1.8a8.268 8.268 0 0 0-.404.817 11.828 11.828 0 0 0-3.502 0A8.923 8.923 0 0 0 6.149 1.8a12.67 12.67 0 0 0-3.12 1.095C.767 5.685.214 8.487.49 11.25A12.697 12.697 0 0 0 4.35 13.2a9.437 9.437 0 0 0 .834-1.35 8.202 8.202 0 0 1-1.313-.629c.11-.08.218-.163.322-.25a9.07 9.07 0 0 0 7.698 0c.105.09.213.173.323.25a8.23 8.23 0 0 1-1.316.63 9.394 9.394 0 0 0 .834 1.348 12.65 12.65 0 0 0 3.863-1.95c.334-3.212-.57-5.986-2.04-8.456ZM5.53 9.665c-.733 0-1.336-.667-1.336-1.487 0-.82.588-1.49 1.336-1.49.749 0 1.348.67 1.336 1.49 0 .82-.588 1.487-1.336 1.487Zm4.94 0c-.733 0-1.336-.667-1.336-1.487 0-.82.588-1.49 1.336-1.49.749 0 1.344.67 1.336 1.49-.003.82-.588 1.487-1.336 1.487Z" /></svg>
);

export interface BragPayload {
  kind: 'quiz' | 'battle' | 'levelup';
  title: string;
  score?: number;
  total?: number;
  quizSlug?: string;
  battleId?: string;
  level?: number;
}

function contextKeyFor(p: BragPayload): string | null {
  if (p.kind === 'quiz' && p.quizSlug) return 'quiz:' + p.quizSlug + ':' + (p.score ?? '') + '/' + (p.total ?? '');
  if (p.kind === 'battle' && p.battleId) return 'battle:' + p.battleId;
  if (p.kind === 'levelup' && p.level != null) return 'level-' + p.level;
  return null;
}

export function BragButton({ payload, compact = false }: { payload: BragPayload; compact?: boolean }): React.ReactElement | null {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showName, setShowName] = useState(false);
  const [name, setName] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const key = contextKeyFor(payload);

  useEffect(() => {
    let cancelled = false;
    const url = '/api/discord/flex/status' + (key ? '?key=' + encodeURIComponent(key) : '');
    fetch(url)
      .then((r) => r.json())
      .then((d: { enabled: boolean; already_flexed?: boolean }) => {
        if (cancelled) return;
        setEnabled(d.enabled);
        if (d.already_flexed) setDone(true);
      })
      .catch(() => { if (!cancelled) setEnabled(false); });
    return () => { cancelled = true; };
  }, [key]);

  const flex = async (): Promise<void> => {
    if (busy || done) return;
    setBusy(true);
    try {
      const res = await fetch('/api/discord/flex', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, displayName: name.trim() || undefined }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; already_flexed?: boolean };
      if (res.status === 429) { setToast('Already bragged 3 times today. Tomorrow!'); }
      else if (res.ok && data.ok) { setDone(true); setToast(data.already_flexed ? 'Already posted!' : 'Posted to the Discord!'); }
      else { setToast('Could not post. Try again.'); }
    } catch {
      setToast('Could not post. Try again.');
    } finally {
      setBusy(false);
      window.setTimeout(() => setToast(null), 2200);
    }
  };

  // Kill switch (still loading is also hidden so the button doesn't flash in).
  if (enabled !== true) return null;

  return (
    <div className={'brag-wrap' + (compact ? ' brag-compact' : '')}>
      {showName && !done && (
        <input
          type="text"
          className="brag-name"
          placeholder="Display name (optional)"
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Display name"
        />
      )}
      <button
        type="button"
        className="brag-btn"
        disabled={busy || done}
        onClick={() => { if (!showName && !done) setShowName(true); else void flex(); }}
        aria-label={done ? 'Already posted to the Discord' : 'Brag in the Discord'}
      >
        <span className="brag-btn-icon" aria-hidden="true">{DISCORD_ICON}</span>
        {done ? 'Posted to Discord' : showName ? 'Brag it!' : 'Brag in the Discord'}
      </button>
      {toast && <span className="brag-toast" role="status">{toast}</span>}
    </div>
  );
}
