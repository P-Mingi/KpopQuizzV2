import { redirect, notFound } from 'next/navigation';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { QuizEditor } from '@/components/quiz/quiz-editor';

import type { Metadata } from 'next';

// Owner-facing quiz editor. The "Edit quiz" button on a quiz used to point at
// /admin/quiz/[id]/edit, which hard-redirects every non-admin to / - so owners
// could never fix their own published quizzes. This route reuses the same
// editor in owner mode (owner-scoped PUT, no status control) and is gated to the
// creator (or an admin).
export const metadata: Metadata = {
  title: 'Edit your quiz | KpopQuiz',
  robots: { index: false, follow: false },
};

export default async function OwnerEditQuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { id } = await params;

  if (!user) redirect(`/login?returnTo=/quiz/${id}/edit`);

  const adminDb = createServiceRoleClient();
  const { data: quiz } = await adminDb
    .from('quizzes')
    .select('*, groups(id, name, slug)')
    .eq('id', id)
    .single();

  // 404 (not 403) for non-owners so we do not leak the existence of drafts.
  if (!quiz) notFound();
  if (quiz.creator_id !== user.id && !isAdmin(user.id)) notFound();
  if (quiz.status === 'removed') notFound();

  return <QuizEditor quiz={quiz as Record<string, unknown>} mode="owner" />;
}
