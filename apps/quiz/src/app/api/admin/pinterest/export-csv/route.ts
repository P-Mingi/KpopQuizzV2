import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://kpopquiz.org';

const PINTEREST_COLUMNS = [
  'Title',
  'Media URL',
  'Pinterest board',
  'Thumbnail',
  'Description',
  'Link',
  'Publish date',
  'Keywords',
];

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

/** Strip newlines, control chars, collapse whitespace, truncate. */
function clean(s: string | null | undefined, maxLen?: number): string {
  if (!s) return '';
  let out = String(s)
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (maxLen) out = out.slice(0, maxLen);
  return out;
}

/** RFC 4180 CSV quoting: wrap in double quotes, escape internal quotes by doubling. */
function csvQuote(val: string): string {
  return '"' + val.replace(/"/g, '""') + '"';
}

/** Build a proper CSV string: comma-delimited, CRLF line endings, all fields quoted. */
function toCSV(rows: Record<string, string>[]): string {
  const header = PINTEREST_COLUMNS.map(csvQuote).join(',');
  const dataLines = rows.map(row =>
    PINTEREST_COLUMNS.map(col => csvQuote(row[col] ?? '')).join(',')
  );
  return [header, ...dataLines].join('\r\n') + '\r\n';
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = createServiceRoleClient();
  const type = req.nextUrl.searchParams.get('type') || 'reposts';

  const { data: batch } = await db
    .from('pinterest_csv_batches')
    .insert({ batch_type: type, pin_count: 0, created_by: user.id })
    .select()
    .single();

  if (!batch) {
    return NextResponse.json({ error: 'Failed to create batch' }, { status: 500 });
  }

  const rows: Record<string, string>[] = [];
  const ids: string[] = [];

  if (type === 'reposts') {
    const { data: pins } = await db
      .from('pinterest_scraped')
      .select('*')
      .eq('status', 'processed')
      .not('tweaked_image_url', 'is', null)
      .limit(200);

    if (pins) {
      for (let i = 0; i < pins.length; i++) {
        const pin = pins[i]!;
        const mediaUrl = clean(pin.tweaked_image_url as string, 500);
        if (!mediaUrl.startsWith('http')) continue;

        rows.push({
          'Title': clean(pin.rewritten_title as string, 100),
          'Media URL': mediaUrl,
          'Pinterest board': clean((pin.target_board as string) || 'K-pop Aesthetic', 100),
          'Thumbnail': '',
          'Description': clean(pin.rewritten_description as string, 500),
          'Link': clean(`${SITE_URL}/q/${pin.target_quiz_slug}?utm_source=pinterest&utm_medium=repost&utm_campaign=${batch.id.slice(0, 8)}`, 500),
          'Publish date': getScheduledDate(i, 15),
          'Keywords': clean(`kpop, ${((pin.detected_group as string) ?? 'kpop').toLowerCase()}, kpop quiz, kpop aesthetic`, 200),
        });
        ids.push(pin.id);
      }

      if (ids.length > 0) {
        await db.from('pinterest_scraped')
          .update({ status: 'exported', exported_at: new Date().toISOString(), csv_batch_id: batch.id })
          .in('id', ids);
      }
    }
  } else {
    const { data: pins } = await db
      .from('pinterest_originals')
      .select('*')
      .eq('status', 'generated')
      .not('pin_image_url', 'is', null)
      .limit(200);

    if (pins) {
      for (let i = 0; i < pins.length; i++) {
        const pin = pins[i]!;
        const mediaUrl = clean(pin.pin_image_url as string, 500);
        if (!mediaUrl.startsWith('http')) continue;

        const title = (pin.custom_title as string) || `Can You Pass This ${pin.quiz_title}?`;
        const description = (pin.custom_description as string) ||
          `Test your K-pop knowledge with "${pin.quiz_title}". Take the quiz: ${SITE_URL}/q/${pin.quiz_slug} #kpop #kpopquiz ${pin.group_tag ? `#${(pin.group_tag as string).replace(/\s/g, '')}` : ''} #kpopfan #kpoptrivia`;

        rows.push({
          'Title': clean(title, 100),
          'Media URL': mediaUrl,
          'Pinterest board': clean(pin.group_tag ? `K-pop Quizzes/${pin.group_tag}` : 'K-pop Quizzes', 100),
          'Thumbnail': '',
          'Description': clean(description, 500),
          'Link': clean(`${SITE_URL}/q/${pin.quiz_slug}?utm_source=pinterest&utm_medium=original&utm_campaign=${batch.id.slice(0, 8)}`, 500),
          'Publish date': getScheduledDate(i, 10),
          'Keywords': clean(`kpop, kpop quiz, ${((pin.group_tag as string) ?? 'kpop').toLowerCase()}, kpop trivia`, 200),
        });
        ids.push(pin.id);
      }

      if (ids.length > 0) {
        await db.from('pinterest_originals')
          .update({ status: 'exported', exported_at: new Date().toISOString(), csv_batch_id: batch.id })
          .in('id', ids);
      }
    }
  }

  if (rows.length === 0) {
    return new NextResponse('No valid pins to export', { status: 400 });
  }

  await db.from('pinterest_csv_batches').update({ pin_count: rows.length }).eq('id', batch.id);

  const csv = toCSV(rows);
  const filename = `pinterest-${type}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
