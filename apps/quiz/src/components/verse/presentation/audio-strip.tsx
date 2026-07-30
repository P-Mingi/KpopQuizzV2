'use client';

// W-CUSTOM step 6 - audio player for the music module's audio / playlist / signature
// modes. preload="none" means NO audio file is fetched until the user hits play
// (click-to-play, never autoplay). Sources are curator-entered, allowlisted hosts.
export function AudioStrip({ tracks, compact }: { tracks: { title: string; url: string }[]; compact?: boolean }): React.ReactElement {
  return (
    <ul className="flex flex-col gap-2">
      {tracks.map((t, i) => (
        <li key={i} className="flex flex-col gap-1">
          {!compact ? <span className="truncate text-xs font-semibold" style={{ color: 'var(--verse-ink)' }}>{t.title}</span> : null}
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio controls preload="none" src={t.url} className="h-9 w-full" />
        </li>
      ))}
    </ul>
  );
}
