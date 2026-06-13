'use client';

import { useEffect, useRef, useState } from 'react';

import { shareToReddit, shareToTwitter, shareToDiscord } from '@/lib/share';

// H6 share-card customizer. Opens on a platform tap; drives the H5 /api/og
// params live, persists them to the quiz (creator-only), then opens the intent.
// Reusable: Screen 4 now, quiz-detail + result later (H8).

export type SharePlatform = 'reddit' | 'discord' | 'twitter';
type Overlay = 'dark-bottom' | 'full-dark' | 'brand' | 'purple';

const PLATFORM: Record<SharePlatform, { title: string; color: string; cta: string }> = {
  reddit: { title: 'Post to Reddit', color: '#FF4500', cta: 'Save & post to Reddit' },
  discord: { title: 'Send to Discord', color: '#5865F2', cta: 'Save & copy for Discord' },
  twitter: { title: 'Post to X', color: '#0F0F0F', cta: 'Save & post to X' },
};

const OVERLAYS: Array<{ id: Overlay; label: string; swatch: string }> = [
  { id: 'dark-bottom', label: 'Dark', swatch: 'linear-gradient(to bottom, #5b5b5b, #111)' },
  { id: 'full-dark', label: 'Full dark', swatch: '#1a1a1a' },
  { id: 'brand', label: 'Pink', swatch: 'linear-gradient(150deg, #E8457A, #96184f)' },
  { id: 'purple', label: 'Purple', swatch: 'linear-gradient(150deg, #8B5CF6, #4c1d95)' },
];

interface Props {
  quizId: string;
  slug: string;
  quizTitle: string;
  platform: SharePlatform;
  onClose: () => void;
}

export function ShareCardModal({ quizId, slug, quizTitle, platform, onClose }: Props): React.ReactElement {
  const [overlay, setOverlay] = useState<Overlay>('dark-bottom');
  const [opacity, setOpacity] = useState(40);
  const [hook, setHook] = useState('');
  const [title, setTitle] = useState(quizTitle);
  const [previewSrc, setPreviewSrc] = useState('');
  const [previewLoading, setPreviewLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [discordCopied, setDiscordCopied] = useState<null | 'ok' | 'fail'>(null);

  const cardRef = useRef<HTMLDivElement>(null);
  const cfg = PLATFORM[platform];

  // --- accessibility: focus on open, Esc to close, Tab focus trap ---
  useEffect(() => {
    const prevActive = document.activeElement as HTMLElement | null;
    const node = cardRef.current;
    const focusables = () => node ? [...node.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((el) => !el.hasAttribute('disabled')) : [];
    focusables()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'Tab') {
        const f = focusables();
        const first = f[0];
        const last = f[f.length - 1];
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; prevActive?.focus?.(); };
  }, [onClose]);

  // --- debounced live preview ---
  useEffect(() => {
    setPreviewLoading(true);
    const t = window.setTimeout(() => {
      const p = new URLSearchParams({ overlay, opacity: String(opacity) });
      if (hook.trim()) p.set('hook', hook.trim());
      if (title.trim()) p.set('title', title.trim());
      setPreviewSrc(`/api/og/${slug}?${p.toString()}`);
    }, 400);
    return () => window.clearTimeout(t);
  }, [overlay, opacity, hook, title, slug]);

  const saveAndShare = async () => {
    setSaving(true);
    setDiscordCopied(null);
    try {
      await fetch(`/api/quiz/${quizId}/share-card`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overlay, opacity, hook: hook.trim(), title: title.trim() }),
      });
    } catch {
      // saving is best-effort; still let them share
    }
    setSaving(false);
    if (platform === 'reddit') { void shareToReddit(quizId, slug, title.trim() || quizTitle); onClose(); }
    else if (platform === 'twitter') { void shareToTwitter(quizId, slug, title.trim() || quizTitle); onClose(); }
    else { const ok = await shareToDiscord(quizId, slug); setDiscordCopied(ok ? 'ok' : 'fail'); }
  };

  return (
    <div className="scm-backdrop" onClick={onClose}>
      <div
        className="scm-card"
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="scm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="scm-head">
          <h2 id="scm-title" className="scm-title">{cfg.title}</h2>
          <button type="button" className="scm-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" /></svg>
          </button>
        </div>

        {/* Live preview */}
        <div className="scm-preview">
          {previewSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewSrc} alt="Share card preview" onLoad={() => setPreviewLoading(false)} onError={() => setPreviewLoading(false)} />
          )}
          {previewLoading && <span className="scm-preview-spin" aria-hidden="true" />}
        </div>

        {/* Overlay swatches */}
        <div className="scm-field">
          <span className="scm-label">Overlay</span>
          <div className="scm-swatches" role="group" aria-label="Overlay style">
            {OVERLAYS.map((ov) => (
              <button key={ov.id} type="button" className={`scm-swatch${overlay === ov.id ? ' on' : ''}`} aria-pressed={overlay === ov.id} onClick={() => setOverlay(ov.id)} title={ov.label}>
                <span className="scm-swatch-chip" style={{ backgroundImage: ov.swatch.startsWith('linear') ? ov.swatch : undefined, backgroundColor: ov.swatch.startsWith('linear') ? undefined : ov.swatch }} aria-hidden="true" />
                <span className="scm-swatch-label">{ov.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Opacity */}
        <div className="scm-field">
          <span className="scm-label">Overlay strength <span className="scm-val">{opacity}%</span></span>
          <input type="range" min={0} max={100} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} className="scm-range" aria-label="Overlay strength" />
        </div>

        {/* Hook + title */}
        <div className="scm-field">
          <label className="scm-label" htmlFor="scm-hook">Hook line</label>
          <input id="scm-hook" className="scm-input" value={hook} onChange={(e) => setHook(e.target.value)} placeholder="Bet you can't get 100%" maxLength={60} />
        </div>
        <div className="scm-field">
          <label className="scm-label" htmlFor="scm-title-in">Title on card</label>
          <input id="scm-title-in" className="scm-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={quizTitle} maxLength={120} />
        </div>

        {discordCopied && (
          <p className={`scm-status ${discordCopied === 'ok' ? 'ok' : 'err'}`} role="status">
            {discordCopied === 'ok' ? 'Link copied - paste it in your Discord channel.' : 'Could not copy. Long-press the preview link to copy.'}
          </p>
        )}

        <div className="scm-actions">
          {discordCopied === 'ok' ? (
            <button type="button" className="scm-share-btn" style={{ backgroundColor: cfg.color }} onClick={onClose}>Done</button>
          ) : (
            <button type="button" className="scm-share-btn" style={{ backgroundColor: cfg.color }} disabled={saving} onClick={() => void saveAndShare()}>
              {saving ? <span className="scm-btn-spin" aria-hidden="true" /> : cfg.cta}
            </button>
          )}
          <button type="button" className="scm-cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
