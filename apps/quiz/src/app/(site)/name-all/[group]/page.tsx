import Link from 'next/link';
import { notFound } from 'next/navigation';

import { NameAllGame } from '@/components/name-all/game';
import { UxPage } from '@/components/ux-v1/page';
import { ROUND_SECONDS, prettyPath } from '@/lib/name-all/round';
import { getNameAllSet, getNameAllStats } from '@/lib/name-all/server';
import { jsonLdString } from '@/lib/seo/json-ld';
import { isUxV12 } from '@/lib/ux-v12';

import type { NameAllSet } from '@/lib/name-all/server';
import type { Metadata } from 'next';

// Name them all (V12 G6, SYSTEM.md 5.1, prototype view `nta`).
//
// Internal route. The public URL is /<group>-name-all-members, a rewrite in
// next.config.ts that exists only with the v12 flag and carries `?via=pretty`:
//   reached through the rewrite   indexable, canonical = the pretty URL
//   reached as /name-all/<group>  noindex, same canonical
// Flag off: 404 here (and the middleware 301s both URLs to / before that, as today).

interface PageProps {
  params: Promise<{ group: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const SITE = 'https://kpopquiz.org';

async function load(slug: string): Promise<NameAllSet | null> {
  if (!isUxV12()) return null;
  return getNameAllSet(slug);
}

function titleOf(set: NameAllSet): string {
  return `Name all ${set.members.length} ${set.group.name} members in ${ROUND_SECONDS} seconds`;
}

function descriptionOf(set: NameAllSet): string {
  return `Can you name all ${set.members.length} ${set.group.name} members before the clock runs out? ${ROUND_SECONDS} seconds, type each name and press Enter. Stage names, real names and Hangul all count.`;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const [{ group }, query] = await Promise.all([params, searchParams]);
  const set = await load(group);
  if (!set) return { robots: { index: false, follow: false } };
  const canonical = prettyPath(set.group.slug);
  const pretty = query.via === 'pretty';
  const title = titleOf(set);
  const description = descriptionOf(set);
  return {
    title,
    description,
    alternates: { canonical },
    robots: pretty ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: { title, description, url: `${SITE}${canonical}`, type: 'website' },
    twitter: { card: 'summary', title, description },
  };
}

export default async function NameAllPage({ params }: PageProps): Promise<React.ReactElement> {
  const { group } = await params;
  const set = await load(group);
  if (!set) notFound();
  const stats = await getNameAllStats(set);
  const hub = `/${set.group.slug}-quiz`;
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Groups', item: `${SITE}/groups` },
      { '@type': 'ListItem', position: 2, name: set.group.name, item: `${SITE}${hub}` },
      { '@type': 'ListItem', position: 3, name: 'Name them all', item: `${SITE}${prettyPath(set.group.slug)}` },
    ],
  };
  return (
    <UxPage width="wide" className="ux-nta-page">
      <nav className="ux-crumb" aria-label="Breadcrumb">
        <Link href="/groups">Groups</Link>
        <span className="ux-nta-sep" aria-hidden="true">/</span>
        <Link href={hub}>{set.group.name}</Link>
        <span className="ux-nta-sep" aria-hidden="true">/</span>
        <span aria-current="page">Name them all</span>
      </nav>
      <NameAllGame
        group={{ slug: set.group.slug, name: set.group.name }}
        members={set.members}
        stats={stats}
        path={prettyPath(set.group.slug)}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumb) }} />
    </UxPage>
  );
}
