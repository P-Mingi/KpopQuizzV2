'use client';

import { usePathname } from 'next/navigation';

// W4b item 1 - the site chrome, and the one surface that must not have it.
//
// THE DEFECT: /embed/* was dragging TopNav, MobileTopBar, the footer and MobileTabBar
// into the partner's iframe. Nobody embeds a widget that pulls a whole site nav into
// their page.
//
// WHY NOT THE ROUTE GROUP I PROPOSED: a second root layout only works in Next when
// EVERY route lives in a group, because `app/layout.tsx` is the root for everything
// while it exists. Doing it properly means relocating all ~60 routes under `app/(site)/`
// to serve one widget, which is exactly the "do not regress the site to fix the widget"
// risk the mission warns about. This achieves the same OUTCOME by deciding in one place
// instead: the chrome self-hides on /embed/*, and the root layout keeps a single
// definition of what the chrome is.
//
// The check runs during SSR too (usePathname is available to client components on the
// server), so the chrome is never in the embed's HTML at all, not merely hidden by CSS.
export function SiteChrome({
  chrome,
  children,
}: {
  chrome: React.ReactNode;
  children: React.ReactNode;
}): React.ReactElement {
  const pathname = usePathname();
  const isEmbed = pathname?.startsWith('/embed') ?? false;

  if (isEmbed) {
    // No nav, no footer, no tab bar, and no max-width main wrapper: an iframe should
    // carry the quiz and nothing else.
    return <>{children}</>;
  }

  return <>{chrome}</>;
}
