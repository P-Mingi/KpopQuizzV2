import { TopNav } from '@/components/layout/top-nav';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Sidebar } from '@/components/layout/sidebar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopNav />
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
