import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin/guard';
import { forSite } from '@/lib/site/scope';
import { QuizSearchList } from './quiz-search-list';

export const metadata = { title: 'Edit Quizzes | Admin' };

export default async function QuizSearchPage(): Promise<React.ReactElement> {
  await requireAdmin();

  const adminDb = createServiceRoleClient();
  // Run O1: the build's site only (a no-op on kpop with SITE_SCOPE off).
  const { data: quizzes } = await forSite(adminDb
    .from('quizzes')
    .select('id, title, slug, quiz_type, difficulty, status, question_count, play_count, created_at, groups(name)'))
    .order('created_at', { ascending: false })
    .limit(100);

  return <QuizSearchList quizzes={(quizzes ?? []) as Array<Record<string, unknown>>} />;
}
