import { redirect, notFound } from 'next/navigation';

import { getGroupBySlug } from '@/lib/db/queries/groups';

interface GroupPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Legacy route. All known groups are 301-redirected via next.config.ts.
 * This catches any stragglers and redirects them to the new /{slug}-quiz URL.
 */
export default async function GroupPage({ params }: GroupPageProps): Promise<never> {
  const { slug } = await params;
  const group = await getGroupBySlug(slug);

  if (!group) notFound();

  redirect(`/${group.slug}-quiz`);
}
