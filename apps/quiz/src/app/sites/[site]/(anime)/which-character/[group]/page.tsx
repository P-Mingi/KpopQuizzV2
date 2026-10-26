// Run O1 twin (rule 18) of apps/quiz/src/app/(site)/personality/[group]/page.tsx, rows 14: copied by scripts/o1/twins-codemod.mjs; kpop modules imported, not copied.
import { SITE as O1_SITE, SITE_ID as O1_SITE_ID } from '@/lib/site/registry';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { WmaAbout } from '@/components/personality/about';
import { PersonalityQuiz } from '@/components/personality/quiz';
import { UxPage } from '@/components/ux-v1/page';
import { SectionHeader } from '@/components/ux-v1/section-header';
import { WaysTile, WaysTiles } from '@/components/ux-v1/ways-tile';
import { getWmaPage } from '@/lib/personality/server';
import { whichCharacterPath } from '@/lib/personality/series';
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
// Run O1, lane PERS: on the anime build getWmaPage reads the series' own quiz (lib/personality/character-page.ts: the eight questions
// of the series, a profile text per character) and the pretty URL is /which-<series>-character-are-you (whichCharacterPath). The
// origin of the breadcrumb is the site's own (the registry), never kpopquiz.org's.
//
// ISR like the group hub: nothing is prerendered at build (no database call in
// the build), each page renders on its first hit and is cached for an hour.
export const revalidate = 3600;

async function kpopStaticParams(): Promise<Array<{ group: string }>> {
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
    `Which ${name} character are you? Personality quiz`,
    `Which ${name} character are you? Take the quiz`,
    `Which ${name} character are you?`,
  );
  const description = `Eight questions about you, no right answers, no timer. Find out which ${name} character matches how you move through life, then see how other fans came out.`;
  const url = whichCharacterPath(page.group.slug);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title: `${title} | OtakuQuiz`, description, url, type: 'website', images: [groupOgImage(page.group.slug, title)] },
  };
}

export default async function WhichMemberPage({ params }: Props): Promise<React.ReactElement> {
  if (!isUxV12()) notFound();
  const { group: slug } = await params;
  const page = await getWmaPage(slug);
  if (!page) notFound();
  const { group, view } = page;
  const hub = `/${group.slug}-quiz`;

  // "Also on <group>": real doors only (OtakuQuiz has no blind test, and the openings quiz page does not render yet).
  const also = (
    <section className="ux-sec ux-pers-also" aria-labelledby="pers-also-h">
      <SectionHeader id="pers-also-h" title={`Also on ${group.name}`} icon="users" />
      <WaysTiles columns={2}>
        <WaysTile href={hub} icon="layers" title={`${group.name} quizzes`}>
          Every {group.name} quiz, made by fans.
        </WaysTile>
        <WaysTile href="/series" icon="users" title="More series">
          Every series with fan-made quizzes.
        </WaysTile>
      </WaysTiles>
    </section>
  );

  return (
    <UxPage width="wide" className="ux-pers">
      {jsonLdScript({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Series', item: `${O1_SITE.url}/series` },
          { '@type': 'ListItem', position: 2, name: group.name, item: `${O1_SITE.url}${hub}` },
          { '@type': 'ListItem', position: 3, name: 'Which character are you' },
        ],
      })}
      <nav className="ux-crumb" aria-label="Breadcrumb">
        <Link href="/series">Series</Link>
        <span className="ux-pers-sep" aria-hidden="true">/</span>
        <Link href={hub}>{group.name}</Link>
        <span className="ux-pers-sep" aria-hidden="true">/</span>
        <span aria-current="page">Which character are you</span>
      </nav>
      <div className="ux-pers-body">
        <PersonalityQuiz view={view} also={also} />
      </div>
      {/* No "for another series" links yet: the shared block builds /which-<group>-member-are-you (docs/o1/requests/PERS.md). */}
      <WmaAbout group={group} view={view} wmaSlugs={[]} names={new Map<string, string>()} />
    </UxPage>
  );
}

// Run O1: a child of app/sites/[site] returns its params with the parent's site, and nothing on the kpop build
// (the [site] layout generates no site there and refuses params without one).
export async function generateStaticParams({ params }: { params?: { site?: string } } = {}): Promise<Array<Record<string, string>>> {
  if (O1_SITE_ID === 'kpop' || !params?.site) return [];
  return (await kpopStaticParams()).map((p) => ({ ...p, site: params.site as string }));
}
