/**
 * V-PIN-Q: generate the per-question Pinterest batch.
 *
 *   pnpm exec tsx scripts/generate-question-pins.mts [limit]
 *
 * Renders per-question cards (question + options, ANSWER HIDDEN) with template
 * variety, uploads PNGs to a public Supabase bucket (the house output location),
 * verifies every group-hub link is 200, and writes the Pinterest bulk CSV +
 * manifest to pinterest-output/. Real questions only; no idol photos; no em dashes.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import {
  loadFonts, loadMascotUri, questionPinToPng, type Fonts,
} from '@/lib/pinterest/question-pin';
import {
  toCSV, clean, scheduledDate, hubUrlFor, boardFor, gatherQuestionPins,
  titleFor, descriptionFor, keywordsFor, type QuestionCandidate,
} from '@/lib/pinterest/question-pin-batch';

// ---- env ----
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

const LIMIT = Number(process.argv[2] ?? 360);
const PER_GROUP_CAP = 26;      // spread across groups, avoid an all-BTS batch
const PER_DAY = 12;            // drip cadence baked into the CSV schedule
const BUCKET = 'pinterest-question-pins';
const OUT = join(process.cwd(), 'pinterest-output');
const SITE = 'https://kpopquiz.org';
const MASCOTS = ['mascot-default', 'mascot-celebrate', 'mascot-think'] as const;

async function fetchQuizzes(): Promise<Array<{ quiz_type: string; questions: unknown; groups: unknown }>> {
  // Text-renderable types only. image + intruder excluded (image-dependent / idol photos).
  const { data, error } = await db
    .from('quizzes')
    .select('quiz_type, questions, play_count, groups!inner(name, slug, display_color)')
    .eq('status', 'published')
    .in('quiz_type', ['multiple_choice', 'true_false', 'guess_from_clues'])
    .not('questions', 'is', null)
    .order('play_count', { ascending: false })
    .limit(1000);
  if (error) throw new Error(`quizzes: ${error.message}`);
  return (data ?? []) as Array<{ quiz_type: string; questions: unknown; groups: unknown }>;
}

async function verifyHub(url: string): Promise<boolean> {
  try {
    const bare = url.split('?')[0]!;
    const r = await fetch(bare, { method: 'GET', redirect: 'manual' });
    return r.status === 200;
  } catch { return false; }
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const fonts: Fonts = loadFonts();
  const mascotUris = MASCOTS.map((m) => loadMascotUri(m));

  const { picked: candidates, stats } = gatherQuestionPins(await fetchQuizzes(), { limit: LIMIT, perGroupCap: PER_GROUP_CAP });
  console.log(`gathered: excluded ${stats.media} media-dependent, ${stats.glyph} non-Latin-renderable, ${stats.malformed} malformed`);
  console.log(`selected ${candidates.length} question pins (cap ${PER_GROUP_CAP}/group, limit ${LIMIT})`);

  // Verify every UNIQUE hub link is 200 before anything goes in the CSV.
  const hubCache = new Map<string, boolean>();
  const uniqueHubs = new Set(candidates.map((c) => hubUrlFor(c.groupSlug, 'x').url.split('?')[0]!));
  console.log(`verifying ${uniqueHubs.size} unique hub links against ${SITE} ...`);
  for (const h of uniqueHubs) hubCache.set(h, await verifyHub(h));
  const dead = [...hubCache.entries()].filter(([, ok]) => !ok).map(([u]) => u);
  console.log(`hub link check: ${[...hubCache.values()].filter(Boolean).length}/${uniqueHubs.size} return 200`);
  if (dead.length) console.log('  dead (pins re-pointed to home):', dead.join(', '));

  await db.storage.createBucket(BUCKET, { public: true }).catch(() => null);

  const rows: Record<string, string>[] = [];
  const manifest: Array<Record<string, unknown>> = [];
  let idx = 0, rendered = 0;
  for (const c of candidates) {
    let { url: link, isHome } = hubUrlFor(c.groupSlug, `q${idx}`);
    // If a real hub failed verification, fall back to home (flagged).
    if (!isHome && hubCache.get(link.split('?')[0]!) === false) {
      ({ url: link, isHome } = hubUrlFor(null, `q${idx}`));
    }
    const variant = idx % 2;
    try {
      const png = await questionPinToPng(c.pin, variant, mascotUris[idx % mascotUris.length]!, fonts);
      const fn = `q-${(c.groupSlug ?? 'home')}-${idx}.png`;
      await db.storage.from(BUCKET).upload(fn, png, { contentType: 'image/png', upsert: true });
      const mediaUrl = db.storage.from(BUCKET).getPublicUrl(fn).data.publicUrl;

      const board = boardFor(c.groupName, isHome);
      rows.push({
        'Title': titleFor(c.groupName, isHome, idx),
        'Media URL': mediaUrl,
        'Pinterest board': board,
        'Thumbnail': '',
        'Description': descriptionFor(c.groupName, isHome),
        'Link': clean(link, 500),
        'Publish date': scheduledDate(rows.length, PER_DAY),
        'Keywords': keywordsFor(c.groupName, isHome),
      });
      manifest.push({ file: fn, group: c.groupName, template: ['bold', 'editorial'][variant], kind: c.pin.kind, question: c.pin.question, link, isHome });
      // keep 5 samples on disk for the report
      if (rendered < 5) writeFileSync(join(OUT, `sample-${rendered}-${['bold', 'editorial'][variant]}.png`), png);
      rendered++;
      if (rendered % 40 === 0) console.log(`  rendered ${rendered}/${candidates.length}`);
    } catch (e) {
      console.log(`  skip idx ${idx}: ${(e as Error).message}`);
    }
    idx++;
  }

  const csv = toCSV(rows);
  writeFileSync(join(OUT, 'pinterest-question-pins.csv'), '﻿' + csv); // UTF-8 BOM for Pinterest
  writeFileSync(join(OUT, 'manifest.json'), JSON.stringify({ generated: rows.length, uniqueHubs: uniqueHubs.size, deadHubs: dead, perGroupCap: PER_GROUP_CAP, perDay: PER_DAY, items: manifest }, null, 2));
  console.log(`\nDONE: ${rows.length} pins -> ${BUCKET} bucket; CSV + manifest in pinterest-output/`);
}

main().catch((e) => { console.error(e); process.exit(1); });
