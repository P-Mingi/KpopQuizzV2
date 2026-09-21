import { SearchBar } from '@/components/home/search-bar';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { NotificationBell } from '@/components/layout/notification-bell';
import { TopNavProfile } from '@/components/layout/top-nav-profile';
import { Footer } from '@/components/layout/footer';

import { UxSidebar } from './ux-sidebar';
import { UxMobileNav } from './ux-mobile-nav';
import { UxStreakPill } from './ux-streak-pill';

/**
 * UX v1 shell (DESIGN-SPEC 3). Server component: it renders the static frame and
 * hands off every user-specific bit to the SAME client islands the current chrome
 * uses (SearchBar, ThemeToggle, NotificationBell, TopNavProfile) plus the two new
 * count/streak islands. No cookie/header read here, so wrapping a page in this
 * shell keeps the page's static/ISR render mode - exactly like the current
 * (site) chrome it replaces behind the flag.
 *
 * The theme toggle is the EXISTING one (class-based .dark/.light), reused, not a
 * parallel system. Footer is the existing Footer, reused.
 */
export function UxShell({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div className="uxv1-app">
      <UxSidebar />
      <div className="uxv1-col">
        <header className="uxv1-topbar">
          <div className="uxv1-topbar-search"><SearchBar /></div>
          <div className="uxv1-topbar-actions">
            <UxStreakPill />
            <ThemeToggle className="uxv1-icon-btn" />
            <NotificationBell />
            <TopNavProfile />
          </div>
        </header>
        <main className="uxv1-content">{children}</main>
        <div className="uxv1-footer"><Footer /></div>
      </div>
      <UxMobileNav />
    </div>
  );
}
