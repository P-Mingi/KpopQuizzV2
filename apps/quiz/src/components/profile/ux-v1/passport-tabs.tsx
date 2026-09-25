'use client';

import { useCallback, useEffect, useState } from 'react';

import { UxTabs } from '@/components/ux-v1/tabs';
import { tabPanelProps } from '@/components/ux-v1/tab-panel';

interface PassportTabsProps {
  items: { id: string; label: string }[];
  /** Server-rendered panels, all in the served HTML (the inactive ones `hidden`). */
  panels: Record<string, React.ReactNode>;
}

/**
 * Passport tabs Overview / Quizzes / History / Badges (16.7): A0's UxTabs (pink-soft
 * pill, arrow keys) over panels the server rendered. In-page links such as "All 20
 * badges" are real #p10-panel-<id> anchors (data-p10-tab): they switch the tab
 * and bring the tab list into view; a #p10-panel-<id> hash on load opens it.
 */
export function PassportTabs({ items, panels }: PassportTabsProps): React.ReactElement {
  const [value, setValue] = useState(items[0]?.id ?? 'overview');

  const open = useCallback((id: string, scroll: boolean) => {
    if (!items.some((t) => t.id === id)) return;
    setValue(id);
    if (scroll) {
      requestAnimationFrame(() => {
        const list = document.querySelector<HTMLElement>('.p10-tabs');
        list?.scrollIntoView({ block: 'start', behavior: 'auto' });
        document.getElementById(`p10-tab-${id}`)?.focus({ preventScroll: true });
      });
    }
  }, [items]);

  useEffect(() => {
    const fromHash = (): string | null => {
      const m = /^#p10-panel-([a-z]+)$/.exec(window.location.hash);
      return m ? m[1]! : null;
    };
    // a #p10-panel-<id> deep link opens that tab once the page is interactive
    const t = window.setTimeout(() => { const first = fromHash(); if (first) open(first, true); }, 0);
    const onHash = (): void => { const id = fromHash(); if (id) open(id, true); };
    const onClick = (e: MouseEvent): void => {
      const a = (e.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a[data-p10-tab]');
      if (!a) return;
      e.preventDefault();
      const id = a.dataset.p10Tab ?? '';
      history.replaceState(null, '', `#p10-panel-${id}`);
      open(id, true);
    };
    window.addEventListener('hashchange', onHash);
    document.addEventListener('click', onClick);
    return () => { window.clearTimeout(t); window.removeEventListener('hashchange', onHash); document.removeEventListener('click', onClick); };
  }, [open]);

  return (
    <>
      <UxTabs items={items} value={value} onChange={(id) => setValue(id)} label="Passport" idPrefix="p10" className="p10-tabs" />
      {items.map((t) => (
        <div key={t.id} {...tabPanelProps('p10', t.id)} data-p10-panel={t.id} hidden={t.id !== value} className="p10-pane">
          {panels[t.id]}
        </div>
      ))}
    </>
  );
}
