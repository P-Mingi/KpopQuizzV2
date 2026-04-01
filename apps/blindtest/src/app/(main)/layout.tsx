import { TopNav } from '@/components/layout/top-nav';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Sidebar } from '@/components/layout/sidebar';
import { createServerClient } from '@kpopquiz/shared/supabase/server';

async function getNavUser() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return undefined;
    const { data } = await supabase.from('players').select('username, streak').eq('id', user.id).single();
    return data ?? undefined;
  } catch {
    return undefined;
  }
}

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const navUser = await getNavUser();
  return (
    <>
      <TopNav {...(navUser ? { user: navUser } : {})} />
      <div className="flex gap-6 px-4 md:px-6 pb-24 md:pb-8">
        {/* Main content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>

        {/* Sidebar -- desktop only */}
        <aside className="hidden md:block w-[280px] flex-shrink-0 pt-5">
          <Sidebar />
        </aside>
      </div>
      {/* Bottom nav -- mobile only */}
      <div className="md:hidden">
        <BottomNav />
      </div>
    </>
  );
}
