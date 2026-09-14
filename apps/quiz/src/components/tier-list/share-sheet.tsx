'use client';

import { useState } from 'react';

import { getAnonId } from '@/lib/anon-id';
import { decodeBoard, encodeBoard } from '@/lib/tier-list/share-state';

import type { Visibility } from '@/lib/tier-list/types';

// The ShareSheet (ShareSheet.dc.html): the OG card preview + a list of actions,
// all working logged-out with state in the URL. Publishing to a persisted public
// page is Phase 3 (needs migration 146), so that row is a disabled "coming soon".
// No emoji: every row icon is an inline SVG.

function Row({ icon, label, hint, onClick, href, disabled, testid }: {
  icon: React.ReactNode; label: string; hint?: string; onClick?: () => void; href?: string; disabled?: boolean; testid?: string;
}) {
  const inner = (
    <>
      <span style={{ display: 'inline-flex', width: 40, height: 40, borderRadius: 10, background: 'var(--surface-alt)', alignItems: 'center', justifyContent: 'center', color: 'var(--txt1)', flex: 'none' }}>{icon}</span>
      <span style={{ display: 'flex', flexDirection: 'column', flex: 1, textAlign: 'left' }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--txt1)' }}>{label}</span>
        {hint && <span className="tl-mut" style={{ fontSize: 12 }}>{hint}</span>}
      </span>
    </>
  );
  const style: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 14px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1, marginBottom: 10 };
  if (href && !disabled) return <a href={href} style={{ ...style, textDecoration: 'none' }} data-testid={testid}>{inner}</a>;
  return <button type="button" style={style} onClick={onClick} disabled={disabled} data-testid={testid}>{inner}</button>;
}

export function ShareSheetClient({ d }: { d: string }): React.ReactElement {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState<string>('');
  const imgUrl = `/api/og/tier-list?d=${d}`;
  const storyUrl = `${imgUrl}&variant=story`;
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';

  // Challenge: same items, empty board.
  let challengeHref = '/tier-list/new';
  const board = d ? decodeBoard(d) : null;
  if (board) challengeHref = `/tier-list/new?d=${encodeBoard(board, { allItems: true })}`;

  const [visibility, setVisibility] = useState<Visibility>('public');
  const [publishing, setPublishing] = useState(false);
  const [publishErr, setPublishErr] = useState<string>('');
  const [publishedUrl, setPublishedUrl] = useState<string>('');
  const [publishedVis, setPublishedVis] = useState<Visibility>('public');

  async function publish() {
    if (!board || publishing) return;
    setPublishing(true); setPublishErr('');
    try {
      const res = await fetch('/api/tier-list/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: board.title, tiers: board.tiers, placements: board.placements,
          subjectGroupId: board.subjectGroupId ?? null, subjectKind: board.subjectKind ?? 'blank',
          visibility, anonId: getAnonId(),
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPublishErr(j.needsAuth ? 'Sign in to publish publicly (a private or unlisted save works logged out).' : (j.error ?? 'Could not publish.'));
        setPublishing(false);
        return;
      }
      setPublishedUrl(j.url as string);
      setPublishedVis((j.visibility as Visibility) ?? visibility);
    } catch {
      setPublishErr('Could not publish.');
    }
    setPublishing(false);
  }

  async function savePng() {
    try {
      const res = await fetch(imgUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'tier-list.png';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      setShared('Saved');
    } catch { setShared('Could not save'); }
  }
  async function copyLink() {
    try { await navigator.clipboard.writeText(pageUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* denied */ }
  }
  async function systemShare() {
    if (navigator.share) { try { await navigator.share({ title: 'My K-pop tier list', url: pageUrl }); setShared('Shared'); } catch { /* cancelled */ } }
    else { void copyLink(); setShared('Link copied'); }
  }

  const ic = (path: React.ReactNode) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{path}</svg>
  );

  return (
    <div>
      <div className="tl-card" style={{ marginBottom: 16, borderRadius: 20 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgUrl} alt="Your tier list share card" style={{ width: '100%', display: 'block' }} data-testid="share-preview" />
      </div>

      <Row testid="save-png" icon={ic(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>)}
        label="Save image" hint="Download the PNG card" onClick={savePng} />
      <Row testid="copy-link" icon={ic(<><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></>)}
        label={copied ? 'Link copied' : 'Copy link'} hint="Share the URL anywhere" onClick={copyLink} />
      <Row testid="web-share" icon={ic(<><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.6" y1="13.5" x2="15.4" y2="17.5" /><line x1="15.4" y1="6.5" x2="8.6" y2="10.5" /></>)}
        label="Share" hint="Via your device share sheet" onClick={systemShare} />
      <Row testid="story" icon={ic(<><rect x="7" y="2" width="10" height="20" rx="2" /><line x1="11" y1="18" x2="13" y2="18" /></>)}
        label="Story (9:16)" hint="Vertical card for Stories" href={storyUrl} />
      <Row testid="challenge" icon={ic(<><path d="M14.5 2v6l4 4-4 4v6" /><path d="M9.5 2v6l-4 4 4 4v6" /></>)}
        label="Challenge a friend" hint="They rank the same set" href={challengeHref} />
      {/* Publish to a persisted, indexable page (Phase 3). Public needs a signed-in
          creator; a private/unlisted save works logged out via an anon id. */}
      <div className="tl-card" style={{ padding: 14, marginTop: 6 }} data-testid="tl-publish">
        {publishedUrl ? (
          <div data-testid="tl-published" data-visibility={publishedVis}>
            <div className="tl-h3" style={{ margin: 0 }}>
              {publishedVis === 'private' ? 'Saved (private)' : publishedVis === 'unlisted' ? 'Saved (unlisted)' : 'Published'}
            </div>
            <p className="tl-mut" style={{ margin: '4px 0 10px' }}>
              {publishedVis === 'private' ? 'Only you can open this page. Use the link below to come back to it.'
                : publishedVis === 'unlisted' ? 'Reachable only by this link; not listed or indexed.'
                : 'Your list has its own public page now.'}
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <a href={publishedUrl} className="tl-btn pri sm" data-testid="tl-published-link">
                {publishedVis === 'private' ? 'Open your private page' : 'View your page'}
              </a>
              <button type="button" className="tl-btn out sm" onClick={() => { void navigator.clipboard?.writeText(publishedUrl); setShared('Link copied'); }}>Copy page link</button>
            </div>
          </div>
        ) : (
          <div>
            <div className="tl-betw" style={{ marginBottom: 8 }}>
              <div className="tl-h3" style={{ margin: 0 }}>Publish this list</div>
              <div className="tl-seg" role="group" aria-label="Visibility">
                {(['public', 'unlisted', 'private'] as Visibility[]).map((v) => (
                  <button key={v} type="button" className={`tl-seg-s${visibility === v ? ' on' : ''}`} onClick={() => setVisibility(v)} data-testid={`vis-${v}`}>
                    {v[0]!.toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <p className="tl-mut" style={{ margin: '0 0 10px' }}>
              {visibility === 'public' ? 'A public page anyone can find and remix (needs an account).'
                : visibility === 'unlisted' ? 'Reachable only by link, not listed anywhere.'
                : 'Only you can open it.'}
            </p>
            <button type="button" className="tl-btn grad" onClick={publish} disabled={publishing || !board} data-testid="tl-publish-btn">
              {publishing ? 'Publishing...' : 'Publish'}
            </button>
            {publishErr && <p className="tl-mut" role="alert" style={{ color: 'var(--wrong, #A32D2D)', marginTop: 8 }}>{publishErr} {publishErr.startsWith('Sign in') && <a className="tl-crumb" style={{ color: 'var(--brand)' }} href="/login">Sign in</a>}</p>}
          </div>
        )}
      </div>

      {shared && <p className="tl-mut" role="status" style={{ marginTop: 6 }}>{shared}</p>}
    </div>
  );
}
