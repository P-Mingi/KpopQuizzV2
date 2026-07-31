'use client';

import { useEffect, useState } from 'react';

// V4 Part 1 item 4 - THE PLAY AFFORDANCE. Click-to-play per track, never
// autoplay on load, NO audio uploads, no unlicensed streaming: playback is a
// YouTube embed (the blindtest's existing legal source). The curated official
// video (curator-set, per track) wins; the default is the blindtest clip's
// video seeked to its chorus offset. One player at a time across the page.

let activeClose: (() => void) | null = null;

export function videoIdFrom(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,20})/i);
  return m?.[1] ?? null;
}

export function TrackPlay({ youtubeId, start = 0, curatedUrl, title, size = 'row' }: {
  /** The blindtest's video for this track (the default source). */
  youtubeId?: string | null;
  /** Chorus offset in seconds for the default clip. */
  start?: number;
  /** Curator-picked official video URL; wins over the default. */
  curatedUrl?: string | null;
  title: string;
  size?: 'row' | 'hero';
}): React.ReactElement | null {
  const [open, setOpen] = useState(false);

  useEffect(() => () => { if (activeClose === close) activeClose = null; }, []);
  const curatedId = videoIdFrom(curatedUrl);
  const id = curatedId ?? youtubeId ?? null;
  if (!id) return null;
  const seek = curatedId ? 0 : Math.max(0, Math.floor(start));

  function close(): void { setOpen(false); }
  function play(): void {
    activeClose?.();
    activeClose = close;
    setOpen(true);
  }

  if (!open) {
    return (
      <button type="button" onClick={play} aria-label={`Play ${title}`}
        className={size === 'hero'
          ? 'v-tap inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 text-sm font-bold'
          : 'v-tap inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-bold'}
        style={size === 'hero'
          ? { background: 'var(--verse-cta, var(--verse-accent))', color: 'var(--verse-cta-text, var(--verse-accent-text))' }
          : { borderColor: 'var(--verse-line)', color: 'var(--verse-ink)' }}>
        <svg viewBox="0 0 24 24" width={size === 'hero' ? 14 : 11} height={size === 'hero' ? 14 : 11} fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
        {size === 'hero' ? 'Play' : curatedId ? 'Video' : 'Clip'}
      </button>
    );
  }

  return (
    <span className="block w-full max-w-[420px]">
      <span className="relative block overflow-hidden rounded-lg border" style={{ borderColor: 'var(--verse-line)', aspectRatio: '16 / 9' }}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&start=${seek}&rel=0`}
          title={`${title} on YouTube`}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full border-0"
        />
      </span>
      <button type="button" onClick={close} className="v-tap mt-1 inline-flex items-center text-[11px] font-semibold text-tertiary hover:text-secondary">Close player</button>
    </span>
  );
}
