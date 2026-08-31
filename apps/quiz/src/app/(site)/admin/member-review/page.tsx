import { redirect } from 'next/navigation';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { idolSlug } from '@/lib/verse/slug';
import { CuratorIdolQueue } from '@/components/admin/curator-idol-queue';

import type { PendingIdol } from '@/components/admin/curator-idol-queue';
import type { Metadata } from 'next';

// V-BUILDER-3 step 4 (governance L-068): the "Idoles a valider" queue - curator-created
// members awaiting review. Sits next to /admin/space-images on the same admin rails (isAdmin
// gate, noindex, dense rows). A curator-created idol is inactive + 404s until an admin
// Approves it here; Keep hidden reviews it out of the queue without publishing or deleting.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Member review', robots: { index: false, follow: false } };

export default async function MemberReviewPage(): Promise<React.ReactElement> {
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user || !isAdmin(user.id)) redirect('/');

  const svc = createServiceRoleClient();
  const { data } = await svc.from('idols')
    .select('id, name, name_hangul, photo_url, created_at, review_reason, groups(name, slug)')
    .eq('origin', 'curator').eq('needs_review', true).eq('active', false).order('created_at', { ascending: false }).limit(300);

  const rows: PendingIdol[] = ((data ?? []) as Array<Record<string, unknown>>).map((r) => {
    const g = (r.groups ?? {}) as { name?: string; slug?: string };
    return {
      id: Number(r.id), name: String(r.name), nameHangul: (r.name_hangul as string | null) ?? null,
      photoUrl: (r.photo_url as string | null) ?? null, created: String(r.created_at ?? ''),
      space: g.name ?? '', spaceSlug: g.slug ?? '', memberSlug: idolSlug(String(r.name)),
    };
  });

  return (
    <div style={{ padding: '20px 16px', maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px' }}>Member review</h1>
      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '0 0 16px' }}>Fan-created members, newest first. They are hidden (their page 404s) until approved. Approve to publish, or Keep hidden to leave it unpublished without deleting.</p>
      <CuratorIdolQueue initial={rows} />
    </div>
  );
}
