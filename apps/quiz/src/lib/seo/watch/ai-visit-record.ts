// SEO Mission 3, part D, point 4: counting one AI assistant visit, from the middleware.
//
// recordAiVisit runs inside event.waitUntil, so the page is never slowed: one RPC
// (seo_ai_visit_hit, docs/pending-migrations/seo-watch.sql) that adds 1 to the (UTC day,
// assistant, path) counter. A plain fetch to PostgREST, no client library in the middleware
// bundle, with the service role key, because the counter must not be writable from a browser.
// Counted only on the production deployment (previews and local dev would pollute the numbers).
// Fail soft: before the migration the RPC answers 404 and nothing happens; any error is
// swallowed. Stored: day, assistant, landing path, a count. Nothing about the visitor.

import { isWatchDryRun } from './env';

import type { AiSource } from './ai-referrer';
import type { Env } from './env';

export type RecordOutcome = 'recorded' | 'dry_run' | 'skipped' | 'failed';

type PostFn = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal }) => Promise<{ ok: boolean; status: number }>;

/** Direct property reads: the middleware may run on the edge runtime. */
function middlewareEnv(): Env {
  return {
    VERCEL_ENV: process.env.VERCEL_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SEO_WATCH_DRY_RUN: process.env.SEO_WATCH_DRY_RUN,
  };
}

export async function recordAiVisit(source: AiSource, path: string, opts: { env?: Env; post?: PostFn } = {}): Promise<RecordOutcome> {
  const env = opts.env ?? middlewareEnv();
  if (isWatchDryRun(env)) {
    console.log(`[seo/ai-visits] dry run: ${source} ${path}`);
    return 'dry_run';
  }
  if (env.VERCEL_ENV !== 'production') return 'skipped';
  const base = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return 'skipped';
  const post: PostFn = opts.post ?? ((url, init) => fetch(url, init));
  try {
    const res = await post(`${base.replace(/\/$/, '')}/rest/v1/rpc/seo_ai_visit_hit`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_source: source, p_path: path }),
      signal: AbortSignal.timeout(3000),
    });
    return res.ok ? 'recorded' : 'failed';
  } catch {
    return 'failed';
  }
}
