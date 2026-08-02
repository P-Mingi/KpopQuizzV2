'use client';

import { useEffect, useState } from 'react';

import { FanResumeBand, type FanResumeData } from './fan-resume-band';

import { LEGACY_SECTIONS } from '@/lib/verse/profile-sections';

import type { ProfileSection } from '@/lib/verse/profile-sections';

const LEGACY_LABELS: Record<(typeof LEGACY_SECTIONS)[number], string> = {
  spaces: 'Verse spaces', contributions: 'Contribution graph', collection: 'Photocard collection', essays_list: 'Essays',
};
// Human names for every section, so the toggle's accessible name never announces
// a raw key ('essays_list').
const SECTION_LABELS: Record<ProfileSection, string> = {
  roles: 'Spaces', contrib_xp: 'Contribution XP', pages: 'Pages', essays: 'Essays', cards: 'Showcase', quiz: 'Quiz accuracy', activity: 'Recent activity',
  ...LEGACY_LABELS,
};

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
        aria-pressed={isPublic} aria-label={`${SECTION_LABELS[section]} visibility: ${isPublic ? 'public' : 'only you'}. Tap to ${isPublic ? 'make private' : 'make public'}.`}
        className="inline-flex min-h-[24px] items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors disabled:opacity-50"
        style={isPublic
          ? { background: 'var(--verse-soft, #e9e6fb)', color: 'var(--verse-ink, #3c3489)' }
          : { background: 'var(--bg-surface-1, #f1f1f4)', color: 'var(--text-secondary, #555)' }}
      >
        <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: isPublic ? 'currentColor' : 'transparent', border: isPublic ? 'none' : '1px solid currentColor' }} />
        {isPublic ? 'Public' : 'Only you'}
      </button>
    );
  };

  return (
    <>
      <FanResumeBand data={data} mode="owner" nowMs={Date.now()} renderToggle={renderToggle} />
      {/* The legacy profile cards fold under the same control. A private section is
          absent from the crawlable page; the owner flips it here (the card itself
          renders on the profile when public). */}
      <section aria-label="Profile visibility" style={{ marginTop: 14, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>
        <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Who can see the rest</h2>
          <p className="mt-0.5 mb-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>These sections show on your public profile only when set to Public.</p>
          <ul className="space-y-2">
            {LEGACY_SECTIONS.map((s) => (
              <li key={s} className="flex items-center justify-between gap-3">
                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{LEGACY_LABELS[s]}</span>
                {renderToggle(s)}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
