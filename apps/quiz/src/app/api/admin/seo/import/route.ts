import { NextResponse } from 'next/server';

import { isAdmin } from '@/lib/admin';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { saveAiImport, validateImportPayload } from '@/lib/seo/weekly/ai-store';

// SEO Mission 3, part C: save the monthly Bing AI Performance import of /admin/seo/import.
// Admin only. The page parses the CSV files in the browser and posts the rows; they are checked
// again here, field by field. Until the pending migration (seo-weekly-data.sql) is applied the
// answer is 503 with reason table_missing, and the page keeps showing what it computed.
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Corps de requête illisible.' }, { status: 400 });
  }
  const payload = validateImportPayload(body);
  if ('error' in payload) return NextResponse.json({ ok: false, error: payload.error }, { status: 400 });

  const result = await saveAiImport(createServiceRoleClient(), payload);
  if (!result.ok) {
    if (result.reason === 'table_missing') {
      return NextResponse.json({ ok: false, reason: 'table_missing', error: 'Les tables ne sont pas encore créées (migration seo-weekly-data.sql non appliquée). Rien n\'est enregistré.' }, { status: 503 });
    }
    console.error(`[admin/seo/import] save failed: ${result.detail}`);
    return NextResponse.json({ ok: false, error: 'Enregistrement impossible, réessaie plus tard.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, month: payload.month, rows: result.rows });
}
