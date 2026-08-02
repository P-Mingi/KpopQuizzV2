'use client';

import { useEffect, useState } from 'react';

import { FanResumeBand, type FanResumeData } from './fan-resume-band';

// V-PROFILE-ONE step 3/3b - the owner reveal. Strangers get the server-rendered
// PUBLIC band (redacted: private sections never reach the HTML). This island
// asks the self-scoped endpoint who the viewer is; only when the viewer IS the
// profile owner does it fetch the full resume and swap the public band for the
// complete owner view (private sections dimmed). Step 3b hangs the per-section
// toggles off `renderToggle`.
export function FanResumeOwner({ profileUsername }: { profileUsername: string }): React.ReactElement | null {
  const [data, setData] = useState<FanResumeData | null>(null);

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
  return <FanResumeBand data={data} mode="owner" nowMs={Date.now()} />;
}
