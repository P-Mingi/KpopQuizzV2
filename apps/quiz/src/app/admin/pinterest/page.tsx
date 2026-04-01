import { redirect } from 'next/navigation';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { getPinterestAuthStatus } from '@/lib/pinterest-api';
import { PinterestDashboard } from './pinterest-dashboard';

import type { PinterestPin } from './pinterest-dashboard';

export const metadata = { title: 'Pinterest Pins | Admin' };

export default async function PinterestPage(): Promise<React.ReactElement> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.id)) {
    redirect('/');
  }

  const adminDb = createServiceRoleClient();

  const [pinsResult, boardsResult, authStatus] = await Promise.all([
    adminDb
      .from('pinterest_pins')
      .select('*')
      .order('sort_order', { ascending: true }),
    adminDb
      .from('pinterest_boards')
      .select('board_name, pinterest_board_id'),
    getPinterestAuthStatus(),
  ]);

  const boards = (boardsResult.data ?? []) as Array<{ board_name: string; pinterest_board_id: string }>;

  return (
    <PinterestDashboard
      pins={(pinsResult.data ?? []) as PinterestPin[]}
      boards={boards}
      authStatus={authStatus}
    />
  );
}
