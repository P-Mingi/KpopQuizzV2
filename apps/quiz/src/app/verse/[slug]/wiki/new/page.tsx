import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { getSpace } from '@/lib/verse/space';
import { currentSpaceRole, roleAtLeast } from '@/lib/verse/roles';
import { isAdmin } from '@/lib/admin';
import { kindsForSpace } from '@/lib/verse/pages/kinds';
import { KPOP_PAGE_REGISTRY } from '@/lib/verse/pages/kpop-kinds';
import { NewPageForm } from '@/components/verse/pages/new-page-form';

import type { Metadata } from 'next';

// V-PAGES step 5 - "New page" (contributor+). Not indexable; visitors get an
// honest explanation of how to earn the role, never a dead form.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'New page', robots: { index: false, follow: false } };

export default async function NewWikiPage({ params }: { params: Promise<{ slug: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) notFound();
  const { userId, role } = await currentSpaceRole(space.group.id);
  const allowed = (userId && isAdmin(userId)) || roleAtLeast(role, 'contributor');
  const kinds = kindsForSpace(KPOP_PAGE_REGISTRY, space.presentation.enabledKinds ?? null);

  return (
    <div>
      <div className="mb-6">
        <Breadcrumbs items={[{ label: 'Verse', href: '/verse' }, { label: space.group.fandom_name, href: `/verse/${space.group.slug}` }, { label: 'Atlas', href: `/verse/${space.group.slug}/wiki` }, { label: 'New page' }]} />
      </div>
      <header className="v-module">
        <p className="v-eyebrow" style={{ marginBottom: '0.5rem' }}>New page</p>
        <h1 className="font-extrabold leading-tight" style={{ fontSize: 'var(--v-type-title)', letterSpacing: 'var(--v-tracking-tight)', color: 'var(--verse-ink)' }}>
          Add to the {space.group.fandom_name} wiki
        </h1>
      </header>

      {allowed ? (
        <Suspense>
          <NewPageForm groupId={space.group.id} groupSlug={space.group.slug} kinds={kinds} />
        </Suspense>
      ) : (
        <div style={{ maxWidth: '46rem' }}>
          <p className="text-base leading-relaxed text-secondary">
            Creating pages needs the contributor role. {userId ? 'Join this space and contribute (edits, suggestions) to earn it; a curator can also grant it directly.' : 'Sign in, join the space, and contribute to earn it.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {!userId ? (
              <Link href={`/login?returnTo=${encodeURIComponent(`/verse/${space.group.slug}/wiki/new`)}`} className="inline-flex min-h-[44px] items-center rounded-xl px-5 text-sm font-bold no-underline" style={{ background: 'var(--verse-cta, #7c5cfc)', color: 'var(--verse-cta-text, #fff)' }}>Sign in</Link>
            ) : null}
            <Link href={`/verse/${space.group.slug}`} className="inline-flex min-h-[44px] items-center rounded-xl border px-5 text-sm font-bold no-underline" style={{ borderColor: 'var(--verse-line)', color: 'var(--text-primary)' }}>Back to the space</Link>
          </div>
        </div>
      )}
    </div>
  );
}
