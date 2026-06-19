'use client';

import { useEffect, useRef, useState } from 'react';

import { shareToReddit, shareToTwitter, shareToDiscord } from '@/lib/share';

const POPULAR_KPOP_SUBS = ['kpop', 'Kpop_Verse', 'kpopthoughts', 'kpophelp', 'bangtan', 'BLACKPINK', 'Stray_Kids', 'GOT7', 'TWICE', 'aespa'];

// H6/H8 share-card customizer. Creator (canEdit) gets the live editor + Save &
// share (persists via the creator-only route, drives the H5 /api/og params).
// Non-creator gets a read-only preview of the saved card + plain share buttons.
// Reusable across Screen 4, quiz-detail, and the result screen.

export type SharePlatform = 'reddit' | 'discord' | 'twitter';
type Overlay = 'dark-bottom' | 'full-dark' | 'brand' | 'purple';

const PLATFORM: Record<SharePlatform, { title: string; short: string; color: string; cta: string }> = {
  reddit: { title: 'Post to Reddit', short: 'Reddit', color: '#FF4500', cta: 'Save & post to Reddit' },
  discord: { title: 'Send to Discord', short: 'Discord', color: '#5865F2', cta: 'Save & copy for Discord' },
  twitter: { title: 'Post to X', short: 'X', color: '#0F0F0F', cta: 'Save & post to X' },
};
const PLATFORM_ORDER: SharePlatform[] = ['reddit', 'discord', 'twitter'];

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
  canEdit: boolean;
  onClose: () => void;
}

export function ShareCardModal({ quizId, slug, quizTitle, platform, canEdit, onClose }: Props): React.ReactElement {
  const [overlay, setOverlay] = useState<Overlay>('dark-bottom');
  const [opacity, setOpacity] = useState(40);
  const [hook, setHook] = useState('');
  const [title, setTitle] = useState(quizTitle);
  const [previewSrc, setPreviewSrc] = useState('');
  const [previewLoading, setPreviewLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [discordCopied, setDiscordCopied] = useState<null | 'ok' | 'fail'>(null);
  const [subreddit, setSubreddit] = useState('kpop');
  const [imagePosting, setImagePosting] = useState(false);
  const [imagePostResult, setImagePostResult] = useState<{ url: string } | { error: string } | null>(null);

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

  // --- preview: live (debounced) for the creator, the saved card for others ---
  useEffect(() => {
    setPreviewLoading(true);
    if (!canEdit) { setPreviewSrc(`/api/og/${slug}`); return; }
    const t = window.setTimeout(() => {
      const p = new URLSearchParams({ overlay, opacity: String(opacity) });
      if (hook.trim()) p.set('hook', hook.trim());
      if (title.trim()) p.set('title', title.trim());
      setPreviewSrc(`/api/og/${slug}?${p.toString()}`);
    }, 400);
    return () => window.clearTimeout(t);
  }, [overlay, opacity, hook, title, slug, canEdit]);

  const openIntent = async (p: SharePlatform) => {
    if (p === 'reddit') { void shareToReddit(quizId, slug, title.trim() || quizTitle); onClose(); }
    else if (p === 'twitter') { void shareToTwitter(quizId, slug, title.trim() || quizTitle); onClose(); }
    else { const ok = await shareToDiscord(quizId, slug); setDiscordCopied(ok ? 'ok' : 'fail'); }
  };

  const handleImagePost = async () => {
    if (!subreddit.trim() || imagePosting) return;
    setImagePosting(true);
    setImagePostResult(null);
    try {
      const res = await fetch('/api/share/reddit-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, subreddit: subreddit.trim(), title: title.trim() || quizTitle }),
      });
      const data = await res.json() as { postUrl?: string; error?: string };
      if (!res.ok || data.error) {
        setImagePostResult({ error: data.error ?? `Error ${res.status}` });
      } else {
        setImagePostResult({ url: data.postUrl ?? '' });
      }
    } catch (err) {
      setImagePostResult({ error: (err as Error).message ?? 'Network error' });
    } finally {
      setImagePosting(false);
    }
  };

  // Creator: persist the config, then open the platform this modal was opened for.
  const saveAndShare = async () => {
    setSaving(true);
    setDiscordCopied(null);
    try {
      await fetch(`/api/quiz/${quizId}/share-card`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overlay, opacity, hook: hook.trim(), title: title.trim() }),
      });
    } catch {
      // best-effort save; still let them share
    }
    setSaving(false);
    await openIntent(platform);
  };

  return (
    <div className="scm-backdrop" onClick={onClose}>
      <div className="scm-card" ref={cardRef} role="dialog" aria-modal="true" aria-labelledby="scm-title" onClick={(e) => e.stopPropagation()}>
        <div className="scm-head">
          <h2 id="scm-title" className="scm-title">{canEdit ? cfg.title : 'Share this quiz'}</h2>
          <button type="button" className="scm-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" /></svg>
          </button>
        </div>

        {/* Preview */}
        <div className="scm-preview">
          {previewSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewSrc} alt="Share card preview" onLoad={() => setPreviewLoading(false)} onError={() => setPreviewLoading(false)} />
          )}
          {previewLoading && <span className="scm-preview-spin" aria-hidden="true" />}
        </div>

        {/* Reddit image post - shows in feed (any subreddit) */}
        {platform === 'reddit' && (
          <div className="scm-reddit-img">
            <p className="scm-reddit-img-label">
              Post the card as an image
              <span className="scm-reddit-img-tip"> (shows full image in feed)</span>
            </p>
            {imagePostResult && 'url' in imagePostResult ? (
              <div className="scm-reddit-img-success">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                Posted!{' '}
                <a href={imagePostResult.url} target="_blank" rel="noopener noreferrer">View on Reddit</a>
              </div>
            ) : (
              <>
                <div className="scm-reddit-img-subs" role="group" aria-label="Popular subreddits">
                  {POPULAR_KPOP_SUBS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`scm-sub-chip${subreddit === s ? ' on' : ''}`}
                      onClick={() => setSubreddit(s)}
                    >
                      r/{s}
                    </button>
                  ))}
                </div>
                <div className="scm-reddit-img-row">
                  <span className="scm-reddit-img-prefix">r/</span>
                  <input
                    className="scm-input scm-sub-input"
                    value={subreddit}
                    onChange={(e) => setSubreddit(e.target.value.replace(/^r\//, '').replace(/[^a-zA-Z0-9_]/g, ''))}
                    placeholder="subreddit"
                    maxLength={21}
                    aria-label="Subreddit name"
                  />
                  <button
                    type="button"
                    className="scm-share-btn scm-reddit-img-btn"
                    style={{ backgroundColor: '#FF4500' }}
                    disabled={imagePosting || !subreddit.trim()}
                    onClick={() => void handleImagePost()}
                  >
                    {imagePosting ? <span className="scm-btn-spin" aria-hidden="true" /> : 'Post image'}
                  </button>
                </div>
                {imagePostResult && 'error' in imagePostResult && (
                  <p className="scm-status err" role="alert">{imagePostResult.error}</p>
                )}
              </>
            )}
            <hr className="scm-divider" />
            <p className="scm-reddit-img-or">or share as a link post</p>
          </div>
        )}

        {/* Edit controls - creator only */}
        {canEdit && (
          <>
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
            <div className="scm-field">
              <span className="scm-label">Overlay strength <span className="scm-val">{opacity}%</span></span>
              <input type="range" min={0} max={100} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} className="scm-range" aria-label="Overlay strength" />
            </div>
            <div className="scm-field">
              <label className="scm-label" htmlFor="scm-hook">Hook line</label>
              <input id="scm-hook" className="scm-input" value={hook} onChange={(e) => setHook(e.target.value)} placeholder="Bet you can't get 100%" maxLength={60} />
            </div>
            <div className="scm-field">
              <label className="scm-label" htmlFor="scm-title-in">Title on card</label>
              <input id="scm-title-in" className="scm-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={quizTitle} maxLength={120} />
            </div>
          </>
        )}

        {discordCopied && (
          <p className={`scm-status ${discordCopied === 'ok' ? 'ok' : 'err'}`} role="status">
            {discordCopied === 'ok' ? 'Link copied - paste it in your Discord channel.' : 'Could not copy. Long-press the preview to copy the link.'}
          </p>
        )}

        {/* Actions */}
        {discordCopied === 'ok' ? (
          <div className="scm-actions">
            <button type="button" className="scm-share-btn" style={{ backgroundColor: PLATFORM.discord.color }} onClick={onClose}>Done</button>
          </div>
        ) : canEdit ? (
          <div className="scm-actions">
            <button type="button" className="scm-share-btn" style={{ backgroundColor: cfg.color }} disabled={saving} onClick={() => void saveAndShare()}>
              {saving ? <span className="scm-btn-spin" aria-hidden="true" /> : cfg.cta}
            </button>
            <button type="button" className="scm-cancel" onClick={onClose}>Cancel</button>
          </div>
        ) : (
          <>
            <div className="scm-platforms" role="group" aria-label="Share to">
              {PLATFORM_ORDER.map((p) => (
                <button key={p} type="button" className="scm-plat-btn" style={{ backgroundColor: PLATFORM[p].color }} onClick={() => void openIntent(p)}>{PLATFORM[p].short}</button>
              ))}
            </div>
            <div className="scm-actions">
              <button type="button" className="scm-cancel" onClick={onClose}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
