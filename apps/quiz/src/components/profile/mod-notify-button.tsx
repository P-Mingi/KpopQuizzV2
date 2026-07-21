'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  recipientUsername: string;
}

type SendState = 'idle' | 'sending' | 'sent' | 'error';

// Moderator tool: on another user's profile, an admin can send them a
// personalized notification that lands in their bell like any other. Renders
// NOTHING for non-admins and NOTHING on your own profile. This is only the
// composer; the send is authorized server-side in /api/admin/notifications/send
// (isAdmin gate + service-role insert), so exposing the button client-side
// leaks no capability.
export function ModNotifyButton({ recipientUsername }: Props): React.ReactElement | null {
  const [isAdmin, setIsAdmin] = useState(false);
  const [viewerUsername, setViewerUsername] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [state, setState] = useState<SendState>('idle');
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { profile: null, is_admin: false }))
      .then((d: { is_admin?: boolean; profile: { username: string } | null }) => {
        if (cancelled) return;
        setIsAdmin(Boolean(d.is_admin));
        setViewerUsername(d.profile?.username ?? null);
        setReady(true);
      })
      .catch(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (open) titleRef.current?.focus();
  }, [open]);

  // Gate: only an admin, and never on their own profile.
  if (!ready || !isAdmin || viewerUsername === recipientUsername) return null;

  const trimmedTitle = title.trim();
  const canSend = trimmedTitle.length >= 2 && trimmedTitle.length <= 80 && body.length <= 500 && state !== 'sending';

  async function send(): Promise<void> {
    if (!canSend) return;
    setState('sending');
    setError(null);
    try {
      const res = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          recipient_username: recipientUsername,
          title: trimmedTitle,
          body: body.trim() || null,
        }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? `Failed (${res.status})`);
      }
      setState('sent');
      setTitle('');
      setBody('');
      // Collapse the composer a moment after the confirmation shows.
      window.setTimeout(() => { setOpen(false); setState('idle'); }, 1600);
    } catch (e) {
      setState('error');
      setError((e as Error).message);
    }
  }

  return (
    <div style={wrap}>
      <style>{CSS}</style>
      {!open ? (
        <button type="button" className="mnb-open" onClick={() => setOpen(true)}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          Send @{recipientUsername} a notification
        </button>
      ) : (
        <div className="mnb-panel">
          <div className="mnb-head">
            <span className="mnb-label">Notify @{recipientUsername}</span>
            <button type="button" className="mnb-x" onClick={() => { setOpen(false); setState('idle'); setError(null); }} aria-label="Cancel">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>

          <input
            ref={titleRef}
            className="mnb-input"
            type="text"
            placeholder="Title (shown in bold)"
            maxLength={80}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="mnb-input mnb-textarea"
            placeholder="Message (optional)"
            maxLength={500}
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />

          <div className="mnb-foot">
            <span className="mnb-count">{title.length}/80{body ? ` · ${body.length}/500` : ''}</span>
            <button type="button" className="mnb-send" disabled={!canSend} onClick={() => void send()}>
              {state === 'sending' ? 'Sending...' : state === 'sent' ? 'Sent' : 'Send'}
            </button>
          </div>

          {state === 'sent' && <p className="mnb-ok">Delivered to @{recipientUsername}.</p>}
          {state === 'error' && error && <p className="mnb-err">{error}</p>}
        </div>
      )}
    </div>
  );
}

const wrap: React.CSSProperties = { maxWidth: 520, margin: '14px auto 0' };

const CSS = `
.mnb-open{
  width:100%;display:inline-flex;align-items:center;justify-content:center;gap:8px;
  min-height:44px;padding:0 16px;border-radius:12px;cursor:pointer;
  border:1px dashed var(--border-h);background:var(--surface-alt);
  color:var(--txt2);font-family:inherit;font-size:13px;font-weight:600;
  transition:border-color .16s ease,color .16s ease;
}
.mnb-open:hover{border-color:var(--brand);color:var(--brand)}
.mnb-panel{
  border:1px solid var(--border);background:var(--surface);border-radius:14px;
  box-shadow:var(--shadow-card);padding:14px;
}
.mnb-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.mnb-label{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--txt3)}
.mnb-x{width:32px;height:32px;display:grid;place-items:center;border:none;background:transparent;color:var(--txt3);cursor:pointer;border-radius:8px}
.mnb-x:hover{color:var(--txt1)}
.mnb-input{
  width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:10px;
  background:var(--bg-primary);color:var(--txt1);font-family:inherit;font-size:14px;
  padding:10px 12px;margin-bottom:8px;outline:none;transition:border-color .16s ease;
}
.mnb-input:focus{border-color:var(--brand)}
.mnb-textarea{resize:vertical;min-height:64px;line-height:1.5}
.mnb-foot{display:flex;align-items:center;justify-content:space-between;gap:10px}
.mnb-count{font-size:11px;color:var(--txt3);font-variant-numeric:tabular-nums}
.mnb-send{
  min-height:40px;padding:0 20px;border-radius:10px;border:none;cursor:pointer;
  background:var(--brand-btn);color:#fff;font-family:inherit;font-size:13px;font-weight:700;
  transition:background .16s ease,opacity .16s ease;
}
.mnb-send:hover:not(:disabled){background:var(--brand-btn-hover)}
.mnb-send:disabled{opacity:.5;cursor:not-allowed}
.mnb-ok{margin:10px 0 0;font-size:12px;font-weight:600;color:var(--brand-dark)}
.mnb-err{margin:10px 0 0;font-size:12px;color:var(--wrong,#c0392b)}
`;
