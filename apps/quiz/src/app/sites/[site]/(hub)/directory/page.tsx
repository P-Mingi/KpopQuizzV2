// Run O1 twin (rule 18) of apps/quiz/src/app/(site)/groups/page.tsx, rows H-7: copied by scripts/o1/twins-codemod.mjs; kpop modules imported, not copied.
import { notFound } from 'next/navigation';

import { DEFAULT_OG_IMAGE } from '@/lib/seo/og';
import { SITE } from '@/lib/site/registry';

import type { Metadata } from 'next';

export const revalidate = 3600;

// SEO-LAUNCH-1 (lane D, agent 1 P2): the hub holds no group directory. Its groups and quizzes live on kpopquiz.org, and the rows of this twin linked `/{slug}-quiz` addresses that answer 404 on
// this site. The page was an orphan answering 200 with a noindex: it is now a real 404, like any unknown URL. Nothing links to it. The metadata below stays (its test and the route map still
// know the path).

// The layout of the site appends its own name to the title, so the suffix must NOT be repeated
// here (it renders doubled otherwise, and check:metadata-dupes catches it).
// Run O1: the hub's own name and origin (registry), noindex and nofollow as routes.md says of /directory.
export const metadata: Metadata = {
  title: 'All groups',
  description: `Every group with quizzes on ${SITE.brand.name}, listed A to Z with its generation. Browse the full list and jump straight to a group to play.`,
  alternates: { canonical: '/directory' },
  robots: { index: false, follow: false },
  openGraph: {
    title: `All groups | ${SITE.brand.name}`,
    description: 'Browse every group with quizzes, A to Z.',
    url: `${SITE.url}/directory`,
    siteName: SITE.brand.name,
    type: 'website',
    images: [DEFAULT_OG_IMAGE],
  },
};

export default function GroupsDirectoryPage(): React.ReactElement {
  notFound();
}
