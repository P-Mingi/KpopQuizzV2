import { TopNav } from '@/components/layout/top-nav';
import { MobileTabBar } from '@/components/layout/mobile-tab-bar';
import { Sidebar } from '@/components/layout/sidebar';
import { getLevelFromXP } from '@/lib/progression';
import { createServerClient, createServiceRoleClient } from '@kpopquiz/shared/supabase/server';

interface NavUser {
  username: string;
  streak: number;
  level: number;
  xpProgress: number;
  avatarBg?: string;
  avatarText?: string;
}

async function getNavUser(): Promise<NavUser | undefined> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return undefined;
    // bt_players is the canonical player table; the legacy 'players' is no longer in sync.
    const adminDb = createServiceRoleClient();
    const { data } = await adminDb
      .from('bt_players')
      .select('display_name, total_xp, current_streak')
      .eq('user_id', user.id)
      .single();
    if (!data) return undefined;

    const totalXp = (data.total_xp as number | null) ?? 0;
    const info = getLevelFromXP(totalXp);
    const rawName = (data.display_name as string | null) ?? 'Player';
    const username = rawName.replace(/#\d+$/, '');

    return {
      username,
      streak: (data.current_streak as number | null) ?? 0,
      level: info.level,
      xpProgress: info.progressPercent / 100,
    };
  } catch {
    return undefined;
  }
}

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const navUser = await getNavUser();
  return (
    <>
      {navUser ? <TopNav user={navUser} /> : <TopNav />}
      <div className="flex gap-6 px-4 md:px-6 pb-24 md:pb-8">
        {/* Main content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>

        {/* Sidebar; desktop only */}
        <aside className="hidden md:block w-[280px] flex-shrink-0 pt-5">
          <Sidebar />
        </aside>
      </div>
      <MobileTabBar />
    </>
  );
}
