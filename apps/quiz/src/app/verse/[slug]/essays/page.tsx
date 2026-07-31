import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getSpace } from '@/lib/verse/space';
import { getFeaturedEssays } from '@/lib/verse/essays';
import { EssaysClient } from '@/components/verse/essays-client';

import type { Metadata } from 'next';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) return { title: 'Essays' };
  return { title: `${space.group.name} fan essays`, description: `Featured member essays about ${space.group.name}, curated by the space.`, alternates: { canonical: `https://kpopquiz.org/verse/${slug}/essays` } };
}

export default async function EssaysPage({ params }: { params: Promise<{ slug: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) notFound();
  const featured = await getFeaturedEssays(space.group.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold" style={{ color: 'var(--verse-ink)' }}>{space.group.fandom_name} essays</h1>
        <p className="text-xs text-tertiary">Long-form fan writing, reviewed and featured by curators.</p>
      </div>

      {featured.length === 0 ? (
        <p className="rounded-xl border border-dashed px-5 py-8 text-center text-secondary" style={{ borderColor: 'var(--verse-line)' }}>No featured essays yet. Members write them; curators feature the best.</p>
      ) : (
        <ul className="space-y-2">
          {featured.map((e) => (
            <li key={e.id}>
              <Link href={`/verse/${slug}/essays/${e.id}`} className="block rounded-xl border p-4 no-underline" style={{ borderColor: 'var(--verse-line)', background: 'var(--verse-soft)' }}>
                <p className="text-base font-bold" style={{ color: 'var(--verse-ink)' }}>{e.title}</p>
                <p className="mt-0.5 text-xs text-tertiary">by {e.author?.displayName || e.author?.username || 'a fan'}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <EssaysClient groupId={space.group.id} groupSlug={slug} />
    </div>
  );
}
