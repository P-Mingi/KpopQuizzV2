'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

import { NavBridgeLinks } from '@/components/cards-bridge/nav-bridges';
import { SiteSwitch } from '@/components/site-switch/site-switch';
import { UxBrand } from '@/components/ux-v1/brand';
import { flagOn } from '@/lib/site/registry';
import { isBuilderCanvas, worldForPath } from '@/lib/world';

import { UxChromeGate, UxNavScroll, UxRouteFocus } from './ux-chrome-gate';
import { UxFooter } from './ux-footer';
import { UxNavActions } from './ux-nav-actions';
import { UxNavLinks } from './ux-nav-links';
import { UxProviders } from './ux-providers';
import { UxTabBar } from './ux-tab-bar';

import type { NavBridge } from '@/lib/cards-bridge/nav';
import type { SiteSwitchModel } from '@/lib/site-switch/model';

// Audit 02 P2-1 (risk 8): the Verse footer is only drawn on Verse routes, so its code is a chunk that every other page never fetches (it is still server-rendered where it shows).
const VerseFooter = dynamic(() => import('@/components/verse/verse-footer').then((m) => m.VerseFooter));

// Run O1 (B6): "Your sites" in the account menu. A separate chunk, fetched only when the flag is on and a signed-in member opens the menu.
const NetSitesMenu = dynamic(() => import('@/components/network/net-sites-menu').then((m) => m.NetSitesMenu), { ssr: false });
const NET_MENU = flagOn(process.env.NEXT_PUBLIC_NET_MENU);
// Bunnyverse Cards (lane B, NEXT_PUBLIC_NET_CARDS_BRIDGES, off by default): the "Binder" link of the account menu. Off, the menu is what it was.
const CardsMenuLink = dynamic(() => import('@/components/cards-bridge/cards-menu-link').then((m) => m.CardsMenuLink), { ssr: false });
const CARDS_MENU = flagOn(process.env.NEXT_PUBLIC_NET_CARDS_BRIDGES);

export interface UxClientShellProps {
  children: React.ReactNode;
  /** The Verse is public (lib/verse/visibility, server env): footer "Fandoms" link. */
  showFandoms: boolean;
  year: number;
  /**
   * Run O1 (H2a): the home of the hub brings its own top bar, <main> and footer (docs/o1/design/fanquiz-hub/), so on `/` the shell keeps only
   * its providers (sign-in sheet, toasts), the skip link and the focus rule. Only the hub layout sets it; absent, the shell is the one it always was.
   */
  bare?: boolean;
  /** Daily games step 4: the pages of the Terrier bring their own bar and footer too. Set only by the hub layout, only with the dailyGuess flag on. */
  barePaths?: readonly string[];
  /** Bunnyverse bridges: the KpopCards and Bunnyverse buttons of the top bar. Set only by UxShell, only with NET_CARDS_BRIDGES on; absent, the bar is today's. */
  navBridges?: readonly NavBridge[];
  /** The site switcher (KpopQuiz, OtakuQuiz, Bunnyverse). Set only by UxShell, only while a sister site is open; absent, the bar is today's. */
  siteSwitch?: SiteSwitchModel;
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
export function UxClientShell({ children, showFandoms, year, bare, barePaths, navBridges, siteSwitch }: UxClientShellProps): React.ReactElement {
  const pathname = usePathname() || '/';
  if (bare && (pathname === '/' || barePaths?.includes(pathname))) {
    return (
      <UxProviders>
        <div className="ux-app">
          <a className="ux-skip" href="#main">Skip to content</a>
          {children}
          {/* Owner, 2026-11-22 ("on Bunnyverse the navbar should also be at the bottom"): the hub home and the daily games pages draw their own
              top bar but get the same phone tab bar as every other page (shown up to 900 px by CSS; their top tabs hide there, as .ux-links do). */}
          <UxChromeGate part="tabbar"><UxTabBar /></UxChromeGate>
          <UxRouteFocus />
        </div>
      </UxProviders>
    );
  }
  return (
    <UxProviders>
      <div className="ux-app">
        <a className="ux-skip" href="#main">Skip to content</a>
        <UxChromeGate part="nav">
          <header className="ux-nav ux-chrome" id="ux-nav">
            <div className="ux-wrap ux-nav-in">
              {/* LAUNCH-POLISH-2 F (2026-11-23): with an open sister site the switcher IS the brand (one button: logo, name, chevron); else today's logo. */}
              {siteSwitch ? <SiteSwitch model={siteSwitch} /> : <UxBrand />}
              <UxNavLinks />
              {navBridges ? <NavBridgeLinks items={navBridges} /> : null}
              <UxNavActions {...(CARDS_MENU
                ? { accountExtra: (close: () => void) => <>{CardsMenuLink ? <CardsMenuLink close={close} /> : null}{NET_MENU ? <NetSitesMenu /> : null}</> }
                : NET_MENU ? { accountExtra: () => <NetSitesMenu /> } : {})} />
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
