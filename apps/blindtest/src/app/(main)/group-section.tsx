'use client';

import { useState } from 'react';
import Link from 'next/link';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ModeData = any;

const INITIAL_VISIBLE = 6;

export function GroupSection({ modes }: { modes: ModeData[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? modes : modes.slice(0, INITIAL_VISIBLE);
  const hasMore = modes.length > INITIAL_VISIBLE;

  return (
    <div className="mb-7">
      {/* Desktop: 3-col grid, capped at 6 initially */}
      <div className="hidden md:grid md:grid-cols-3 gap-2.5 mb-2.5">
        {visible.map((m: ModeData) => (
          <GroupModeCard key={m.id} mode={m} />
        ))}
      </div>

      {/* Mobile: horizontal scroll, show all */}
      <div className="md:hidden flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
        {modes.map((m: ModeData) => (
          <GroupModeCard key={m.id} mode={m} mobile />
        ))}
      </div>

      {/* Show more button — desktop only */}
      {hasMore && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="hidden md:block w-full py-2.5 rounded-xl border border-border-default text-[13px] text-text-secondary hover:border-border-hover hover:text-text-primary transition-colors"
        >
          Show {modes.length - INITIAL_VISIBLE} more groups
        </button>
      )}
    </div>
  );
}

function GroupModeCard({ mode, mobile }: { mode: ModeData; mobile?: boolean }) {
  return (
    <Link href={mode.available ? `/play/${mode.id}` : '#'} className={!mode.available ? 'pointer-events-none' : ''}>
      <div className={`${mobile ? 'w-[130px] flex-shrink-0' : 'w-auto'} rounded-xl overflow-hidden bg-bg-secondary border border-border-default shadow-card ${
        mode.available ? 'hover:border-border-hover' : 'opacity-40'
      }`}>
        <div className="h-14 overflow-hidden">
          <GroupBanner name={mode.title} imageUrl={mode.image_url} />
        </div>
        <div className="p-2.5">
          <p className="text-[13px] font-medium">{mode.title}</p>
          <p className="text-[10px] text-text-tertiary">{mode.song_count_available} songs</p>
        </div>
      </div>
    </Link>
  );
}

function GroupBanner({ name, imageUrl }: { name: string; imageUrl?: string }) {
  if (imageUrl) {
    return <img src={imageUrl} alt={name} className="w-full h-full object-cover" />;
  }
  // Deterministic gradient derived from the group name
  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  const hue2 = (hue + 50) % 360;
  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ background: `linear-gradient(135deg, hsl(${hue}, 55%, 28%), hsl(${hue2}, 65%, 18%))` }}
    >
      <span
        className="text-[11px] font-semibold px-2 text-center leading-tight"
        style={{ color: `hsl(${hue}, 70%, 82%)` }}
      >
        {name}
      </span>
    </div>
  );
}
