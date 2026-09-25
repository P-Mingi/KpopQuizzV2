'use client';

import { useId, useState } from 'react';

import { Sheet } from './sheet';

export const HEADER_MAX_BYTES = 5 * 1024 * 1024;
export const HEADER_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface HeaderPictureSheetProps {
  open: boolean;
  onClose: () => void;
  /** A validated file (JPG / PNG / WebP, <= 5 MB). The page uploads it (P10 route). */
  onFile: (file: File) => void | Promise<void>;
  /** An https:// link. The page sends it to the server fetch route (never hot-linked). */
  onLink: (url: string) => void | Promise<void>;
  /** "Use the theme colour instead". */
  onThemeColour: () => void | Promise<void>;
  /** Server-side error to show (upload failed, link rejected...). */
  error?: string | null;
  busy?: boolean;
  /** Kit gallery only: render in the page flow. */
  inline?: boolean;
}

/**
 * Header picture sheet (DESIGN-SPEC 17.8, 17.10): upload from the computer, paste a
 * link, or use the theme colour. Validates type / size / https on the client for a
 * fast answer; the server routes (P10) validate again and do the work. X, Escape
 * and the backdrop close it.
 */
export function HeaderPictureSheet({ open, onClose, onFile, onLink, onThemeColour, error, busy, inline }: HeaderPictureSheetProps): React.ReactElement | null {
  const uid = useId().replace(/:/g, '');
  const [url, setUrl] = useState('');
  const [local, setLocal] = useState<string | null>(null);
  const shown = local ?? error ?? null;

  const pick = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!HEADER_TYPES.includes(f.type)) { setLocal('Use a JPG, PNG or WebP image.'); return; }
    if (f.size > HEADER_MAX_BYTES) { setLocal('That image is over 5 MB.'); return; }
    setLocal(null);
    void onFile(f);
  };

  const submit = (e: React.FormEvent): void => {
    e.preventDefault();
    const v = url.trim();
    if (!/^https:\/\//i.test(v)) { setLocal('Paste a link that starts with https://'); return; }
    setLocal(null);
    void onLink(v);
  };

  return (
    <Sheet open={open} onClose={() => { setLocal(null); onClose(); }} title="Header picture" width={480} inline={inline}>
      <label className="ux-drop">
        <input type="file" accept={HEADER_TYPES.join(',')} className="ux-sr" onChange={pick} disabled={busy} />
        <div><b>Upload from your computer</b><br />JPG, PNG or WebP up to 5 MB · 1500 x 300 works best</div>
      </label>
      <div className="ux-or">or paste a link</div>
      <form className="ux-urlrow" onSubmit={submit}>
        <label className="ux-sr" htmlFor={`ux-hs-url-${uid}`}>Image link</label>
        <input className="ux-inp" id={`ux-hs-url-${uid}`} type="url" placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} aria-invalid={local ? true : undefined} />
        <button className="ux-btn ux-btn-ghost" type="submit" disabled={busy}>Use</button>
      </form>
      {shown ? <p className="ux-err" role="alert">{shown}</p> : null}
      <p className="ux-help">Links are checked and copied to our storage, so your header never breaks. Your photo is only shown on your passport.</p>
      <div className="ux-sh-right">
        <button type="button" className="ux-btn ux-btn-quiet" onClick={() => { void onThemeColour(); }} disabled={busy}>Use the theme colour instead</button>
      </div>
    </Sheet>
  );
}
