import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://kpopquiz.org';

function getScheduledDate(index: number, perDay: number): string {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() + 1);
  now.setUTCHours(8, 0, 0, 0);
  const dayOffset = Math.floor(index / perDay);
  const slotInDay = index % perDay;
  const hourSpacing = Math.floor(14 / perDay);
  const date = new Date(now.getTime() + dayOffset * 86400000 + slotInDay * hourSpacing * 3600000);
  return date.toISOString().slice(0, 19);
}

function escapeCSV(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function toCSV(rows: Record<string, string>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]!);
  const lines = [headers.map(escapeCSV).join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => escapeCSV(row[h] ?? '')).join(','));
  }
  return lines.join('\n');
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = createServiceRoleClient();
  const type = req.nextUrl.searchParams.get('type') || 'reposts';

  // Create batch record
  const { data: batch } = await db
    .from('pinterest_csv_batches')
    .insert({ batch_type: type, pin_count: 0, created_by: user.id })
    .select()
    .single();

  if (!batch) {
    return NextResponse.json({ error: 'Failed to create batch' }, { status: 500 });
  }

  let rows: Record<string, string>[] = [];
  let ids: string[] = [];

  if (type === 'reposts') {
    const { data: pins } = await db
      .from('pinterest_scraped')
      .select('*')
      .eq('status', 'processed')
      .not('tweaked_image_url', 'is', null)
      .limit(200);

    if (pins && pins.length > 0) {
      ids = pins.map(p => p.id);
      rows = pins.map((pin, i) => ({
        'Title': ((pin.rewritten_title as string) ?? '').slice(0, 100),
        'Media URL': (pin.tweaked_image_url as string) ?? '',
        'Pinterest board': (pin.target_board as string) ?? 'K-pop Aesthetic',
        'Thumbnail': '',
        'Description': ((pin.rewritten_description as string) ?? '').slice(0, 500),
        'Link': `${SITE_URL}/q/${pin.target_quiz_slug}?utm_source=pinterest&utm_medium=repost&utm_campaign=${batch.id.slice(0, 8)}`,
        'Publish date': getScheduledDate(i, 15),
        'Keywords': `kpop, ${((pin.detected_group as string) ?? 'kpop').toLowerCase()}, kpop quiz, kpop aesthetic`,
      }));

      await db
        .from('pinterest_scraped')
        .update({ status: 'exported', exported_at: new Date().toISOString(), csv_batch_id: batch.id })
        .in('id', ids);
    }
  } else {
    const { data: pins } = await db
      .from('pinterest_originals')
      .select('*')
      .eq('status', 'generated')
      .not('pin_image_url', 'is', null)
      .limit(200);

    if (pins && pins.length > 0) {
      ids = pins.map(p => p.id);
      rows = pins.map((pin, i) => ({
        'Title': ((pin.custom_title as string) ?? `Can You Pass This ${pin.quiz_title}?`).slice(0, 100),
        'Media URL': (pin.pin_image_url as string) ?? '',
        'Pinterest board': pin.group_tag ? `K-pop Quizzes/${pin.group_tag}` : 'K-pop Quizzes',
        'Thumbnail': '',
        'Description': ((pin.custom_description as string) ??
          `Test your K-pop knowledge with "${pin.quiz_title}"! Take the challenge: ${SITE_URL}/q/${pin.quiz_slug}\n\n#kpop #kpopquiz #kpoptrivia`
        ).slice(0, 500),
        'Link': `${SITE_URL}/q/${pin.quiz_slug}?utm_source=pinterest&utm_medium=original&utm_campaign=${batch.id.slice(0, 8)}`,
        'Publish date': getScheduledDate(i, 10),
        'Keywords': `kpop, kpop quiz, ${((pin.group_tag as string) ?? 'kpop').toLowerCase()}, kpop trivia`,
      }));

      await db
        .from('pinterest_originals')
        .update({ status: 'exported', exported_at: new Date().toISOString(), csv_batch_id: batch.id })
        .in('id', ids);
    }
  }

  await db
    .from('pinterest_csv_batches')
    .update({ pin_count: rows.length })
    .eq('id', batch.id);

  const csv = toCSV(rows);
  const filename = `${type}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
