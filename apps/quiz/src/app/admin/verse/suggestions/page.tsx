import { redirect } from 'next/navigation';

import { createServerClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

import { SuggestionsQueue } from './suggestions-queue';

export const dynamic = 'force-dynamic';

export default async function VerseSuggestionsPage(): Promise<React.ReactElement> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) redirect('/');
  return <SuggestionsQueue />;
}
