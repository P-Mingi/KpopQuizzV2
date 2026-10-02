'use client';

import { useState } from 'react';

import { tabPanelProps } from '@/components/ux-v1/tab-panel';
import { UxTabs } from '@/components/ux-v1/tabs';

type Period = 'month' | 'all';

const ITEMS: Array<{ id: Period; label: string }> = [
  { id: 'month', label: 'This month' },
  { id: 'all', label: 'All time' },
];

const PREFIX = 'g8-cr';

/**
 * The period switch of the creators board (prototype .utabs "This month" / "All
 * time"). Both boards are in the server HTML; the tabs only toggle `hidden`.
 */
export function CreatorsTabs({ month, all }: { month: React.ReactNode; all: React.ReactNode }): React.ReactElement {
  const [period, setPeriod] = useState<Period>('month');
  return (
    <>
      <UxTabs items={ITEMS} value={period} onChange={(id) => setPeriod(id === 'all' ? 'all' : 'month')} label="Period" idPrefix={PREFIX} className="g8-cr-tabs" />
      <div {...tabPanelProps(PREFIX, 'month')} hidden={period !== 'month'} data-period="month">{month}</div>
      <div {...tabPanelProps(PREFIX, 'all')} hidden={period !== 'all'} data-period="all">{all}</div>
    </>
  );
}
