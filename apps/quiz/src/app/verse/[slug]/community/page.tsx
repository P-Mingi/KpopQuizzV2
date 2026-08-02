import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getSpace } from '@/lib/verse/space';
import { MemberDirectory } from '@/components/verse/member-directory';
import { WatchButton } from '@/components/verse/watch-button';
import { NewThreadForm } from '@/components/verse/new-thread-form';
import { FeedOptInToggle } from '@/components/verse/feed-opt-in-toggle';
import { RoleBadge } from '@/components/verse/roles/role-badge';
import { listThreads } from '@/lib/verse/threads';

import type { Metadata } from 'next';

function ago(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 2592000) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toISOString().slice(0, 10);
}

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
  const threads = await listThreads(group.id);

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

      {/* V-COMM-3: the curator opt-in for the global cross-space feed (curator only). */}
      <FeedOptInToggle groupId={group.id} />

      {/* V-COMM-3: threads. Each is an addressable, shareable discussion. */}
      <section aria-label="Threads">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--verse-ink)' }}>Threads{threads.length ? ` (${threads.length})` : ''}</h2>
          <NewThreadForm groupId={group.id} groupSlug={slug} />
        </div>
        {threads.length === 0 ? (
          <p className="text-sm text-tertiary">No threads yet. Start the first {group.fandom_name} conversation.</p>
        ) : (
          <ul className="space-y-2">
            {threads.map((t) => (
              <li key={t.id}>
                <Link href={`/verse/${slug}/community/${t.slug}`} className="block rounded-xl border p-3 no-underline transition-colors hover:bg-[var(--verse-soft)]" style={{ borderColor: 'var(--verse-line)' }}>
                  <p className="font-bold leading-snug" style={{ color: 'var(--verse-ink)' }}>{t.title}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-tertiary">
                    <span>by {t.author?.displayName ?? 'a fan'}</span>
                    {t.author ? <RoleBadge role={t.author.role} /> : null}
                    <span aria-hidden>·</span>
                    <span className="tabular-nums">{t.replyCount} {t.replyCount === 1 ? 'reply' : 'replies'}</span>
                    <span aria-hidden>·</span>
                    <span className="tabular-nums">{ago(t.lastActivityAt)}</span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
