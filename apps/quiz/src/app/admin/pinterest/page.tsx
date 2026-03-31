import { redirect } from 'next/navigation';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
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
  const { data: pins } = await adminDb
    .from('pinterest_pins')
    .select('*')
    .order('sort_order', { ascending: true });

  return <PinterestDashboard pins={(pins ?? []) as PinterestPin[]} />;
}
