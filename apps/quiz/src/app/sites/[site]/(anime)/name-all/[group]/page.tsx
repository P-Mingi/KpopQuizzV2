// Run O1 twin (rule 18) of apps/quiz/src/app/(site)/name-all/[group]/page.tsx, rows 15: copied by scripts/o1/twins-codemod.mjs; kpop modules imported, not copied.
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { NameAllAbout } from '@/components/name-all/about';
import { NameAllGame } from '@/components/name-all/game';
import { UxPage } from '@/components/ux-v1/page';
import { ROUND_SECONDS, prettyPath } from '@/lib/name-all/round';
import { getNameAllSet, getNameAllStats } from '@/lib/name-all/server';
import { getAllGroups } from '@/lib/db/queries/groups';
import { getWmaGroupSlugs } from '@/lib/personality/data';
import { jsonLdString } from '@/lib/seo/json-ld';
import { getPlayableGroups, settle } from '@/lib/ux-v1/p6/hub-data';
import { isUxV12 } from '@/lib/ux-v12';
import { groupOgImage } from '@/lib/seo/og';
import { SITE } from '@/lib/site/registry';

import type { NameAllSet } from '@/lib/name-all/server';
import type { NameAllWords } from '@/lib/name-all/words';
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

// Run O1: the words, the host and the origin come from the registry of the site of the build.
const V = SITE.vocabulary;
const WORDS: NameAllWords = {
  member: V.member,
  members: V.memberPlural,
  topic: V.topic,
  brand: SITE.brand.name,
  host: SITE.domain,
  origin: SITE.url,
  acceptedAbout: 'Full names, short names and nicknames are all accepted',
  acceptedIntro: 'Full names, short names and nicknames all count',
};
const ORIGIN = SITE.url;

async function load(slug: string): Promise<NameAllSet | null> {
  if (!isUxV12()) return null;
  return getNameAllSet(slug);
}

function titleOf(set: NameAllSet): string {
  return `Name all ${set.members.length} ${set.group.name} ${WORDS.members} in ${ROUND_SECONDS} seconds`;
}

function descriptionOf(set: NameAllSet): string {
  return `Can you name all ${set.members.length} ${set.group.name} ${WORDS.members} before the clock runs out? ${ROUND_SECONDS} seconds, type each name and press Enter. ${WORDS.acceptedIntro}.`;
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
    openGraph: { title, description, url: `${ORIGIN}${canonical}`, type: 'website', images: [groupOgImage(set.group.slug, title)] },
    twitter: { card: 'summary', title, description },
  };
}

export default async function NameAllPage({ params }: PageProps): Promise<React.ReactElement> {
  const { group } = await params;
  const set = await load(group);
  if (!set) notFound();
  // The links below the game: settled reads, so a blip drops a link, never the page.
  const [stats, wma, bt, groups] = await Promise.all([
    getNameAllStats(set),
    getWmaGroupSlugs(),
    settle(() => getPlayableGroups(), null),
    settle(() => getAllGroups(), null),
  ]);
  const names = new Map((groups.value ?? []).map((g) => [g.slug, g.name] as const));
  const hub = `/${set.group.slug}-quiz`;
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Series', item: `${ORIGIN}/series` },
      { '@type': 'ListItem', position: 2, name: set.group.name, item: `${ORIGIN}${hub}` },
      { '@type': 'ListItem', position: 3, name: 'Name them all', item: `${ORIGIN}${prettyPath(set.group.slug)}` },
    ],
  };
  return (
    <UxPage width="wide" className="ux-nta-page">
      <nav className="ux-crumb" aria-label="Breadcrumb">
        <Link href="/series">Series</Link>
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
        words={WORDS}
      />
      <NameAllAbout set={set} stats={stats} wmaSlugs={wma} blindtestSlugs={(bt.value ?? []).map((g) => g.slug)} names={names} words={WORDS} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumb) }} />
    </UxPage>
  );
}
