'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Icon } from '@/components/ux-v1/icon';
import { useSignIn } from '@/components/ux-v1/sign-in-sheet';
import { useUxMe } from '@/components/ux-v1/use-ux-me';
import { activeTab, TAB_ITEMS } from '@/lib/ux-v1/a0/nav';

/**
 * Mobile tab bar (16.5 / 17.1): Home, Quizzes, Blindtest, Community, You; 64px +
 * safe area, shown under 760px by CSS. The active icon sits in a pink-soft pill.
 * Every tab is a real <a href>; "You" opens the sign-in sheet for a guest (the
 * href stays for crawlers and no-JS).
 */
export function UxTabBar(): React.ReactElement {
  const active = activeTab(usePathname() || '/');
  const me = useUxMe();
  const openSignIn = useSignIn();
  const guest = me !== null && !me.profile;

  return (
    <nav className="ux-tabbar ux-chrome" aria-label="Main mobile">
      <div className="ux-tabbar-in">
        {TAB_ITEMS.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            className="ux-tab"
            aria-current={active === t.key ? 'page' : undefined}
            onClick={(e) => { if (t.key === 'you' && guest) { e.preventDefault(); openSignIn(); } }}
          >
            <span className="ux-tpill"><Icon name={t.icon} /></span>
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
