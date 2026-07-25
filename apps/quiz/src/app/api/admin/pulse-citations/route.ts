import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

// Workstream T0: create a pulse_citations row (the owner-curated "context
// corner"). Admin-only; writes with the service-role client since the table has
// no write RLS policy. Changes only reach a report when that month is
// regenerated (citations are baked into the payload at generation time).

export interface CitationInput {
  source: string;
  claim: string;
  url: string;
  as_of_date: string; // YYYY-MM-DD
  active: boolean;
  ord: number;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Validate + normalize an incoming citation body. Returns the row or an error string. */
export function parseCitation(body: unknown): { row: CitationInput } | { error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const source = typeof b.source === 'string' ? b.source.trim() : '';
  const claim = typeof b.claim === 'string' ? b.claim.trim() : '';
  const url = typeof b.url === 'string' ? b.url.trim() : '';
  const asOf = typeof b.as_of_date === 'string' ? b.as_of_date.trim() : '';
  const active = typeof b.active === 'boolean' ? b.active : true;
  const ord = Number.isFinite(b.ord as number) ? Math.trunc(b.ord as number) : 0;

  if (!source || source.length > 40) return { error: 'source is required (<= 40 chars)' };
  if (!claim || claim.length > 500) return { error: 'claim is required (<= 500 chars)' };
  if (!/^https?:\/\//.test(url) || url.length > 300) return { error: 'url must be a valid http(s) link (<= 300 chars)' };
  if (!DATE_RE.test(asOf)) return { error: 'as_of_date must be YYYY-MM-DD' };
  if (ord < 0 || ord > 999) return { error: 'ord must be between 0 and 999' };

  return { row: { source, claim, url, as_of_date: asOf, active, ord } };
}

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = parseCitation(body);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const svc = createServiceRoleClient();
  const { data, error } = await svc.from('pulse_citations').insert(parsed.row).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, id: data.id });
}
