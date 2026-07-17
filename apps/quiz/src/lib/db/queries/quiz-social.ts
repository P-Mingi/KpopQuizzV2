import { createPublicReadClient } from '@/lib/supabase/server';

// SEO (audit v2): crawlable social-proof counts for a quiz. Two index-backed
// COUNT reads via the cookie-free client so the /q page stays static/ISR. The
// live reactions/comments UI is a client island shown post-play; this renders
// the COUNTS into the server HTML so Google sees the engagement signal.
export async function getQuizSocialCounts(
  quizId: string,
): Promise<{ comments: number; reactions: number }> {
  const db = createPublicReadClient();
  const [commentsRes, reactionsRes] = await Promise.all([
    db.from('quiz_comments').select('id', { count: 'exact', head: true }).eq('quiz_id', quizId),
    db.from('quiz_reactions').select('id', { count: 'exact', head: true }).eq('quiz_id', quizId),
  ]);
  return {
    comments: commentsRes.count ?? 0,
    reactions: reactionsRes.count ?? 0,
  };
}
