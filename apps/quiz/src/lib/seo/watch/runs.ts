// The monitoring run log (seo_watch_runs, docs/pending-migrations/seo-watch.sql): one row per
// run that found something, read by /admin/ai-visibility and available to the Monday e-mail.
// Fail soft: before the migration, or on any error, nothing is logged and nothing throws.

import { isMissingRelation, serviceClientOrNull } from './store';

import type { Svc } from './store';

export type WatchKind = 'linked_urls' | 'sources' | 'spikes';

export interface WatchRun {
  kind: WatchKind;
  ok: boolean;
  summary: string;
  detail?: Record<string, unknown>;
}

export interface WatchRunRow extends Required<WatchRun> {
  ran_at: string;
}

const KEEP_DAYS = 180;

export async function logWatchRun(run: WatchRun, svc: Svc | null = serviceClientOrNull()): Promise<'logged' | 'not_applied' | 'skipped' | 'failed'> {
  if (!svc) return 'skipped';
  try {
    const { error } = await svc.from('seo_watch_runs').insert({
      kind: run.kind,
      ok: run.ok,
      summary: run.summary.slice(0, 500) || '-',
      detail: run.detail ?? {},
    });
    if (error) return isMissingRelation(error) ? 'not_applied' : 'failed';
    const cutoff = new Date(Date.now() - KEEP_DAYS * 86400000).toISOString();
    await svc.from('seo_watch_runs').delete().lt('ran_at', cutoff);
    return 'logged';
  } catch {
    return 'failed';
  }
}

/** The latest run of each kind, or null when the table cannot be read. */
export async function readLastRuns(svc: Svc | null = serviceClientOrNull()): Promise<Partial<Record<WatchKind, WatchRunRow>> | null> {
  if (!svc) return null;
  try {
    const { data, error } = await svc.from('seo_watch_runs').select('ran_at, kind, ok, summary, detail').order('ran_at', { ascending: false }).limit(60);
    if (error) return null;
    const out: Partial<Record<WatchKind, WatchRunRow>> = {};
    for (const r of (data ?? []) as WatchRunRow[]) if (!out[r.kind]) out[r.kind] = r;
    return out;
  } catch {
    return null;
  }
}
