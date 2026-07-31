import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { getSpace } from '@/lib/verse/space';
import { currentSpaceRole, roleAtLeast } from '@/lib/verse/roles';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { stageOf } from '@/lib/verse/stage';
import { MemberManager } from '@/components/verse/curate/member-manager';
import { PagesReviewQueue } from '@/components/verse/curate/pages-review-queue';
import { SYSTEM_AUTHOR_DISPLAY } from '@/lib/verse/pages/data';
import { SpaceSettings } from '@/components/verse/curate/space-settings';
import { StageControl } from '@/components/verse/curate/stage-control';

import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Curate space', robots: { index: false, follow: false } };

export default async function CuratePage({ params }: { params: Promise<{ slug: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) notFound();

  const { role } = await currentSpaceRole(space.group.id);
  if (!roleAtLeast(role, 'curator')) redirect(`/verse/${slug}`);
  const isSpaceAdmin = role === 'space_admin';
  const { data: { user } } = await (await createServerClient()).auth.getUser();
  const globalAdmin = !!user && isAdmin(user.id);
  const stage = globalAdmin ? await stageOf(space.group.id) : 'A';

  // V-PAGES step 5 - pages awaiting review (service read: review status is
  // invisible to the public client by RLS).
  const svc = createServiceRoleClient();
  const { data: reviewRows } = await svc.from('verse_pages')
    .select('id, slug, title, kind, created_by').eq('group_id', space.group.id).eq('status', 'review').order('updated_at');
  const review = (reviewRows ?? []) as { id: number; slug: string; title: string; kind: string; created_by: string }[];
  const authorIds = [...new Set(review.map((r) => r.created_by))];
  const { data: profs } = authorIds.length
    ? await svc.from('profiles').select('id, username, display_name').in('id', authorIds)
    : { data: [] };
  const nameById = new Map(((profs ?? []) as { id: string; username: string; display_name: string | null }[])
    .map((p) => [p.id, p.display_name ?? p.username]));
  const reviewItems = review.map((r) => ({
    ...r,
    created_by_name: SYSTEM_AUTHOR_DISPLAY[r.created_by] ?? nameById.get(r.created_by) ?? 'a fan',
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-lg font-bold" style={{ color: 'var(--verse-ink)' }}>Curate {space.group.fandom_name}</h1>
        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: 'var(--verse-soft-strong)', color: 'var(--verse-ink)' }}>{role.replace('_', ' ')}</span>
      </div>

      <PagesReviewQueue groupSlug={slug} items={reviewItems} />

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--verse-ink)' }}>Masthead</h2>
        <SpaceSettings groupId={space.group.id} initial={{ welcomeLine: space.config.welcome_line, charterText: space.config.charter_text, snsLinks: space.config.sns_links }} />
      </section>

      <section>
        <h2 className="mb-1 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--verse-ink)' }}>Members</h2>
        <p className="mb-3 text-xs text-tertiary">Curators inactive for a long time decay to contributor so the role frees up. The space owner can always re-appoint.</p>
        <MemberManager groupId={space.group.id} groupSlug={space.group.slug} isSpaceAdmin={isSpaceAdmin} />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--verse-ink)' }}>Tools</h2>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href={`/verse/${slug}/studio`} className="rounded-lg px-3 py-2 font-bold no-underline" style={{ background: 'var(--verse-accent)', color: 'var(--verse-accent-text)' }}>Customize (Studio)</Link>
          <Link href={`/verse/${slug}/insights`} className="rounded-lg border border-default px-3 py-2 no-underline hover:bg-surface-1">Space insights</Link>
          <Link href={`/verse/${slug}/patrol`} className="rounded-lg border border-default px-3 py-2 no-underline hover:bg-surface-1">Patrol queue</Link>
          <Link href="/admin/verse/suggestions" className="rounded-lg border border-default px-3 py-2 no-underline hover:bg-surface-1">Review suggestions</Link>
          <Link href="/admin/verse/entities" className="rounded-lg border border-default px-3 py-2 no-underline hover:bg-surface-1">Tours / shows / OST / awards</Link>
          <Link href={`/verse/${slug}/changes`} className="rounded-lg border border-default px-3 py-2 no-underline hover:bg-surface-1">Recent changes</Link>
          <Link href={`/verse/${slug}`} className="rounded-lg border border-default px-3 py-2 no-underline hover:bg-surface-1">Edit pages (lock, protect)</Link>
        </div>
        <p className="mt-2 text-xs text-tertiary">Page protection (lock/unlock) lives on each section's controls while editing.</p>
      </section>

      {globalAdmin ? (
        <section>
          <h2 className="mb-1 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--verse-ink)' }}>Collaboration stage</h2>
          <p className="mb-3 text-xs text-tertiary">Owner control. Flipping to B/C opens member editing. Defaults to A (off).</p>
          <StageControl groupId={space.group.id} initial={stage} />
        </section>
      ) : null}
    </div>
  );
}
