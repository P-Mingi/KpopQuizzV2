import { notFound, permanentRedirect } from 'next/navigation';

import { SpaceHero } from '@/components/verse/space-hero';
import { SpaceTabs } from '@/components/verse/space-tabs';
import { getSpace } from '@/lib/verse/space';
import { sceneCounts } from '@/lib/verse/entities';
import { photocardCount } from '@/lib/verse/photocards';
import { collectibleCount } from '@/lib/verse/collectibles';
import { resolveGroupAlias } from '@/lib/verse/aliases';
import { resolveName } from '@/lib/verse/disambig';
import { SCENE_LIST } from '@/lib/verse/entity-types';
import { presentationScopeStyle } from '@/lib/verse/presentation/scope';

import type { Metadata } from 'next';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) return { title: 'Verse' };
  const { group, counts } = space;
  const title = `${group.fandom_name} - Home of ${group.name} fans`;
  const description = `${group.name} on Verse: ${counts.members} members, ${counts.albums} releases, discography, timeline and community. Sourced, fan-run.`;
  return {
    title,
    description,
    alternates: { canonical: `https://kpopquiz.org/verse/${group.slug}` },
    openGraph: { title, description, url: `https://kpopquiz.org/verse/${group.slug}`, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function SpaceLayout({
  params, children,
}: { params: Promise<{ slug: string }>; children: React.ReactNode }): Promise<React.ReactElement> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) {
    // A name variant (bangtan -> bts, girls-generation -> snsd) redirects to canonical.
    const canonical = await resolveGroupAlias(slug);
    if (canonical) permanentRedirect(`/verse/${canonical}`);
    // Otherwise try to resolve the slug as an entity name: one match redirects to its
    // page, several go to a disambiguation chooser.
    const named = await resolveName(slug);
    if (named.length === 1) permanentRedirect(named[0]!.href);
    if (named.length > 1) permanentRedirect(`/verse/name/${slug}`);
    notFound();
  }

  // Scene tabs (Tours / Shows / OST / Awards) appear only where there is published content.
  const [counts, pcCount, colCount] = await Promise.all([
    sceneCounts(space.group.id), photocardCount(space.group.id), collectibleCount(space.group.id),
  ]);
  const extraTabs = SCENE_LIST.filter((s) => counts[s.kind] > 0).map((s) => ({ label: s.label, seg: s.seg }));
  // Collection tabs are likewise conditional - each appears once a space has a catalogued item.
  if (pcCount > 0) extraTabs.push({ label: 'Photocards', seg: 'photocards' });
  if (colCount > 0) extraTabs.push({ label: 'Collectibles', seg: 'collectibles' });

  return (
    <div className="verse-scope mx-auto w-full max-w-6xl px-4 py-6 sm:py-8" style={presentationScopeStyle(space)}>
      <SpaceHero space={space} />
      <div className="mt-6">
        <SpaceTabs slug={slug} extra={extraTabs} />
        {children}
      </div>
    </div>
  );
}
