import { createPublicReadClient } from '@/lib/supabase/server';

import type { PulsePayload } from './compute';

// Workstream T0: public reads of the generated monthly reports. Uses the
// anon-key public-read client so the pages stay static/ISR-cacheable; RLS
// (pulse_reports USING(true)) lets the anon role read every stored report.
// The citations are already baked into payload at generation time, so pages
// never touch pulse_citations directly.

export interface PulseReportRow {
  month: string; // 'YYYY-MM'
  payload: PulsePayload;
  updatedAt: string; // ISO
}

export const PULSE_MONTH_RE = /^\d{4}-\d{2}$/;

/** One month's report, or null when it has not been generated yet. */
export async function getPulseReport(month: string): Promise<PulseReportRow | null> {
  if (!PULSE_MONTH_RE.test(month)) return null;
  const db = createPublicReadClient();
  const { data } = await db
    .from('pulse_reports')
    .select('month, payload, updated_at')
    .eq('month', month)
    .maybeSingle();
  if (!data) return null;
  return { month: data.month as string, payload: data.payload as PulsePayload, updatedAt: data.updated_at as string };
}

/** All generated reports, newest month first. Empty on a DB blip (index still renders). */
export async function listPulseReports(): Promise<PulseReportRow[]> {
  const db = createPublicReadClient();
  const { data } = await db
    .from('pulse_reports')
    .select('month, payload, updated_at')
    .order('month', { ascending: false });
  return ((data ?? []) as Array<{ month: string; payload: PulsePayload; updated_at: string }>).map((r) => ({
    month: r.month,
    payload: r.payload,
    updatedAt: r.updated_at,
  }));
}
