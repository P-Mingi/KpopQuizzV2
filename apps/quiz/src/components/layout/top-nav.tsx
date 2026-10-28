import { Logo } from './logo';
import { TopNavBar } from './top-nav-bar';
import { ThemeToggle } from './theme-toggle';
import { TopNavProfile } from './top-nav-profile';
import { NotificationBell } from './notification-bell';

/**
 * Top nav entry point. Server component with no cookie/auth reads, so every page
 * that uses this layout stays static/ISR-cacheable. It hands the world-aware shell
 * (<TopNavBar>, client) its server-rendered pieces as props: the logo plus the two
 * auth islands (<TopNavProfile>, <NotificationBell>) that fetch /api/auth/me on
 * hydrate - the only place Supabase is touched.
 *
 * The shell derives the world from the path (Play vs Verse) and themes itself
 * accordingly. Hidden on mobile via CSS (.top-nav); the mobile chrome is separate.
 */
export function TopNav(): React.ReactElement {
  return (
    <TopNavBar
      logo={<Logo size="md" />}
      themeToggle={<ThemeToggle className="nav-theme-toggle" />}
      bell={<NotificationBell />}
      profile={<TopNavProfile />}
    />
  );
}
