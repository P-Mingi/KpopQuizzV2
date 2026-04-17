import { SceneWrapper } from '@/components/shared/scene-wrapper';

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <SceneWrapper>
      <div className="relative w-full h-screen overflow-hidden">
        {children}
      </div>
    </SceneWrapper>
  );
}
