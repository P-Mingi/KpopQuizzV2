import Link from 'next/link';
import { notFound } from 'next/navigation';

import { WmaAbout } from '@/components/personality/about';
import { PersonalityQuiz } from '@/components/personality/quiz';
import { UxPage } from '@/components/ux-v1/page';
import { SectionHeader } from '@/components/ux-v1/section-header';
import { WaysTile, WaysTiles } from '@/components/ux-v1/ways-tile';
import { getAllGroups } from '@/lib/db/queries/groups';
import { getWmaGroupSlugs } from '@/lib/personality/data';
import { metaDescription } from '@/lib/personality/page-copy';
import { getWmaPage, SITE } from '@/lib/personality/server';
import { settle } from '@/lib/ux-v1/p6/hub-data';
import { whichMemberPath } from '@/lib/personality/view';
import { isUxV12 } from '@/lib/ux-v12';
import { jsonLdScript } from '@/lib/verse/jsonld';
import { groupOgImage } from '@/lib/seo/og';
import { fitTitle } from '@/lib/seo/title-fit';

import type { Metadata } from 'next';

// V12 G5 (SYSTEM.md 5.2): Which member are you, one page per group that has a
// profile set in personality_profiles. This is the internal route. Visitors and
// crawlers only ever see the pretty URL /which-<group>-member-are-you, which
// next.config.ts rewrites here when the v12 flag is on at build (the canonical
// points at the pretty URL). A direct hit on /personality/<group> keeps today's
// REFONTE 301 to the group hub, so there is one indexable URL per page.
//
// Flag off: the redirects of next.config.ts answer before this file is reached,
// exactly as today; if it were reached anyway it answers 404.
//
// ISR like the group hub: nothing is prerendered at build (no database call in
// the build), each page renders on its first hit and is cached for an hour.
export const revalidate = 3600;

export async function generateStaticParams(): Promise<Array<{ group: string }>> {
  return [];
}

interface Props { params: Promise<{ group: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!isUxV12()) return {};
  const { group: slug } = await params;
  const page = await getWmaPage(slug);
  // Resolved before the body streams, so an unknown group is a true 404 (same
  // reason as the trivia gate in app/(site)/[slug]/page.tsx).
  if (!page) notFound();
  const name = page.group.name;
  // SEO (owner, 2026-10-14): within 60 characters with the suffix (lib/seo/title-fit.ts).
  const title = fitTitle(
    `Which ${name} member are you? Personality quiz`,
    `Which ${name} member are you? Take the quiz`,
    `Which ${name} member are you?`,
  );
  // SEO Mission 2, part D: the primary phrase once, 120 to 160 characters (page-copy.test.ts).
  const description = metaDescription(name, page.view.questions.length);
  const url = whichMemberPath(page.group.slug);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title: `${title} | KpopQuiz`, description, url, type: 'website', images: [groupOgImage(page.group.slug, title)] },
  };
}

export default async function WhichMemberPage({ params }: Props): Promise<React.ReactElement> {
  if (!isUxV12()) notFound();
  const { group: slug } = await params;
  const page = await getWmaPage(slug);
  if (!page) notFound();
  const { group, view, blindtestSongs, roster, common, trivia } = page;
  const hub = `/${group.slug}-quiz`;
  // The cross-links below the quiz: settled reads, so a blip drops a link, never the page.
  const [wma, groups] = await Promise.all([getWmaGroupSlugs(), settle(() => getAllGroups(), null)]);
  const names = new Map((groups.value ?? []).map((g) => [g.slug, g.name] as const));

  // "Also on <group>": real doors only, and the grid only with two of them.
  const also = blindtestSongs !== null ? (
    <section className="ux-sec ux-pers-also" aria-labelledby="pers-also-h">
      <SectionHeader id="pers-also-h" title={`Also on ${group.name}`} icon="users" />
      <WaysTiles columns={2}>
        <WaysTile href={`/blindtest/group-${group.slug}`} icon="music" title={`${group.name} blindtest`}>
          {blindtestSongs} songs, ten-second clips.
        </WaysTile>
        <WaysTile href={hub} icon="layers" title={`${group.name} quizzes`}>
          Every {group.name} quiz, made by fans.
        </WaysTile>
      </WaysTiles>
    </section>
  ) : null;

  return (
    <UxPage width="wide" className="ux-pers">
      {jsonLdScript({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Groups', item: `${SITE}/groups` },
          { '@type': 'ListItem', position: 2, name: group.name, item: `${SITE}${hub}` },
          { '@type': 'ListItem', position: 3, name: 'Which member are you' },
        ],
      })}
      {/* The group and its members as the sourced line-up names them (rosters.ts): the
          same names and links as the visible members section, Wikidata IDs fetched by
          script. Absent when the line-up is. */}
      {roster ? jsonLdScript({
        '@context': 'https://schema.org',
        '@type': 'MusicGroup',
        name: group.name,
        url: `${SITE}${hub}`,
        sameAs: [roster.wikidataUrl, roster.wikipediaUrl.replace(/#.*$/, ''), ...(roster.official ? [roster.official] : [])],
        member: roster.members.map((m) => ({ '@type': 'Person', name: m.name, sameAs: `https://www.wikidata.org/wiki/${m.wikidata}` })),
      }) : null}
      <nav className="ux-crumb" aria-label="Breadcrumb">
        <Link href="/groups">Groups</Link>
        <span className="ux-pers-sep" aria-hidden="true">/</span>
        <Link href={hub}>{group.name}</Link>
        <span className="ux-pers-sep" aria-hidden="true">/</span>
        <span aria-current="page">Which member are you</span>
      </nav>
      <div className="ux-pers-body">
        <PersonalityQuiz view={view} also={also} />
      </div>
      <WmaAbout group={group} view={view} wmaSlugs={wma} names={names} roster={roster} common={common} blindtestSongs={blindtestSongs} trivia={trivia} />
    </UxPage>
  );
}
