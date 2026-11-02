// CR-021 (owner decision of 2026-11-02): /credits on kpopquiz.org, the pictures of idols and groups that need a credit (CC BY, CC BY-SA), filled
// from the stored rows: the thumbnail, the name, the author, the licence with its link and the source page. No credit is printed on a page or in a
// game; this page is the only place. It exists only if at least one such picture is in use: with none it is a 404 like any unknown URL, and the
// footer's Credits link (lib/credits/site-credits.ts) is gone with it, so the served HTML of every other page is the one it was. The page is
// noindex and out of the sitemap (a credits page is a legal courtesy, not a landing page). Server component; the reads are cached and fail closed.
import '@/styles/kpop/credits.css';

import { notFound } from 'next/navigation';

import { HubCreditsPage, creditSections } from '@/components/hub/credits/hub-credits';
import { getPublicPictures } from '@/lib/photos/public-read';

import type { Metadata } from 'next';

export const revalidate = 3600;

const TITLE = 'Photo credits';
const DESCRIPTION = 'Photos of idols and groups shared under a Creative Commons licence that asks for a credit, with their author, their licence and a link to the page they come from.';
const WORDS = {
  title: TITLE,
  lede: 'Some photos on KpopQuiz are shared under a Creative Commons licence that asks for a credit. Each one is listed here with its author, its licence and a link to the page it comes from.',
} as const;

async function sections(): Promise<ReturnType<typeof creditSections>> {
  const pictures = (await getPublicPictures()).filter((p) => p.kind === 'idol' || p.kind === 'group');
  return creditSections(pictures, [], {}, {});
}

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: false, follow: true },
  alternates: { canonical: '/credits' },
};

export default async function Credits(): Promise<React.ReactElement> {
  const listed = await sections();
  if (listed.length === 0) notFound();
  return <HubCreditsPage sections={listed} prefix="kpop-credits" words={WORDS} />;
}
