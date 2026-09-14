import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';

import { createServerClient } from '@/lib/supabase/server';
import { ANON_COOKIE, isUuid } from '@/lib/anon-claim';
import { getOwnedListBySlug, resolveItems, encodeStoredForRemix } from '@/lib/tier-list/db';
import { TierBoardView } from '@/components/tier-list/tier-board-view';

import type { Metadata } from 'next';

// The OWNER view of a private (or any owned) tier list. The public /l/[slug] page
// is static/ISR and reads cookie-free, so RLS hides a PRIVATE row even from its
// creator - which made "Save to private" look like it saved nothing. This route is
// DYNAMIC and noindex: it reads the viewer's session (and anon cookie) and renders
// the list ONLY when they own it, otherwise notFound(). It never changes the public
// page, so the crawl/ISR posture of /l/[slug] is untouched.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your tier list',
  robots: { index: false, follow: true },
};

export default async function OwnedListPage({ params }: { params: Promise<{ slug: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  const anonRaw = (await cookies()).get(ANON_COOKIE)?.value ?? null;
  const anonId = isUuid(anonRaw) ? anonRaw : null;

  const list = await getOwnedListBySlug(slug, { userId: user?.id ?? null, anonId });
  if (!list) notFound();

  const itemMap = await resolveItems(list.subjectGroupId, list.subjectKind, [list.placements]);
  const remixD = encodeStoredForRemix(list, itemMap);
  const visLabel = list.visibility === 'private'
    ? 'Private. Only you can see this page.'
    : list.visibility === 'unlisted'
      ? 'Unlisted. Anyone with the link can see it; it is not listed or indexed.'
      : 'Public.';

  return (
    <div className="tl tl-wrap">
      <div className="tl-mut" style={{ marginBottom: 10 }}>
        <Link href="/tier-list" className="tl-crumb">Tier Lists</Link>
        {' / '}<span style={{ color: 'var(--txt1)' }}>{list.title}</span>
      </div>

      <div className="tl-betw" style={{ alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div className="tl-kick">Your tier list</div>
          <h1 className="tl-d1" style={{ fontSize: 36, margin: '6px 0 6px' }}>{list.title}</h1>
          <p className="tl-mut" data-testid="owned-visibility" style={{ margin: 0 }}>{visLabel}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href={`/tier-list/new?d=${remixD}`} className="tl-btn out" data-testid="owned-edit">Edit a copy</Link>
          {list.visibility === 'public' && (
            <Link href={`/tier-list/l/${list.slug}`} className="tl-btn grad">Open public page</Link>
          )}
        </div>
      </div>

      <TierBoardView list={list} byId={itemMap} />
    </div>
  );
}
