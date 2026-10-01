'use client';

import { usePathname } from 'next/navigation';

import { VerseFooter } from '@/components/verse/verse-footer';
import { UxBrand } from '@/components/ux-v1/brand';
import { isBuilderCanvas, worldForPath } from '@/lib/world';

import { UxChromeGate, UxNavScroll, UxRouteFocus } from './ux-chrome-gate';
import { UxFooter } from './ux-footer';
import { UxNavActions } from './ux-nav-actions';
import { UxNavLinks } from './ux-nav-links';
import { UxProviders } from './ux-providers';
import { UxTabBar } from './ux-tab-bar';

export interface UxClientShellProps {
  children: React.ReactNode;
  /** The Verse is public (lib/verse/visibility, server env): footer "Fandoms" link. */
  showFandoms: boolean;
  year: number;
}

/** Footer per world, like the legacy SiteFooter: none on the builder canvas, the
 *  Verse footer on Verse routes, the v11 footer everywhere else. */
function Footer({ showFandoms, year }: { showFandoms: boolean; year: number }): React.ReactElement | null {
  const pathname = usePathname() || '/';
  if (isBuilderCanvas(pathname)) return null;
  if (worldForPath(pathname) === 'verse') return <VerseFooter />;
  return <UxFooter showFandoms={showFandoms} year={year} />;
}

/**
 * The v11 shell tree (DESIGN-SPEC 16.5, 17.1): skip link, sticky 64px top bar,
 * <main>, footer, phone tab bar, providers (toast + live region, sign-in sheet,
 * search overlay). Client component, server-rendered like any client component,
 * loaded through UxShellLoader (next/dynamic) so its code ships only to pages
 * that render it (flag on). The page itself arrives as server-rendered children.
 */
export function UxClientShell({ children, showFandoms, year }: UxClientShellProps): React.ReactElement {
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
        <Footer showFandoms={showFandoms} year={year} />
        <UxChromeGate part="tabbar"><UxTabBar /></UxChromeGate>
        <UxRouteFocus />
      </div>
    </UxProviders>
  );
}
