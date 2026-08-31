import { redirect } from 'next/navigation';

import { createServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { QuizBankDashboard } from './quiz-bank-dashboard';

import type { QuizBankEntry } from '@/lib/quiz-bank-scheduling';

export const metadata = { title: 'Quiz Bank | Admin' };

export default async function QuizBankPage(): Promise<React.ReactElement> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.id)) {
    redirect('/');
  }

  const adminDb = createServiceRoleClient();

  const [{ data: entries }, { data: groups }] = await Promise.all([
    adminDb
      .from('quiz_bank')
      .select('*')
      .order('scheduled_date', { ascending: true, nullsFirst: false }),
    adminDb
      .from('groups')
      .select('id, name, slug')
      .order('name'),
  ]);

  return (
    <QuizBankDashboard
      entries={(entries ?? []) as QuizBankEntry[]}
      groups={(groups ?? []) as { id: number; name: string; slug: string }[]}
    />
  );
}
