'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Icon } from '@/components/ux-v1/icon';
import { activeTab, TAB_ITEMS } from '@/lib/ux-v1/a0/nav';

/**
 * Mobile tab bar (16.5 / 17.1): Home, Quizzes, Blindtest, Community, You; 64px +
 * safe area, shown under 760px by CSS. The active icon sits in a pink-soft pill.
 * Every tab is a real <a href> and follows it, "You" included: a guest lands on the
 * passport invitation (P10, /me signed out; prototype `go('you')` for every visitor).
 */
export function UxTabBar(): React.ReactElement {
  const active = activeTab(usePathname() || '/');

  return (
    <nav className="ux-tabbar ux-chrome" aria-label="Main mobile">
      <div className="ux-tabbar-in">
        {TAB_ITEMS.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            className="ux-tab"
            aria-current={active === t.key ? 'page' : undefined}
          >
            <span className="ux-tpill"><Icon name={t.icon} /></span>
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
