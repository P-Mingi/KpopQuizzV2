import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { PinterestAdminPanel } from '@/components/admin/pinterest/admin-panel';
import { PinterestCardsV2 } from '@/components/admin/pinterest/PinterestCardsV2';

export const metadata = { title: 'Pinterest Manager | Admin' };

export default async function PinterestPage(): Promise<React.ReactElement> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.id)) {
    redirect('/');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
      <PinterestCardsV2 />
      <div style={{ borderTop: '1px solid #e8e6e0', paddingTop: 32 }}>
        <PinterestAdminPanel />
      </div>
    </div>
  );
}
