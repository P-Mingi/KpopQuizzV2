import { notFound } from 'next/navigation';

import { CreateFunnel, type FunnelGroup } from '@/components/create/create-funnel';
import { getSpace } from '@/lib/verse/space';

import type { Metadata } from 'next';

// V-SPACE-FLOW step 4 - the in-space quiz creator: the EXISTING creation engine,
// entered from the space under Verse chrome, with the group pre-selected and
// locked BY CONSTRUCTION (the funnel only receives this one group, so no other
// can be picked). Published quizzes land in the main games catalog exactly as
// /create ones do (same engine, same API); the space's Play module shelves them
// with the "by {curator} of {space}" credit. No schema change: quizzes already
// carry group_id.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) return { title: 'Create' };
  return {
    title: { absolute: `Make a ${space.group.name} quiz · ${space.group.fandom_name} on KpopVerse` },
    robots: { index: false, follow: true },
  };
}

export default async function VerseCreatePage({ params }: { params: Promise<{ slug: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) notFound();
  const g = space.group;
  const one: FunnelGroup[] = [{
    id: g.id, name: g.name, slug: g.slug,
    display_color: g.display_color ?? '#7c5cfc', text_color: g.text_color ?? '#ffffff',
    logo_url: g.logo_url ?? null, fandom_name: g.fandom_name ?? 'fan',
  }];
  // Rendered inside the space layout (hero + tabs already above), so no extra
  // scope wrapper and no second h1.
  return (
    <div className="mt-2">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--verse-brand-text)' }}>{g.fandom_name} · space quiz</p>
      <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-primary sm:text-3xl">Make a {g.name} quiz</h2>
      <p className="mt-2 max-w-2xl leading-relaxed text-secondary" style={{ fontSize: 'var(--v-type-body)' }}>
        Built for the space, published to the whole catalog. Your name is on it, and it shelves on the {g.fandom_name} home.
      </p>
      <div className="mt-6">
        <CreateFunnel groups={one} initialGroupSlug={g.slug} />
      </div>
    </div>
  );
}
