import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin/guard';
import { forSite } from '@/lib/site/scope';
import { QuizBankDashboard } from './quiz-bank-dashboard';

import type { QuizBankEntry } from '@/lib/quiz-bank-scheduling';

export const metadata = { title: 'Quiz Bank | Admin' };

export default async function QuizBankPage(): Promise<React.ReactElement> {
  await requireAdmin();

  const adminDb = createServiceRoleClient();

  const [{ data: entries }, { data: groups }] = await Promise.all([
    forSite(adminDb
      .from('quiz_bank')
      .select('*'))
      .order('scheduled_date', { ascending: true, nullsFirst: false }),
    forSite(adminDb
      .from('groups')
      .select('id, name, slug'))
      .order('name'),
  ]);

  return (
    <QuizBankDashboard
      entries={(entries ?? []) as QuizBankEntry[]}
      groups={(groups ?? []) as { id: number; name: string; slug: string }[]}
    />
  );
}
