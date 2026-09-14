import { redirect } from 'next/navigation';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { TierListAssetQueue } from '@/components/admin/tier-list-asset-queue';

import type { PendingAsset } from '@/components/admin/tier-list-asset-queue';
import type { Metadata } from 'next';

// TIERLIST phase 3: the custom-upload review queue. Same admin rails as
// /admin/member-review (isAdmin gate, noindex, dense rows). A pending asset can be
// used on a private/unlisted list immediately but not on a public one until it is
// approved here.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Tier-list assets', robots: { index: false, follow: false } };

export default async function TierListAssetsReviewPage(): Promise<React.ReactElement> {
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user || !isAdmin(user.id)) redirect('/');

  const svc = createServiceRoleClient();
  const { data } = await svc.from('tier_list_assets')
    .select('id, name, image_url, created_at, owner_id, anon_id')
    .eq('status', 'pending').order('created_at', { ascending: false }).limit(300);

  const rows: PendingAsset[] = ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: String(r.id), name: String(r.name), imageUrl: (r.image_url as string | null) ?? null,
    created: String(r.created_at ?? ''), owner: r.owner_id ? 'user' : 'guest',
  }));

  return (
    <div style={{ padding: '20px 16px', maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px' }}>Tier-list custom images</h1>
      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '0 0 16px' }}>Fan-uploaded tier-list images, newest first. A pending image can be used on a private or unlisted list, but a public list cannot be published with it until it is approved.</p>
      <TierListAssetQueue initial={rows} />
    </div>
  );
}
