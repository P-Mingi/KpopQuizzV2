import { TopNav } from '@/components/layout/top-nav';
import { MobileTabBar } from '@/components/layout/mobile-tab-bar';
import { Sidebar } from '@/components/layout/sidebar';
import { getLevelFromXP } from '@/lib/progression';
import { createServerClient } from '@kpopquiz/shared/supabase/server';

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
    const { data } = await supabase
      .from('players')
      .select('username, current_streak, xp, avatar_bg, avatar_text')
      .eq('id', user.id)
      .single();
    if (!data) return undefined;

    const xp = (data.xp as number | null) ?? 0;
    const info = getLevelFromXP(xp);

    const avatarBg = data.avatar_bg as string | null;
    const avatarText = data.avatar_text as string | null;

    const base: NavUser = {
      username: data.username as string,
      streak: (data.current_streak as number | null) ?? 0,
      level: info.level,
      xpProgress: info.progressPercent / 100,
    };
    if (avatarBg) base.avatarBg = avatarBg;
    if (avatarText) base.avatarText = avatarText;
    return base;
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
