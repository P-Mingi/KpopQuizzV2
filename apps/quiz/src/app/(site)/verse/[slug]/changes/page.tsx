import Link from 'next/link';
import { Byline } from '@/components/verse/primitives/byline';
import { EmptyState } from '@/components/verse/primitives/empty-state';
import { notFound } from 'next/navigation';

import { getSpace } from '@/lib/verse/space';
import { getRecentChanges } from '@/lib/verse/recent-changes';

import type { Metadata } from 'next';

export const revalidate = 600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) return { title: 'Recent changes' };
  return { title: `Recent changes - ${space.group.name}`, description: `Recent edits to the ${space.group.name} space.`, alternates: { canonical: `https://kpopquiz.org/verse/${slug}/changes` }, robots: { index: false, follow: true } };
}

function ago(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default async function ChangesPage({ params }: { params: Promise<{ slug: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) notFound();
  const changes = await getRecentChanges(space.group.id);

  return (
    <div>
      <h1 className="mb-1 text-lg font-bold" style={{ color: 'var(--verse-ink)' }}>Recent changes</h1>
      <p className="mb-4 text-xs text-tertiary">Every edit to the {space.group.fandom_name} space, newest first.</p>
      {changes.length === 0 ? (
        <EmptyState headline="No edits yet." body="Be the first to write something." />
      ) : (
        <ol className="space-y-1.5">
          {changes.map((c) => (
            <li key={c.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--verse-soft)' }}>
              <span className="text-xs text-tertiary tabular-nums">{ago(c.createdAt)}</span>
              <Link href={c.entityUrl} className="font-semibold no-underline" style={{ color: 'var(--verse-ink)' }}>{c.entityLabel}</Link>
              <span className="text-xs text-tertiary">{c.section.replace('_', ' ')}</span>
              <span className="text-secondary">{c.summary}</span>
              <span className="ml-auto text-xs text-tertiary"><Byline identity={c.author} prefix="by" /></span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
