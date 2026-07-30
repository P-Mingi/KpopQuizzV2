import Link from 'next/link';

import { relatedForGroup } from '@/lib/verse/related';

/** Auto-navbox: sibling groups by shared category, rendered in an entity-page footer. */
export async function RelatedNavbox({ group }: { group: { slug: string; name: string; generation: string | null; record_label: string | null; origin_country: string | null } }): Promise<React.ReactElement | null> {
  const sections = await relatedForGroup(group);
  if (sections.length === 0) return null;

  // V-DESIGN v2 - the related-graph footer is editorial, not a card: a quiet
  // hairline sets it apart from the content above, then a small-caps eyebrow + a
  // breathing category grid. No border box, no filled background.
  return (
    <nav aria-label="Related groups" className="border-t" style={{ marginTop: 'var(--v-space-section)', paddingTop: '1.5rem', borderColor: 'var(--v-hairline)' }}>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="v-eyebrow" style={{ margin: 0 }}>Related groups</h2>
        <Link href="/verse/tags" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-tertiary no-underline hover:text-secondary">All categories</Link>
      </div>
      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <div key={s.slug}>
            <Link href={`/verse/tag/${s.slug}`} className="text-[11px] font-bold uppercase tracking-[0.1em] no-underline" style={{ color: 'var(--verse-ink)' }}>{s.title}</Link>
            <ul className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5">
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
