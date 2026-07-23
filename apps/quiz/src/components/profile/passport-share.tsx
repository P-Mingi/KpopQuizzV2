'use client';

import { useState } from 'react';

import { sharePassport, downloadPassportCard, type SharePlatform } from '@/lib/share';

// "Share your passport" action (Workstream M, M1.5). Acquisition: shares the
// public /u/<username> link (UTM-tagged per platform, utm_medium=passport-card),
// which renders the /api/og/passport card. Reuses the shareLevelUp flow style.
const canNativeShare = (): boolean => typeof navigator !== 'undefined' && typeof navigator.share === 'function';

const btn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 7,
  padding: '9px 14px', borderRadius: 10,
  background: 'var(--surface)', border: '1px solid var(--border)',
  fontSize: 12.5, fontWeight: 600, color: 'var(--txt1)',
  cursor: 'pointer', fontFamily: 'inherit',
};

export function PassportShare({ username }: { username: string }): React.ReactElement {
  const [toast, setToast] = useState<string | null>(null);

  function flash(msg: string): void {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  }

  async function onShare(platform: SharePlatform): Promise<void> {
    const r = await sharePassport(username, platform);
    if (r === 'copied') flash('Link copied');
    else if (r === 'shared') flash('Shared');
    else if (r === 'failed') flash('Could not share');
  }

  async function onDownload(): Promise<void> {
    flash('Preparing card...');
    const ok = await downloadPassportCard(username);
    flash(ok ? 'Card downloaded' : 'Download failed');
  }

  return (
    <div className="passport-card" style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 16, boxShadow: 'var(--shadow-card)', padding: 18,
    }}>
      {toast && (
        <div style={{ textAlign: 'right', marginBottom: 8 }}>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--brand)' }}>{toast}</span>
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {canNativeShare() && (
          <button type="button" style={{ ...btn, background: 'var(--brand-btn)', color: '#fff', border: '1px solid var(--brand)' }} onClick={() => void onShare('native')}>Share</button>
        )}
        <button type="button" style={btn} onClick={() => void onShare('copy')}>Copy link</button>
        <button type="button" style={btn} onClick={() => void onShare('twitter')}>X</button>
        <button type="button" style={btn} onClick={() => void onShare('reddit')}>Reddit</button>
        <button type="button" style={btn} onClick={() => void onShare('discord')}>Discord</button>
        <button type="button" style={btn} onClick={() => void onDownload()}>Download card</button>
      </div>
    </div>
  );
}
