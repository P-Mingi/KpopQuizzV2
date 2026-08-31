import { redirect } from 'next/navigation';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { TotAdminPanel } from '@/components/admin/tot-admin-panel';

import type { TotCategory, TotItem } from '@/lib/db/types';

export const metadata = { title: 'This or That Images | Admin' };

export default async function TotAdminPage(): Promise<React.ReactElement> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.id)) {
    redirect('/');
  }

  const adminDb = createServiceRoleClient();

  const [categoriesResult, itemsResult] = await Promise.all([
    adminDb
      .from('tot_categories')
      .select('*')
      .order('type')
      .order('title'),
    adminDb
      .from('tot_items')
      .select('*')
      .order('category_id')
      .order('sort_order'),
  ]);

  return (
    <div className="py-6">
      <TotAdminPanel
        categories={(categoriesResult.data ?? []) as TotCategory[]}
        items={(itemsResult.data ?? []) as TotItem[]}
      />
    </div>
  );
}
