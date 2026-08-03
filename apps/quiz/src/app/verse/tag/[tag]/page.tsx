import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';

import { getHub, hubGroups } from '@/lib/verse/tags';

import type { Metadata } from 'next';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
  const { tag } = await params;
  const hub = await getHub(tag);
  if (!hub) return { title: 'Category' };
  return {
    title: `${hub.label} - K-pop on Verse`,
    description: `All ${hub.count} K-pop groups on Verse in ${hub.label}.`,
    alternates: { canonical: `https://kpopquiz.org/verse/tag/${tag}` },
  };
}

export default async function TagHubPage({ params }: { params: Promise<{ tag: string }> }): Promise<React.ReactElement> {
  const { tag } = await params;
  const hub = await getHub(tag);
  if (!hub) notFound();
  const groups = await hubGroups(hub);

  // ItemList JSON-LD for the hub (crawlable topic cluster).
  const ld = {
    '@context': 'https://schema.org', '@type': 'ItemList', name: hub.label, numberOfItems: groups.length,
    itemListElement: groups.map((g, i) => ({ '@type': 'ListItem', position: i + 1, name: g.name, url: `https://kpopquiz.org/verse/${g.slug}` })),
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <Breadcrumbs items={[{ label: 'Verse', href: '/verse' }, { label: 'Categories', href: '/verse/tags' }, { label: hub.label }]} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <p className="text-xs uppercase tracking-wide text-tertiary">{hub.dimLabel.replace(/^By /, '')}</p>
      <h1 className="mt-0.5 text-2xl font-black tracking-tight text-primary">{hub.label}</h1>
      <p className="mt-1 text-sm text-secondary">{hub.count} groups. <Link href="/verse/tags" className="underline">All categories</Link></p>
      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {groups.map((g) => (
          <li key={g.slug}>
            <Link href={`/verse/${g.slug}`} className="flex items-center justify-between gap-3 rounded-xl border border-default px-4 py-3 no-underline transition-colors hover:bg-surface-1">
              <span className="font-bold text-primary">{g.name}</span>
              {g.fandom_name ? <span className="text-xs text-tertiary">{g.fandom_name}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
