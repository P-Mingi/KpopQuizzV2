'use client';

import { useState } from 'react';

// V-POLISH step 5 (audit item 5) - album cover art from the Cover Art Archive,
// keyed by the release-group MBID the catalog already stores (cover_source
// names MusicBrainz as provenance). When the archive has no front image the
// fallback is a DESIGNED placeholder (accent-tinted disc), never a gray void
// with text floating in it.
export function CoverArt({ mbid, title, className }: {
  mbid: string | null; title: string; className?: string;
}): React.ReactElement {
  const [failed, setFailed] = useState(false);
  const showImg = mbid && !failed;
  return (
    <span className={`relative block overflow-hidden ${className ?? ''}`} style={{ aspectRatio: '1 / 1', background: 'var(--verse-soft-strong)' }}>
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://coverartarchive.org/release-group/${mbid}/front-500`}
          alt={`${title} cover art`} loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden className="absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 48 48" width="46%" height="46%" fill="none" stroke="var(--verse-ink)" strokeWidth="2">
            <circle cx="24" cy="24" r="20" opacity="0.55" />
            <circle cx="24" cy="24" r="9" opacity="0.75" />
            <circle cx="24" cy="24" r="2.5" fill="var(--verse-ink)" stroke="none" />
          </svg>
        </span>
      )}
    </span>
  );
}
