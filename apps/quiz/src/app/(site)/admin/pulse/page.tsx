import { redirect } from 'next/navigation';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

import { PulseAdmin } from './pulse-admin';

export const dynamic = 'force-dynamic';

export interface CitationRow {
  id: number;
  source: string;
  claim: string;
  url: string;
  as_of_date: string;
  active: boolean;
  ord: number;
}

export interface ReportRow {
  month: string;
  updated_at: string;
  fandom: string | null;
  plays: number;
}

function currentUtcMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export default async function PulseAdminPage(): Promise<React.ReactElement> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) redirect('/');

  const svc = createServiceRoleClient();
  // Admin sees ALL citations (including inactive), which the public RLS hides.
  const [{ data: citeRows }, { data: reportRows }] = await Promise.all([
    svc.from('pulse_citations').select('id, source, claim, url, as_of_date, active, ord').order('ord').order('id'),
    svc.from('pulse_reports').select('month, updated_at, payload').order('month', { ascending: false }),
  ]);

  const citations = (citeRows ?? []) as CitationRow[];
  const reports: ReportRow[] = ((reportRows ?? []) as Array<{ month: string; updated_at: string; payload: { fandom: { name: string } | null; community: { plays: number } } }>).map((r) => ({
    month: r.month,
    updated_at: r.updated_at,
    fandom: r.payload?.fandom?.name ?? null,
    plays: r.payload?.community?.plays ?? 0,
  }));

  return <PulseAdmin citations={citations} reports={reports} currentMonth={currentUtcMonth()} />;
}
