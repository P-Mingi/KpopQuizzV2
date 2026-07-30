import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { getSpace } from '@/lib/verse/space';
import { currentSpaceRole, roleAtLeast } from '@/lib/verse/roles';
import { createServerClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { stageOf } from '@/lib/verse/stage';
import { MemberManager } from '@/components/verse/curate/member-manager';
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

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-lg font-bold" style={{ color: 'var(--verse-ink)' }}>Curate {space.group.fandom_name}</h1>
        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: 'var(--verse-soft-strong)', color: 'var(--verse-ink)' }}>{role.replace('_', ' ')}</span>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--verse-ink)' }}>Masthead</h2>
        <SpaceSettings groupId={space.group.id} initial={{ welcomeLine: space.config.welcome_line, charterText: space.config.charter_text, snsLinks: space.config.sns_links }} />
      </section>

      <section>
        <h2 className="mb-1 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--verse-ink)' }}>Members</h2>
        <p className="mb-3 text-xs text-tertiary">Curators inactive for a long time decay to contributor so the role frees up. The space owner can always re-appoint.</p>
        <MemberManager groupId={space.group.id} isSpaceAdmin={isSpaceAdmin} />
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
