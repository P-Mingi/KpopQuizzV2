'use client';

import { useEffect, useState } from 'react';

import { FanResumeBand, type FanResumeData } from './fan-resume-band';

import type { ProfileSection } from '@/lib/verse/profile-visibility';

// V-PROFILE-ONE step 3/3b - the owner reveal + the per-section privacy controls.
// Strangers get the server-rendered PUBLIC band (redacted). This island asks the
// self-scoped endpoint who the viewer is; only for the profile OWNER does it fetch
// the full resume and swap the public band for the complete view. Each section
// carries a Public / Only you TOGGLE (default Only you) that PATCHes the one flag
// and updates live - the single settings surface for profile visibility.
export function FanResumeOwner({ profileUsername }: { profileUsername: string }): React.ReactElement | null {
  const [data, setData] = useState<FanResumeData | null>(null);
  const [busy, setBusy] = useState<ProfileSection | null>(null);

  useEffect(() => {
    let live = true;
    fetch('/api/verse/profile/resume', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!live || !d?.signedIn || d.username !== profileUsername) return;
        setData({ username: d.username, visibility: d.visibility, stats: d.stats, activity: d.activity });
        const el = document.getElementById('resume-public');
        if (el) el.hidden = true; // the owner sees the full band in place of the public subset
      })
      .catch(() => {});
    return () => { live = false; };
  }, [profileUsername]);

  if (!data) return null;

  const toggle = async (section: ProfileSection): Promise<void> => {
    if (busy) return;
    const next = !data.visibility[section];
    setBusy(section);
    const res = await fetch('/api/verse/profile/resume', {
      method: 'PATCH', credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ section, is_public: next }),
    }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    setBusy(null);
    if (res?.visibility) setData({ ...data, visibility: res.visibility });
  };

  const renderToggle = (section: ProfileSection): React.ReactNode => {
    const isPublic = data.visibility[section];
    return (
      <button
        type="button" onClick={() => toggle(section)} disabled={busy === section}
        aria-pressed={isPublic} aria-label={`${section} visibility: ${isPublic ? 'public' : 'only you'}. Tap to ${isPublic ? 'make private' : 'make public'}.`}
        className="inline-flex min-h-[24px] items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors disabled:opacity-50"
        style={isPublic
          ? { background: 'var(--verse-soft, #e9e6fb)', color: 'var(--verse-ink, #3c3489)' }
          : { background: 'var(--bg-surface-1, #f1f1f4)', color: 'var(--text-tertiary, #8a8a94)' }}
      >
        <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: isPublic ? 'currentColor' : 'transparent', border: isPublic ? 'none' : '1px solid currentColor' }} />
        {isPublic ? 'Public' : 'Only you'}
      </button>
    );
  };

  return <FanResumeBand data={data} mode="owner" nowMs={Date.now()} renderToggle={renderToggle} />;
}
