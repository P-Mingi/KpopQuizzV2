import { COMMUNITY_FEATURES_ENABLED } from '@/lib/features';
import { onQuizChanged } from '@/lib/seo/quiz-freshness';
import { createServiceRoleClient } from '@/lib/supabase/server';

import type { QuizPublished } from './pipeline';

// Run O1, lot E1b: what a quiz creation does once the quiz exists (app/api/quiz/create/route.ts), for a quiz the cron published.
//   - onQuizChanged('published', ...): the cached lists and the group counts expire now, the quiz page, its hub, /new, the home
//     page and the sitemap are rebuilt on their next request, and IndexNow hears of the three URLs once the response is sent
//     (lib/seo/quiz-freshness.ts). This is what puts the quiz on its page, on the group page and in the sitemap.
//   - the followers of the Team account get the "posted a new quiz" notification (fanout_followed_new_quiz, the create route's
//     call), unless the community features are switched off.
// The group alerts (group_quiz_alerts) are delivered by the database trigger on the insert itself.
// Not done, on purpose: no XP for the Team account (a Team account is not a fan: no level, no streak, no badge) and no image
// moderation report (a quiz without an image has none).
// Never throws and never blocks a publish: the quiz is already live when this runs.

export interface AfterPublishDeps {
  onChanged: typeof onQuizChanged;
  fanout: (p: QuizPublished) => Promise<void>;
}

async function fanoutFollowers(p: QuizPublished): Promise<void> {
  if (!COMMUNITY_FEATURES_ENABLED) return;
  const { error } = await createServiceRoleClient().rpc('fanout_followed_new_quiz', {
    p_creator_id: p.account_id, p_quiz_id: p.quiz_id, p_quiz_title: p.title, p_quiz_slug: p.slug,
  });
  if (error) throw new Error(error.message);
}

export async function afterQuizPublished(p: QuizPublished, deps: AfterPublishDeps = { onChanged: onQuizChanged, fanout: fanoutFollowers }): Promise<void> {
  try {
    deps.onChanged('published', p.slug, [p.group_slug]);
  } catch (err) {
    console.error('[editorial] quiz hooks failed:', err instanceof Error ? err.message : err);
  }
  try {
    await deps.fanout(p);
  } catch (err) {
    console.error('[editorial] followed_new_quiz fan-out failed:', err instanceof Error ? err.message : err);
  }
}
