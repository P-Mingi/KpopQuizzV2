'use client';

import { useState } from 'react';

// W-CUSTOM step 6 - the click-to-load facade. Until the user clicks, this renders a
// LOCAL poster + play button only (our own gradient, never a third-party thumbnail),
// so a page with music/social/discord modules makes ZERO third-party requests on
// load. The iframe (and its network traffic) is injected only on click. Never
// autoplay. Proven with a network log in verify.
export function ClickToLoad({ iframeSrc, iframeTitle, allow, aspect = '16 / 9', label }: {
  iframeSrc: string;
  iframeTitle: string;
  allow?: string;
  aspect?: string;
  label: string;
}): React.ReactElement {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative w-full overflow-hidden rounded-xl border" style={{ aspectRatio: aspect, borderColor: 'var(--verse-line)', background: 'var(--verse-soft-strong)' }}>
      {loaded ? (
        <iframe
          src={iframeSrc}
          title={iframeTitle}
          allow={allow}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <button
          type="button"
          onClick={() => setLoaded(true)}
          className="group absolute inset-0 flex h-full w-full flex-col items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, var(--verse-soft-strong), var(--verse-soft))' }}
          aria-label={`Load ${label}`}
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full shadow transition-transform group-hover:scale-110" style={{ background: 'var(--verse-accent)', color: 'var(--verse-accent-text)' }}>
            <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
          </span>
          <span className="text-xs font-semibold" style={{ color: 'var(--verse-ink)' }}>{label}</span>
        </button>
      )}
    </div>
  );
}
