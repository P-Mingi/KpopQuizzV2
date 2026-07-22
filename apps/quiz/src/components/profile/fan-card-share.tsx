'use client';

import { useEffect, useState } from 'react';

import { analytics } from '@/lib/analytics';

// F2c C5 - "Share my Fan Card". Shown only on the OWNER's own passport (/me
// always; /u only when the viewer's username matches, checked via /api/auth/me).
// Opens a sheet with the Fan Card preview, native share of the PNG file (with a
// download fallback), and copy-link. Fires the existing share_click analytics
// with type 'fancard'.
//
// QR is intentionally omitted: the Fan Card route skips QR in v1 (no QR library
// in the tree, and the spec forbids adding a dependency for an off-by-default
// feature), so there is nothing to toggle.
export function FanCardShare({ username }: { username: string }): React.ReactElement | null {
  const [isOwner, setIsOwner] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { profile: null }))
      .then((d: { profile: { username: string } | null }) => {
        if (!cancelled) setIsOwner(d.profile?.username === username);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [username]);

  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
    return undefined;
  }, [open]);

  if (!isOwner) return null;

  const cardUrl = `/api/fancard/${username}`;

  function flash(msg: string): void {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  }

  async function shareCard(): Promise<void> {
    if (busy) return;
    analytics.shareClick('fancard');
    setBusy(true);
    try {
      const res = await fetch(cardUrl);
      const blob = await res.blob();
      const file = new File([blob], `fancard-${username}.png`, { type: 'image/png' });
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
      if (typeof navigator.share === 'function' && nav.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: 'My K-pop Fan Card' });
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `fancard-${username}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
        flash('Card downloaded');
      }
    } catch {
      flash('Could not share');
    } finally {
      setBusy(false);
    }
  }

  async function copyLink(): Promise<void> {
    analytics.shareClick('fancard');
    const url = `${window.location.origin}/u/${username}`;
    try {
      await navigator.clipboard.writeText(url);
      flash('Link copied');
    } catch {
      flash('Copy failed');
    }
  }

  return (
    <>
      <button type="button" className="fcs-open" onClick={() => setOpen(true)}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
        </svg>
        Share my Fan Card
      </button>

      {open && (
        <div className="fcs-backdrop" role="dialog" aria-modal="true" aria-label="Share your Fan Card" onClick={() => setOpen(false)}>
          <style>{CSS}</style>
          <div className="fcs-panel" onClick={(e) => e.stopPropagation()}>
            <div className="fcs-head">
              <span className="fcs-title">Your Fan Card</span>
              <button type="button" className="fcs-x" onClick={() => setOpen(false)} aria-label="Close">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cardUrl} alt="Your Fan Card" className="fcs-preview" />
            <div className="fcs-actions">
              <button type="button" className="fcs-share" disabled={busy} onClick={() => void shareCard()}>
                {busy ? 'Preparing...' : 'Share image'}
              </button>
              <button type="button" className="fcs-copy" onClick={() => void copyLink()}>Copy link</button>
            </div>
            {toast && <p className="fcs-toast">{toast}</p>}
          </div>
        </div>
      )}
      <style>{CSS}</style>
    </>
  );
}

const CSS = `
.fcs-open{
  display:inline-flex; align-items:center; gap:7px; min-height:40px; padding:0 15px;
  border-radius:10px; cursor:pointer; font-family:inherit; font-size:12.5px; font-weight:700;
  background:var(--brand-btn); color:#fff; border:none; transition:background .16s ease;
}
.fcs-open:hover{ background:var(--brand-btn-hover); }
.fcs-backdrop{
  position:fixed; inset:0; z-index:60; display:grid; place-items:center; padding:18px;
  background:rgba(0,0,0,.55); backdrop-filter:blur(2px);
}
.fcs-panel{
  position:relative; width:min(360px,100%); background:var(--surface);
  border:1px solid var(--border); border-radius:18px; padding:16px;
  box-shadow:0 24px 60px -20px rgba(0,0,0,.5); max-height:90vh; overflow-y:auto;
}
.fcs-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
.fcs-title{ font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:var(--txt3); }
.fcs-x{ width:32px; height:32px; display:grid; place-items:center; border:none; background:transparent; color:var(--txt3); cursor:pointer; border-radius:8px; }
.fcs-x:hover{ color:var(--txt1); }
.fcs-preview{ width:100%; border-radius:12px; display:block; }
.fcs-actions{ display:flex; gap:8px; margin-top:14px; }
.fcs-share{
  flex:1; min-height:44px; border:none; border-radius:11px; cursor:pointer; font-family:inherit;
  font-size:13px; font-weight:700; background:var(--brand-btn); color:#fff; transition:background .16s ease;
}
.fcs-share:hover:not(:disabled){ background:var(--brand-btn-hover); }
.fcs-share:disabled{ opacity:.6; cursor:default; }
.fcs-copy{
  flex:1; min-height:44px; border:1px solid var(--border); border-radius:11px; cursor:pointer;
  font-family:inherit; font-size:13px; font-weight:700; background:transparent; color:var(--txt1);
}
.fcs-copy:hover{ border-color:var(--brand); color:var(--brand); }
.fcs-toast{ text-align:center; margin:10px 0 0; font-size:12px; font-weight:600; color:var(--brand); }
`;
