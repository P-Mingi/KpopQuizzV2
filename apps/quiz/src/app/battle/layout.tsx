import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Battle Rooms - kpopquiz',
  description: 'Real-time K-pop trivia battles with friends',
};

export default function BattleLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  return <>{children}</>;
}
