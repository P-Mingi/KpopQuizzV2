import { afterQuizPublished } from './after-publish';
import { runQuizPublisher } from './pipeline';
import { quizLaneLive, supabaseQuizStore } from './store';

import type { QuizPublished, QuizStore } from './pipeline';

// Run O1, lot E1b: the quiz lane of the cron /api/cron/editorial-publish. The route calls this only when editorialQuizOn(), after
// its own gates and after the regular publisher ran. At most one quiz a run, under the caps of rules.ts. A quiz published here
// goes through the hooks of a normal quiz creation (after-publish.ts) before the route answers.
//
// Never throws: a failure of the quiz lane must not turn the answer of the regular publisher into an error, nor the other way.

export interface QuizLaneAnswer {
  published: { id: number; ref: string; slug: string } | null;
  reason: string;
  skipped: number;
  error?: string;
}

export interface QuizLaneDeps {
  now: number;
  isAdmin: (id: string) => boolean;
  runId: string;
  store?: QuizStore;
  live?: () => Promise<boolean>;
  after?: (p: QuizPublished) => Promise<void>;
}

export async function publishQuizLane(d: QuizLaneDeps): Promise<QuizLaneAnswer> {
  try {
    if (!(await (d.live ?? quizLaneLive)())) return { published: null, reason: 'quiz_not_live', skipped: 0 };
    const run = await runQuizPublisher(d.store ?? supabaseQuizStore(), { now: d.now, isAdmin: d.isAdmin, runId: d.runId });
    if (run.published) await (d.after ?? afterQuizPublished)(run.published);
    return {
      published: run.published ? { id: run.published.id, ref: run.published.ref, slug: run.published.slug } : null,
      reason: run.reason,
      skipped: run.skipped.length,
    };
  } catch (err) {
    console.error('[cron/editorial-publish] quiz lane failed:', err instanceof Error ? err.message : err);
    return { published: null, reason: 'quiz_failed', skipped: 0, error: 'quiz_publish_failed' };
  }
}
