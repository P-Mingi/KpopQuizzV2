import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getSpace } from '@/lib/verse/space';
import { MemberDirectory } from '@/components/verse/member-directory';
import { DiscussionThread } from '@/components/verse/discussion-thread';
import { WatchButton } from '@/components/verse/watch-button';

import type { Metadata } from 'next';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) return { title: 'Community' };
  return { title: `${space.group.fandom_name} community`, description: `The ${space.group.fandom_name} community: activity, top fans and debates.`, alternates: { canonical: `https://kpopquiz.org/verse/${slug}/community` } };
}

/**
 * Community tab. Space-scoped feed + top fans + debates reuse the existing
 * community spine (activity_events, PersonCard). Until this space has scoped
 * activity, it renders an intentional invite, not fake data. Polls + projects
 * arrive with W4.
 */
export default async function CommunityPage({ params }: { params: Promise<{ slug: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) notFound();
  const { group } = space;

  return (
    <div className="space-y-6">
      <MemberDirectory groupId={group.id} fandomName={group.fandom_name} />
      <section className="rounded-xl border border-dashed p-6" style={{ borderColor: 'var(--verse-line)', background: 'var(--verse-soft)' }}>
        <h2 className="text-sm font-bold" style={{ color: 'var(--verse-ink)' }}>{group.fandom_name} activity</h2>
        <p className="mt-1 text-sm text-secondary">
          When {group.fandom_name} play, master and debate {group.name}, it shows up here. Be part of the first wave.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link href={`/${group.slug}-quiz`} className="text-sm font-bold no-underline" style={{ color: 'var(--verse-ink)' }}>Play a quiz</Link>
          <Link href="/leaderboard" className="text-sm font-bold text-secondary no-underline hover:text-primary">Community hub</Link>
        </div>
      </section>
      <p className="text-xs text-tertiary">Top fans, debate archive, polls and fan projects open as the space grows.</p>

      <div className="flex items-center justify-between gap-2 border-t pt-4" style={{ borderColor: 'var(--verse-line)' }}>
        <Link href={`/verse/${slug}/changes`} className="text-xs font-semibold text-secondary no-underline hover:text-primary">Recent changes</Link>
        <WatchButton entityType="group" entityId={String(group.id)} />
      </div>
      <DiscussionThread entityType="group" entityId={String(group.id)} />
    </div>
  );
}
