import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { PinterestAdminPanel } from '@/components/admin/pinterest/admin-panel';

export const metadata = { title: 'Pinterest Manager | Admin' };

export default async function PinterestPage(): Promise<React.ReactElement> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.id)) {
    redirect('/');
  }

  return <PinterestAdminPanel />;
}
