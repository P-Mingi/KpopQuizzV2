/**
 * Generates Pinterest bulk upload CSV from processed pins.
 * Comma-delimited, CRLF line endings, all fields quoted, no BOM.
 *
 * Usage: tsx scripts/3-export-csv.ts [--type=reposts|originals|both]
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SITE_URL = process.env.SITE_URL || 'https://kpopquiz.org';

const args = process.argv.slice(2);
const typeArg = args.find(a => a.startsWith('--type='))?.split('=')[1] || 'both';

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
  const minuteSpacing = Math.floor((14 * 60) / perDay);
  const date = new Date(now.getTime() + dayOffset * 86400000 + slotInDay * minuteSpacing * 60000);
  return date.toISOString().slice(0, 19);
}

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

function csvQuote(val: string): string {
  return '"' + val.replace(/"/g, '""') + '"';
}

function toCSV(rows: Record<string, string>[]): string {
  const header = PINTEREST_COLUMNS.map(csvQuote).join(',');
  const dataLines = rows.map(row =>
    PINTEREST_COLUMNS.map(col => csvQuote(row[col] ?? '')).join(',')
  );
  return [header, ...dataLines].join('\r\n') + '\r\n';
}

async function exportReposts(batchId: string): Promise<number> {
  const { data: pins, error } = await supabase
    .from('pinterest_scraped')
    .select('*')
    .eq('status', 'processed')
    .not('tweaked_image_url', 'is', null)
    .limit(200);

  if (error || !pins || pins.length === 0) {
    console.log('No processed reposts to export.');
    return 0;
  }

  console.log(`Building CSV for ${pins.length} reposts...`);

  const rows: Record<string, string>[] = [];
  for (let i = 0; i < pins.length; i++) {
    const pin = pins[i];
    const mediaUrl = clean(pin.tweaked_image_url as string, 500);
    if (!mediaUrl.startsWith('http')) continue;

    rows.push({
      'Title': clean(pin.rewritten_title as string, 100),
      'Media URL': mediaUrl,
      'Pinterest board': clean((pin.target_board as string) || 'K-pop Aesthetic', 100),
      'Thumbnail': '',
      'Description': clean(pin.rewritten_description as string, 500),
      'Link': clean(`${SITE_URL}/q/${pin.target_quiz_slug}?utm_source=pinterest&utm_medium=repost&utm_campaign=${batchId.slice(0, 8)}`, 500),
      'Publish date': getScheduledDate(i, 15),
      'Keywords': clean(`kpop, ${((pin.detected_group as string) ?? 'kpop').toLowerCase()}, kpop quiz, kpop aesthetic`, 200),
    });
  }

  const csv = toCSV(rows);
  const outputDir = path.join('output');
  fs.mkdirSync(outputDir, { recursive: true });
  const filename = `reposts-${new Date().toISOString().slice(0, 10)}-${batchId.slice(0, 8)}.csv`;
  fs.writeFileSync(path.join(outputDir, filename), csv, { encoding: 'utf8' });

  console.log(`  First row preview:`);
  console.log('  ' + csv.split('\r\n').slice(0, 2).join('\n  '));

  const ids = pins.map(p => p.id);
  await supabase
    .from('pinterest_scraped')
    .update({ status: 'exported', exported_at: new Date().toISOString(), csv_batch_id: batchId })
    .in('id', ids);

  console.log(`  Saved: output/${filename} (${rows.length} rows)`);
  return rows.length;
}

async function exportOriginals(batchId: string): Promise<number> {
  const { data: pins, error } = await supabase
    .from('pinterest_originals')
    .select('*')
    .eq('status', 'generated')
    .not('pin_image_url', 'is', null)
    .limit(200);

  if (error || !pins || pins.length === 0) {
    console.log('No generated originals to export.');
    return 0;
  }

  console.log(`Building CSV for ${pins.length} originals...`);

  const rows: Record<string, string>[] = [];
  for (let i = 0; i < pins.length; i++) {
    const pin = pins[i];
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
      'Link': clean(`${SITE_URL}/q/${pin.quiz_slug}?utm_source=pinterest&utm_medium=original&utm_campaign=${batchId.slice(0, 8)}`, 500),
      'Publish date': getScheduledDate(i, 10),
      'Keywords': clean(`kpop, kpop quiz, ${((pin.group_tag as string) ?? 'kpop').toLowerCase()}, kpop trivia`, 200),
    });
  }

  const csv = toCSV(rows);
  const outputDir = path.join('output');
  fs.mkdirSync(outputDir, { recursive: true });
  const filename = `originals-${new Date().toISOString().slice(0, 10)}-${batchId.slice(0, 8)}.csv`;
  fs.writeFileSync(path.join(outputDir, filename), csv, { encoding: 'utf8' });

  console.log(`  First row preview:`);
  console.log('  ' + csv.split('\r\n').slice(0, 2).join('\n  '));

  const ids = pins.map(p => p.id);
  await supabase
    .from('pinterest_originals')
    .update({ status: 'exported', exported_at: new Date().toISOString(), csv_batch_id: batchId })
    .in('id', ids);

  console.log(`  Saved: output/${filename} (${rows.length} rows)`);
  return rows.length;
}

async function main() {
  if (typeArg === 'both' || typeArg === 'reposts') {
    const { data: batch } = await supabase
      .from('pinterest_csv_batches')
      .insert({ batch_type: 'reposts', pin_count: 0 })
      .select()
      .single();

    if (batch) {
      const count = await exportReposts(batch.id);
      await supabase.from('pinterest_csv_batches').update({ pin_count: count }).eq('id', batch.id);
    }
  }

  if (typeArg === 'both' || typeArg === 'originals') {
    const { data: batch } = await supabase
      .from('pinterest_csv_batches')
      .insert({ batch_type: 'originals', pin_count: 0 })
      .select()
      .single();

    if (batch) {
      const count = await exportOriginals(batch.id);
      await supabase.from('pinterest_csv_batches').update({ pin_count: count }).eq('id', batch.id);
    }
  }

  console.log('\nDone. Upload CSV at: pinterest.com -> Settings -> Bulk create Pins');
}

main();
