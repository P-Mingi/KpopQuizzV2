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
  loadFonts, loadMascotUri, questionPinToPng, type QuestionPin, type Fonts,
} from '@/lib/pinterest/question-pin';
import {
  toCSV, clean, scheduledDate, hubUrlFor, boardFor, isMediaDependent, isRenderable, noDash,
  titleFor, descriptionFor, keywordsFor,
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

type RawQ = { question?: string; options?: unknown; clues?: string[] };
interface Candidate { pin: QuestionPin; groupSlug: string | null; groupName: string | null; }

function optionStrings(options: unknown): string[] | null {
  if (!Array.isArray(options)) return null;
  // Only pure-text options (intruder-style {label,image_url} = idol photos, excluded upstream by quiz_type).
  const out: string[] = [];
  for (const o of options) {
    if (typeof o === 'string') out.push(o.trim());
    else return null; // object option = image-bearing, not a legal text pin
  }
  return out.filter(Boolean);
}

async function gather(): Promise<Candidate[]> {
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

  const byGroup = new Map<string, Candidate[]>();
  const seen = new Set<string>();
  let excludedMedia = 0, excludedShape = 0, excludedGlyph = 0;

  for (const quiz of data ?? []) {
    const g = quiz.groups as unknown as { name: string; slug: string; display_color: string | null } | null;
    const groupName = g?.name ?? null;
    const groupSlug = g?.slug ?? null;
    const theme = g?.display_color ?? '#E8457A';
    const qs = (Array.isArray(quiz.questions) ? quiz.questions : []) as RawQ[];

    for (const q of qs) {
      const question = clean(q.question ?? '', 200);
      if (!question || question.length < 8) { excludedShape++; continue; }
      if (isMediaDependent(question)) { excludedMedia++; continue; }
      if (!isRenderable(question)) { excludedGlyph++; continue; }

      const key = question.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60);
      if (seen.has(key)) continue;

      let pin: QuestionPin | null = null;
      if (quiz.quiz_type === 'true_false') {
        pin = { group: groupName ?? '', themeColor: theme, question: noDash(question), kind: 'truefalse' };
      } else {
        const opts = optionStrings(q.options);
        if (!opts || opts.length < 2) { excludedShape++; continue; }
        if (!opts.every(isRenderable)) { excludedGlyph++; continue; }
        const clues = quiz.quiz_type === 'guess_from_clues' && Array.isArray(q.clues)
          ? q.clues.map((c) => noDash(clean(c, 90))).filter((c) => c && isRenderable(c)).slice(0, 3) : undefined;
        pin = { group: groupName ?? '', themeColor: theme, question: noDash(question), kind: 'options', options: opts.map((o) => noDash(o)), ...(clues && clues.length ? { clues } : {}) };
      }
      seen.add(key);
      const bucket = groupSlug ?? '__home__';
      if (!byGroup.has(bucket)) byGroup.set(bucket, []);
      byGroup.get(bucket)!.push({ pin, groupSlug, groupName });
    }
  }
  console.log(`gathered raw: excluded ${excludedMedia} media-dependent, ${excludedGlyph} non-Latin-renderable, ${excludedShape} malformed`);

  // Round-robin across groups (capped) so the batch is not dominated by one group.
  const groups = [...byGroup.entries()].sort((a, b) => b[1].length - a[1].length);
  const picked: Candidate[] = [];
  let round = 0;
  while (picked.length < LIMIT && groups.some(([, arr]) => arr.length > round && round < PER_GROUP_CAP)) {
    for (const [, arr] of groups) {
      if (round < arr.length && round < PER_GROUP_CAP) { picked.push(arr[round]!); if (picked.length >= LIMIT) break; }
    }
    round++;
  }
  return picked;
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

  const candidates = await gather();
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
    const variant = idx % 3;
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
      manifest.push({ file: fn, group: c.groupName, template: ['bold', 'editorial', 'spotlight'][variant], kind: c.pin.kind, question: c.pin.question, link, isHome });
      // keep 5 samples on disk for the report
      if (rendered < 5) writeFileSync(join(OUT, `sample-${rendered}-${['bold', 'editorial', 'spotlight'][variant]}.png`), png);
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
