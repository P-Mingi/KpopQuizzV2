import { notFound } from 'next/navigation';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin/guard';
import { forSite } from '@/lib/site/scope';
import { QuizEditor } from '@/components/quiz/quiz-editor';

export const metadata = { title: 'Edit Quiz | Admin' };

export default async function EditQuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  await requireAdmin();

  const { id } = await params;
  const adminDb = createServiceRoleClient();
  // Run O1: only a quiz of the build's site (a no-op on kpop with SITE_SCOPE off).
  const { data: quiz } = await forSite(adminDb
    .from('quizzes')
    .select('*, groups(id, name, slug)'))
    .eq('id', id)
    .single();

  if (!quiz) notFound();

  return <QuizEditor quiz={quiz as Record<string, unknown>} />;
}
