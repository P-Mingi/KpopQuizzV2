import Link from 'next/link';

import { relatedForGroup } from '@/lib/verse/related';

/** Auto-navbox: sibling groups by shared category, rendered in an entity-page footer. */
export async function RelatedNavbox({ group }: { group: { slug: string; name: string; generation: string | null; record_label: string | null; origin_country: string | null } }): Promise<React.ReactElement | null> {
  const sections = await relatedForGroup(group);
  if (sections.length === 0) return null;

  return (
    <nav aria-label="Related groups" className="mt-8 rounded-xl border p-4" style={{ borderColor: 'var(--verse-line)', background: 'var(--verse-soft)' }}>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--verse-ink)' }}>Related groups</h2>
        <Link href="/verse/tags" className="text-xs text-tertiary no-underline hover:text-secondary">All categories</Link>
      </div>
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <div key={s.slug}>
            <Link href={`/verse/tag/${s.slug}`} className="text-[11px] font-bold uppercase tracking-wide no-underline" style={{ color: 'var(--verse-ink)' }}>{s.title}</Link>
            <ul className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
              {s.groups.map((g, i) => (
                <li key={g.slug} className="text-sm">
                  <Link href={`/verse/${g.slug}`} className="text-secondary no-underline hover:text-primary">{g.name}</Link>
                  {i < s.groups.length - 1 ? <span className="text-tertiary"> ·</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
