import { MobileTabBar } from '@/components/layout/mobile-tab-bar';
import { SceneWrapper } from '@/components/shared/scene-wrapper';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <SceneWrapper>
      <div className="relative w-full min-h-screen bg-primary">
        {children}
        <MobileTabBar />
      </div>
    </SceneWrapper>
  );
}
