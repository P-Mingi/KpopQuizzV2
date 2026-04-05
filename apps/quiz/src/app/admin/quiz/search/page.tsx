import { redirect } from 'next/navigation';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { QuizSearchList } from './quiz-search-list';

export const metadata = { title: 'Edit Quizzes | Admin' };

export default async function QuizSearchPage(): Promise<React.ReactElement> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) redirect('/');

  const adminDb = createServiceRoleClient();
  const { data: quizzes } = await adminDb
    .from('quizzes')
    .select('id, title, slug, quiz_type, difficulty, status, question_count, play_count, created_at, groups(name)')
    .order('created_at', { ascending: false })
    .limit(100);

  return <QuizSearchList quizzes={(quizzes ?? []) as Array<Record<string, unknown>>} />;
}
