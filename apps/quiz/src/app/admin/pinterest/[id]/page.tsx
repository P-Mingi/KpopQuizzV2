import { redirect, notFound } from 'next/navigation';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
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

  const { data: pin } = await adminDb
    .from('pinterest_pins')
    .select('*')
    .eq('id', id)
    .single();

  if (!pin) notFound();

  return <PinterestDetail pin={pin as PinterestPin} />;
}
