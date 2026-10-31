import Link from 'next/link';
import { SectionHeader } from '@/components/verse/primitives/section-header';
import { notFound, redirect } from 'next/navigation';

import { getSpace } from '@/lib/verse/space';
import { requireAdmin } from '@/lib/admin/guard';
import { currentSpaceRole, roleAtLeast } from '@/lib/verse/roles';
import { PatrolQueue } from '@/components/verse/curate/patrol-queue';
import { BannedTerms } from '@/components/verse/curate/banned-terms';

import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Patrol', robots: { index: false, follow: false } };

export default async function PatrolPage({ params }: { params: Promise<{ slug: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) notFound();
  const { role } = await currentSpaceRole(space.group.id);
  if (!roleAtLeast(role, 'curator')) redirect(`/verse/${slug}`);

  // ADMIN-1: the global admin is the one requireAdmin lets through (verified, listed, aal2).
  const globalAdmin = (await requireAdmin('check')) !== null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-bold" style={{ color: 'var(--verse-ink)' }}>Patrol {space.group.fandom_name}</h1>
        <p className="text-xs text-tertiary">Reported and auto-flagged content awaiting a curator.</p>
      </div>

      <section>
        <SectionHeader kicker="Queue" as="h2" />
        <PatrolQueue groupId={space.group.id} />
      </section>

      {globalAdmin ? (
        <section>
          <SectionHeader kicker="Banned terms" as="h2" />
          <p className="mb-3 text-xs text-tertiary">Site-wide. block rejects content; flag lets it post but queues it here.</p>
          <BannedTerms />
        </section>
      ) : null}

      <Link href={`/verse/${slug}/curate`} className="inline-block text-sm font-semibold text-secondary no-underline hover:text-primary">Back to curator tools</Link>
    </div>
  );
}
