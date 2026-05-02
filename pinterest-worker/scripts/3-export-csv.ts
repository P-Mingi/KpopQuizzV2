/**
 * Generates Pinterest bulk upload CSV from processed pins (reposts) and
 * generated original pins, then marks them as exported.
 *
 * Usage: tsx scripts/3-export-csv.ts [--type=reposts|originals|both]
 */
import { createClient } from '@supabase/supabase-js';
import { stringify } from 'csv-stringify/sync';
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

  console.log(`Exporting ${pins.length} reposts...`);

  const rows = pins.map((pin, i) => ({
    'Title': (pin.rewritten_title as string)?.slice(0, 100) || '',
    'Media URL': pin.tweaked_image_url as string,
    'Pinterest board': (pin.target_board as string) || 'K-pop Aesthetic',
    'Thumbnail': '',
    'Description': (pin.rewritten_description as string)?.slice(0, 500) || '',
    'Link': `${SITE_URL}/q/${pin.target_quiz_slug}?utm_source=pinterest&utm_medium=repost&utm_campaign=${batchId.slice(0, 8)}`,
    'Publish date': getScheduledDate(i, 15),
    'Keywords': `kpop, ${(pin.detected_group as string)?.toLowerCase() || 'kpop'}, kpop quiz, kpop aesthetic, kpop fan`,
  }));

  const csv = stringify(rows, { header: true });
  const outputDir = path.join('output');
  fs.mkdirSync(outputDir, { recursive: true });
  const filename = `reposts-${new Date().toISOString().slice(0, 10)}-${batchId.slice(0, 8)}.csv`;
  fs.writeFileSync(path.join(outputDir, filename), csv);

  const ids = pins.map(p => p.id);
  await supabase
    .from('pinterest_scraped')
    .update({
      status: 'exported',
      exported_at: new Date().toISOString(),
      csv_batch_id: batchId,
    })
    .in('id', ids);

  console.log(`  Saved: output/${filename}`);
  return pins.length;
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

  console.log(`Exporting ${pins.length} originals...`);

  const rows = pins.map((pin, i) => {
    const title = (pin.custom_title as string) || `Can You Pass This ${pin.quiz_title}?`;
    const description = (pin.custom_description as string) || (
      `Test your K-pop knowledge with "${pin.quiz_title}" - the ultimate ${pin.quiz_type} quiz! ` +
      `Take the challenge: ${SITE_URL}/q/${pin.quiz_slug}\n\n` +
      `#kpop #kpopquiz ${pin.group_tag ? `#${(pin.group_tag as string).replace(/\s/g, '')}` : ''} #kpopfan #kpoptrivia #kpopchallenge`
    );

    return {
      'Title': title.slice(0, 100),
      'Media URL': pin.pin_image_url as string,
      'Pinterest board': pin.group_tag
        ? `K-pop Quizzes/${pin.group_tag}`
        : 'K-pop Quizzes',
      'Thumbnail': '',
      'Description': description.slice(0, 500),
      'Link': `${SITE_URL}/q/${pin.quiz_slug}?utm_source=pinterest&utm_medium=original&utm_campaign=${batchId.slice(0, 8)}`,
      'Publish date': getScheduledDate(i, 10),
      'Keywords': `kpop, kpop quiz, ${(pin.group_tag as string)?.toLowerCase() || 'kpop'}, kpop trivia, kpop fan`,
    };
  });

  const csv = stringify(rows, { header: true });
  const outputDir = path.join('output');
  fs.mkdirSync(outputDir, { recursive: true });
  const filename = `originals-${new Date().toISOString().slice(0, 10)}-${batchId.slice(0, 8)}.csv`;
  fs.writeFileSync(path.join(outputDir, filename), csv);

  const ids = pins.map(p => p.id);
  await supabase
    .from('pinterest_originals')
    .update({
      status: 'exported',
      exported_at: new Date().toISOString(),
      csv_batch_id: batchId,
    })
    .in('id', ids);

  console.log(`  Saved: output/${filename}`);
  return pins.length;
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
      await supabase
        .from('pinterest_csv_batches')
        .update({ pin_count: count })
        .eq('id', batch.id);
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
      await supabase
        .from('pinterest_csv_batches')
        .update({ pin_count: count })
        .eq('id', batch.id);
    }
  }

  console.log('\nDone. Upload the CSV files at: https://pinterest.com -> Settings -> Import content');
}

main();
