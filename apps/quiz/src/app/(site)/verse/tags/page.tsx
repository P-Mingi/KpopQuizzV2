import Link from 'next/link';
import { SectionHeader } from '@/components/verse/primitives/section-header';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';

import { listHubs } from '@/lib/verse/tags';

import type { Metadata } from 'next';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Browse K-pop groups by category',
  description: 'K-pop groups on Verse by generation, label and country.',
  alternates: { canonical: 'https://kpopquiz.org/verse/tags' },
};

export default async function TagsDirectoryPage(): Promise<React.ReactElement> {
  const hubs = await listHubs();
  const dims = [...new Map(hubs.map((h) => [h.dim, h.dimLabel])).entries()];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <Breadcrumbs items={[{ label: 'Verse', href: '/verse' }, { label: 'Categories' }]} />
      <h1 className="text-2xl font-black tracking-tight text-primary">Browse by category</h1>
      <p className="mt-1 text-sm text-secondary">Every K-pop group on Verse, grouped by generation, label and country.</p>
      <div className="mt-6 space-y-6">
        {dims.map(([dim, dimLabel]) => (
          <section key={dim}>
            <SectionHeader kicker={dimLabel} as="h2" />
            <div className="flex flex-wrap gap-2">
              {hubs.filter((h) => h.dim === dim).map((h) => (
                <Link key={h.slug} href={`/verse/tag/${h.slug}`} className="inline-flex items-center gap-1.5 rounded-full border border-default px-3 py-1.5 text-sm no-underline transition-colors hover:bg-surface-1">
                  <span className="font-semibold text-primary">{h.label}</span>
                  <span className="text-xs tabular-nums text-tertiary">{h.count}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
