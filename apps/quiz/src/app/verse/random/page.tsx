import { redirect } from 'next/navigation';

import { randomGroupSlug } from '@/lib/verse/discovery';

// W3K.9 - /verse/random sends the visitor to a random space. Not cached, noindex.
export const dynamic = 'force-dynamic';

export const metadata = { robots: { index: false, follow: false } };

export default async function RandomVersePage(): Promise<void> {
  const slug = await randomGroupSlug();
  redirect(slug ? `/verse/${slug}` : '/verse');
}
