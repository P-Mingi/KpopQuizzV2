'use client';

import { useState } from 'react';

import { Segmented } from '@/components/ux-v1/segmented';

import type { CreatorsView } from '@/lib/ux-v1/p9/data';

const LABEL: Record<CreatorsView, string> = { all: 'All time', week: 'This week', rising: 'Rising' };

/**
 * The Creators tab's boards: All time (plays received), This week (plays of the
 * quizzes published in the last 7 days) and Rising (new followers in 7 days), the
 * live Hall of Fame's three creator boards. Only the boards that clear the 4-row
 * floor are offered; with one board there is no switch. Every board is in the
 * server HTML (crawlable); the switch only toggles `hidden`. The pinned row (all
 * time standing) shows under All time.
 */
export function CreatorsSwitch({ views, boards, pin }: {
  views: CreatorsView[];
  boards: Partial<Record<CreatorsView, React.ReactNode>>;
  pin: React.ReactNode;
}): React.ReactElement {
  const [view, setView] = useState<CreatorsView>(views[0] ?? 'all');
  return (
    <>
      {views.length > 1 ? (
        <Segmented
          className="p9-cseg"
          label="Creators board"
          options={views.map((v) => ({ value: v, label: LABEL[v] }))}
          value={view}
          onChange={setView}
        />
      ) : null}
      {views.map((v) => (
        <div key={v} className="p9-cview" data-view={v} hidden={v !== view}>
          {boards[v]}
        </div>
      ))}
      {view === 'all' ? pin : null}
    </>
  );
}
