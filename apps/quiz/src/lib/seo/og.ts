// The og:image of a page that sets its own openGraph (owner, 2026-10-13: SEO).
//
// Next merges metadata shallowly: a page whose openGraph has no `images` drops the root
// layout's default image instead of inheriting it. 36 pages (home, /groups, /quizzes,
// /trending, the /pt pages, the v12 game pages...) were shared with no picture at all.
// Every openGraph object carries an image: the group's card where the page is about one
// group, the site card otherwise. Relative URLs resolve against the root metadataBase.

import { SITE, SITE_ID } from '@/lib/site/registry';

// The alt names the genre only on kpop (today's text); another site says what it has without it.
export const DEFAULT_OG_IMAGE = { url: SITE.brand.ogTemplate, width: 1200, height: 630, alt: SITE_ID === 'kpop' ? `${SITE.brand.name}: K-pop quizzes made by fans` : `${SITE.brand.name}: quizzes made by fans` } as const;

/** The group's share card (/api/og/group/<slug>, the image the group hub uses). */
export function groupOgImage(slug: string, alt: string): { url: string; width: number; height: number; alt: string } {
  return { url: `/api/og/group/${slug}`, width: 1200, height: 630, alt };
}
