// SEO Mission 3, part D, point 4: reading the AI assistant visit counts back, for
// /admin/ai-visibility. The counting itself is ai-visit-record.ts (middleware).

import { AI_SOURCES } from './ai-referrer';
import { isMissingRelation, serviceClientOrNull } from './store';

import type { AiSource } from './ai-referrer';
import type { Svc } from './store';

export interface AiVisitRow {
  day: string;
  source: AiSource;
  path: string;
  visits: number;
}

export interface AiVisitSummary {
  days: number;
  /** One row per day, newest first, only days with at least one visit. */
  byDay: Array<{ day: string; total: number } & Record<AiSource, number>>;
  bySource: Record<AiSource, number>;
  topPaths: Array<{ path: string; visits: number }>;
  total: number;
}

/** Aggregate stored rows for the admin view. Pure. */
export function summarizeAiVisits(rows: readonly AiVisitRow[], days: number, topN = 10): AiVisitSummary {
  const zero = (): Record<AiSource, number> => ({ chatgpt: 0, perplexity: 0, copilot: 0, gemini: 0 });
  const perDay = new Map<string, Record<AiSource, number>>();
  const bySource = zero();
  const perPath = new Map<string, number>();
  let total = 0;
  for (const r of rows) {
    if (!AI_SOURCES.includes(r.source) || !(r.visits > 0)) continue;
    const d = perDay.get(r.day) ?? zero();
    d[r.source] += r.visits;
    perDay.set(r.day, d);
    bySource[r.source] += r.visits;
    perPath.set(r.path, (perPath.get(r.path) ?? 0) + r.visits);
    total += r.visits;
  }
  const byDay = [...perDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0))
    .map(([day, s]) => ({ day, ...s, total: s.chatgpt + s.perplexity + s.copilot + s.gemini }));
  const topPaths = [...perPath.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, topN)
    .map(([path, visits]) => ({ path, visits }));
  return { days, byDay, bySource, topPaths, total };
}

/** The last `days` UTC days of counts, or a reason when they cannot be read. */
export async function readAiVisits(days = 30, svc: Svc | null = serviceClientOrNull()): Promise<{ rows: AiVisitRow[] } | { unavailable: 'not_applied' | 'no_client' | 'error' }> {
  if (!svc) return { unavailable: 'no_client' };
  const since = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
  const rows: AiVisitRow[] = [];
  try {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await svc.from('seo_ai_visits_daily').select('day, source, path, visits').gte('day', since).order('day', { ascending: false }).order('source').order('path').range(from, from + 999);
      if (error) return { unavailable: isMissingRelation(error) ? 'not_applied' : 'error' };
      const page = (data ?? []) as AiVisitRow[];
      rows.push(...page);
      if (page.length < 1000) break;
    }
    return { rows };
  } catch {
    return { unavailable: 'error' };
  }
}
