'use client';

// Owner request 2026-11-13: the badge of the Daily games tab on every hub page, the same count as on the hub home (HomeNavBadge of
// components/hub/home/home-day.tsx): the daily games left today on this device. The server draws no badge (it cannot know this device's
// plays); the browser adds it once it has read them, and follows a game finished in another tab. Loaded only where the tab exists (the
// hub), through next/dynamic in ux-nav-links.tsx, so kpopquiz.org never downloads it.
import { useEffect, useState } from 'react';

import { deviceStore } from '@/components/hub/dle/dle-hooks';
import { utcDate } from '@/lib/dle/day';
import { gamesLeftToday, readHistory } from '@/lib/dle/local';
import { ht } from '@/lib/site/hub/copy';

export default function UxDailyBadge(): React.ReactElement | null {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const read = (): void => setLeft(gamesLeftToday(readHistory(deviceStore()), utcDate(new Date())));
    read();
    window.addEventListener('dle:history', read);
    window.addEventListener('storage', read);
    return () => {
      window.removeEventListener('dle:history', read);
      window.removeEventListener('storage', read);
    };
  }, []);
  if (left === null || left === 0) return null;
  const sr = left === 1 ? ht('hp.nav.burrowLeft1') : ht('hp.nav.burrowLeft', { n: String(left) });
  return (
    <span
      style={{
        display: 'inline-grid', placeItems: 'center', minWidth: 20, height: 20, padding: '0 6px', marginLeft: 6, borderRadius: 999,
        background: '#D23C6E', color: '#fff', fontSize: 12, fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums',
      }}
    >
      <span aria-hidden="true">{left}</span>
      <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}> {sr}</span>
    </span>
  );
}
