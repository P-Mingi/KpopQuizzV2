'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function NavLinks(): React.ReactElement {
  const pathname = usePathname();
  const isGamesActive = pathname === '/games' || pathname.startsWith('/g/');

  return (
    <div className="hidden sm:flex items-center gap-5">
      <Link
        href="/"
        className={`text-sm font-medium transition-colors ${
          !isGamesActive ? 'text-txt-primary' : 'text-txt-tertiary hover:text-txt-secondary'
        }`}
      >
        Quizzes
      </Link>
      <Link
        href="/games"
        className={`text-sm font-medium transition-colors ${
          isGamesActive ? 'text-txt-primary' : 'text-txt-tertiary hover:text-txt-secondary'
        }`}
      >
        Games
      </Link>
    </div>
  );
}
