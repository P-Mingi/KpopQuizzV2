import { MobileTabBar } from '@/components/layout/mobile-tab-bar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full min-h-screen bg-primary">
      {children}
      <MobileTabBar />
    </div>
  );
}
