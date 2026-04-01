import { redirect, notFound } from 'next/navigation';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { getPinterestAuthStatus } from '@/lib/pinterest-api';
import { PinterestDetail } from './pinterest-detail';

import type { PinterestPin } from '../pinterest-dashboard';

export const metadata = { title: 'Edit Pin | Admin' };

export default async function PinterestPinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.id)) {
    redirect('/');
  }

  const { id } = await params;
  const adminDb = createServiceRoleClient();

  const [pinResult, boardsResult, authStatus] = await Promise.all([
    adminDb.from('pinterest_pins').select('*').eq('id', id).single(),
    adminDb.from('pinterest_boards').select('board_name, pinterest_board_id'),
    getPinterestAuthStatus(),
  ]);

  if (!pinResult.data) notFound();

  return (
    <PinterestDetail
      pin={pinResult.data as PinterestPin}
      boards={(boardsResult.data ?? []) as Array<{ board_name: string; pinterest_board_id: string }>}
      authStatus={authStatus}
    />
  );
}
