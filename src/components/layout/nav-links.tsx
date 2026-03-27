'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function ActiveNavLinks(): React.ReactElement {
  const pathname = usePathname();
  const isGames = pathname === '/games' || pathname.startsWith('/g/');

  return (
    <div className="flex items-center gap-4 mr-1">
      <Link
        href="/"
        className={`text-sm font-medium transition-colors ${
          isGames ? 'text-txt-tertiary hover:text-txt-secondary' : 'text-txt-primary'
        }`}
      >
        Quizzes
      </Link>
      <Link
        href="/games"
        className={`text-sm font-medium transition-colors ${
          isGames ? 'text-txt-primary' : 'text-txt-tertiary hover:text-txt-secondary'
        }`}
      >
        Games
      </Link>
    </div>
  );
}
