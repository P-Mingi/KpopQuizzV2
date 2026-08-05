import { redirect } from 'next/navigation';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { SpaceImageQueue } from '@/components/admin/space-image-queue';

import type { QueueImage } from '@/components/admin/space-image-queue';
import type { Metadata } from 'next';

// V-BUILDER-3 step 3 (L-047): the block-image moderation queue. Admin-only, noindex, dynamic.
// Reads every ingested block image (service role, so hidden ones are visible for review) and
// renders the plain dense queue. Actions ride /api/verse/space-image.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Image moderation', robots: { index: false, follow: false } };

const BUCKET = 'verse-space-assets';

export default async function SpaceImagesAdminPage(): Promise<React.ReactElement> {
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user || !isAdmin(user.id)) redirect('/');

  const svc = createServiceRoleClient();
  const { data } = await svc.from('verse_space_assets')
    .select('id, space_id, storage_path, status, source, source_url, uploaded_by, created_at, mime, bytes, groups(name, slug)')
    .eq('kind', 'image').neq('status', 'removed').order('created_at', { ascending: false }).limit(300);

  const rows: QueueImage[] = ((data ?? []) as Array<Record<string, unknown>>).map((r) => {
    const g = (r.groups ?? {}) as { name?: string; slug?: string };
    return {
      id: Number(r.id),
      url: svc.storage.from(BUCKET).getPublicUrl(String(r.storage_path)).data.publicUrl,
      space: g.name ?? `#${r.space_id}`, spaceSlug: g.slug ?? '',
      uploader: String(r.uploaded_by ?? ''),
      status: (r.status as QueueImage['status']) ?? 'active',
      source: (r.source as string | null) ?? null, sourceUrl: (r.source_url as string | null) ?? null,
      created: String(r.created_at ?? ''), mime: (r.mime as string | null) ?? null, bytes: (r.bytes as number | null) ?? null,
    };
  });

  return (
    <div style={{ padding: '20px 16px', maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px' }}>Image moderation</h1>
      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '0 0 16px' }}>Every fan-uploaded block image, newest first. Post-hoc review: hide or remove anything that should not be here.</p>
      <SpaceImageQueue initial={rows} />
    </div>
  );
}
