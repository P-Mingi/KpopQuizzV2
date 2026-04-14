'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Play' },
  { href: '/create', label: 'Create' },
  { href: '/games', label: 'Games' },
  { href: '/hall-of-fame', label: 'Hall of fame' },
  { href: '/profile', label: 'Profile' },
] as const;

/** Desktop nav links between the logo and the identity pill. */
export function TopNavLinks() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex gap-0.5" aria-label="Main navigation">
      {LINKS.map((link) => {
        const isActive =
          link.href === '/'
            ? pathname === '/'
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
              isActive ? 'text-accent bg-accent-bg' : 'text-tertiary hover:text-primary'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
