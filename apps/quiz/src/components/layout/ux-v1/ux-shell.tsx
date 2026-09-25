import { UxBrand } from '@/components/ux-v1/brand';
import { SiteFooter } from '@/components/layout/site-footer';

import { UxChromeGate, UxNavScroll, UxRouteFocus } from './ux-chrome-gate';
import { UxFooter } from './ux-footer';
import { UxNavActions } from './ux-nav-actions';
import { UxNavLinks } from './ux-nav-links';
import { UxProviders } from './ux-providers';
import { UxTabBar } from './ux-tab-bar';

/**
 * UX v11.2 shell (DESIGN-SPEC 16.5, 17.1), rendered by app/(site)/layout.tsx only
 * when NEXT_PUBLIC_UX_V1 is on. Server component that reads no cookies or headers:
 * the frame (skip link, sticky 64px top bar, <main>, footer, phone tab bar) is in
 * the static HTML, and the user-specific bits are small client islands (active
 * link, account / streak / bell, search overlay, sign-in sheet, toast). Pages
 * keep their static / ISR mode.
 *
 * Replaces the Phase 1 232px sidebar shell (DECISIONS-LOG 2026-09-25, v10).
 */
export function UxShell({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <UxProviders>
      <div className="ux-app">
        <a className="ux-skip" href="#main">Skip to content</a>
        <UxChromeGate part="nav">
          <header className="ux-nav ux-chrome" id="ux-nav">
            <div className="ux-wrap ux-nav-in">
              <UxBrand />
              <UxNavLinks />
              <UxNavActions />
            </div>
          </header>
          <UxNavScroll />
        </UxChromeGate>
        <main id="main" className="ux-main" tabIndex={-1}>{children}</main>
        <SiteFooter play={<UxFooter />} />
        <UxChromeGate part="tabbar"><UxTabBar /></UxChromeGate>
        <UxRouteFocus />
      </div>
    </UxProviders>
  );
}
