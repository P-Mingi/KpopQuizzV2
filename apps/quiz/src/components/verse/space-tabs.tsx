'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { label: 'Home', seg: '' },
  { label: 'Members', seg: 'members' },
  { label: 'Discography', seg: 'discography' },
  { label: 'Timeline', seg: 'timeline' },
  { label: 'Community', seg: 'community' },
  { label: 'About', seg: 'about' },
] as const;

/** Space tab bar. Horizontal-scroll pills on mobile, inline row on wider screens. */
export function SpaceTabs({ slug }: { slug: string }): React.ReactElement {
  const pathname = usePathname();
  const base = `/verse/${slug}`;
  // active segment = the part after the base, first path chunk
  const rest = pathname.startsWith(base) ? pathname.slice(base.length).replace(/^\//, '') : '';
  const activeSeg = rest.split('/')[0] ?? '';

  return (
    <nav aria-label="Space sections" className="verse-tabs -mx-4 mb-6 overflow-x-auto px-4">
      <ul className="flex min-w-max gap-1.5 border-b border-default pb-0">
        {TABS.map((t) => {
          const href = t.seg ? `${base}/${t.seg}` : base;
          const active = activeSeg === t.seg;
          return (
            <li key={t.label}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className="inline-block whitespace-nowrap rounded-t-lg px-3.5 py-2 text-sm font-semibold transition-colors"
                style={active
                  ? { color: 'var(--verse-ink)', borderBottom: '2px solid var(--verse-accent)', background: 'var(--verse-soft)' }
                  : { color: 'var(--text-secondary)', borderBottom: '2px solid transparent' }}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
