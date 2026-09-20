import { unstable_cache } from 'next/cache';

import { createPublicReadClient } from '@/lib/supabase/server';
import { CACHE_TTL } from '@/lib/db/cache-policy';

// SEO (audit v2): crawlable social-proof counts for a quiz. Two index-backed
// COUNT reads via the cookie-free client so the /q page stays static/ISR. The
// live reactions/comments UI is a client island shown post-play; this renders
// the COUNTS into the server HTML so Google sees the engagement signal.
//
// FREE-VIABILITY: these are the /rest/v1/quiz_comments (2,891) and
// /rest/v1/quiz_reactions (2,888) per-render head counts in the baseline. Cached
// at the stats TTL (1h); the live island shows the exact count post-play.
export const getQuizSocialCounts = unstable_cache(
  async (quizId: string): Promise<{ comments: number; reactions: number }> => {
    const db = createPublicReadClient();
    const [commentsRes, reactionsRes] = await Promise.all([
      db.from('quiz_comments').select('id', { count: 'exact', head: true }).eq('quiz_id', quizId),
      db.from('quiz_reactions').select('id', { count: 'exact', head: true }).eq('quiz_id', quizId),
    ]);
    return {
      comments: commentsRes.count ?? 0,
      reactions: reactionsRes.count ?? 0,
    };
  },
  ['db:quiz-social:getQuizSocialCounts:v1'],
  { revalidate: CACHE_TTL.stats, tags: ['social'] },
);
