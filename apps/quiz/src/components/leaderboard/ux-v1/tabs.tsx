'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { tabPanelProps } from '@/components/ux-v1/tab-panel';
import { UxTabs } from '@/components/ux-v1/tabs';

import { LbTabContext } from './tab-context';

import type { UxIconName } from '@/components/ux-v1/icon';

export interface LbPane {
  id: string;
  label: string;
  icon: UxIconName;
  /** URL hash of the tab (#fandom-war, #players...): shareable, and the group hubs link /leaderboard#fandom-war. */
  hash: string;
  content: React.ReactNode;
}

const PREFIX = 'lb';

/**
 * Fandom war / Players / Ranked / Creators (prototype #leaderboard .utabs). A0's
 * UxTabs (role=tab, arrow keys, pink-soft pill). Every pane is in the server HTML
 * (its boards and links are crawlable); the inactive ones carry `hidden`.
 */
export function LbTabs({ panes }: { panes: LbPane[] }): React.ReactElement {
  const first = panes[0]!.id;
  const [active, setActive] = useState(first);
  const [seen, setSeen] = useState<ReadonlySet<string>>(() => new Set([first]));

  const open = useCallback((id: string) => {
    setActive(id);
    setSeen((s) => (s.has(id) ? s : new Set([...s, id])));
  }, []);

  // A shared link (/leaderboard#players) opens its tab and scrolls to it, on load
  // and when the hash changes on the page (a link to #fandom-war while here).
  useEffect(() => {
    const follow = (): void => {
      const hash = window.location.hash.slice(1);
      const pane = panes.find((p) => p.hash === hash);
      if (!pane) return;
      open(pane.id);
      if (pane.id !== first) {
        requestAnimationFrame(() => document.getElementById(`${PREFIX}-panel-${pane.id}`)?.scrollIntoView({ block: 'start' }));
      }
    };
    follow();
    window.addEventListener('hashchange', follow);
    return () => window.removeEventListener('hashchange', follow);
  }, [panes, first, open]);

  const onChange = useCallback((id: string) => {
    open(id);
    const pane = panes.find((p) => p.id === id);
    if (!pane) return;
    const url = `${window.location.pathname}${window.location.search}${pane.id === first ? '' : `#${pane.hash}`}`;
    window.history.replaceState(window.history.state, '', url);
  }, [open, panes, first]);

  const ctx = useMemo(() => ({ active, seen }), [active, seen]);
  const items = useMemo(() => panes.map((p) => ({ id: p.id, label: p.label, icon: p.icon })), [panes]);

  return (
    <LbTabContext value={ctx}>
      <UxTabs items={items} value={active} onChange={onChange} label="Leaderboards" idPrefix={PREFIX} className="p9-tabs" />
      {panes.map((p) => (
        <div key={p.id} {...tabPanelProps(PREFIX, p.id)} className="p9-pane" hidden={p.id !== active}>
          {p.content}
        </div>
      ))}
    </LbTabContext>
  );
}
