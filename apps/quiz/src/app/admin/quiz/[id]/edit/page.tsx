import { redirect, notFound } from 'next/navigation';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { QuizEditor } from './quiz-editor';

export const metadata = { title: 'Edit Quiz | Admin' };

export default async function EditQuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) redirect('/');

  const { id } = await params;
  const adminDb = createServiceRoleClient();
  const { data: quiz } = await adminDb
    .from('quizzes')
    .select('*, groups(id, name, slug)')
    .eq('id', id)
    .single();

  if (!quiz) notFound();

  return <QuizEditor quiz={quiz as Record<string, unknown>} />;
}
