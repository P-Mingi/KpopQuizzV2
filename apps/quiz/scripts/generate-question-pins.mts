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
  toCSV, clean, hubUrlFor, boardFor, gatherQuestionPins,
  titleFor, descriptionFor, keywordsFor, type QuestionCandidate,
} from '@/lib/pinterest/question-pin-batch';

// ---- env ----
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

const LIMIT = Number(process.argv[2] ?? 100000);         // full coverage by default
const PER_GROUP_CAP = Number(process.argv[3] ?? 100000); // no per-group cap by default (include every member question)
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

interface FeedItem { title: string; link: string; description: string; image: string; guid: string; }

function xmlEscape(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// RSS 2.0 for Pinterest "Publication automatique" (auto-publish from an RSS feed).
// Each item carries the pin image three ways (enclosure + media:content + an
// <img> in content:encoded) so Pinterest finds it however it looks, and links to
// the quiz hub. Unique guids let Pinterest drip: it creates one pin per guid it
// has not seen, at its own rate, until the whole backlog is published.
function buildFeed(items: FeedItem[], nowMs: number): string {
  const head = '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">\n'
    + '<channel>\n'
    + '<title>KpopQuiz question pins</title>\n'
    + `<link>${SITE}</link>\n`
    + '<description>Free K-pop quiz questions. Play at kpopquiz.org</description>\n'
    + '<language>en</language>\n'
    + `<atom:link href="${SITE}/pinterest-feed.xml" rel="self" type="application/rss+xml"/>\n`;
  const body = items.map((it, i) => {
    const pub = new Date(nowMs - i * 3600 * 1000).toUTCString(); // reverse-chron, 1h apart
    const img = xmlEscape(it.image);
    return '<item>\n'
      + `<title>${xmlEscape(it.title)}</title>\n`
      + `<link>${xmlEscape(it.link)}</link>\n`
      + `<guid isPermaLink="false">${xmlEscape(it.guid)}</guid>\n`
      + `<pubDate>${pub}</pubDate>\n`
      + `<description>${xmlEscape(it.description)}</description>\n`
      + `<content:encoded><![CDATA[<img src="${it.image}" alt="${it.title.replace(/"/g, '')}" />]]></content:encoded>\n`
      + `<enclosure url="${img}" type="image/png" length="0"/>\n`
      + `<media:content url="${img}" medium="image" type="image/png"/>\n`
      + `<media:thumbnail url="${img}"/>\n`
      + '</item>\n';
  }).join('');
  return head + body + '</channel>\n</rss>\n';
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
  const feedItems: FeedItem[] = [];
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
      const title = titleFor(c.groupName, isHome, idx);
      const description = descriptionFor(c.groupName, isHome);
      const cleanLink = clean(link, 500);
      rows.push({
        'Title': title,
        'Media URL': mediaUrl,
        'Pinterest board': board,
        'Thumbnail': '',
        'Description': description,
        'Link': cleanLink,
        'Publish date': '', // publish immediately; the RSS feed handles the drip
        'Keywords': keywordsFor(c.groupName, isHome),
      });
      manifest.push({ file: fn, group: c.groupName, template: ['bold', 'editorial'][variant], kind: c.pin.kind, question: c.pin.question, link, isHome });
      feedItems.push({ title, link: cleanLink, description, image: mediaUrl, guid: fn });
      // keep 5 samples on disk for the report
      if (rendered < 5) writeFileSync(join(OUT, `sample-${rendered}-${['bold', 'editorial'][variant]}.png`), png);
      rendered++;
      if (rendered % 40 === 0) console.log(`  rendered ${rendered}/${candidates.length}`);
    } catch (e) {
      console.log(`  skip idx ${idx}: ${(e as Error).message}`);
    }
    idx++;
  }

  // Fallback bulk CSV (no BOM, empty publish dates: both broke Pinterest's importer).
  writeFileSync(join(OUT, 'pinterest-question-pins.csv'), toCSV(rows));
  writeFileSync(join(OUT, 'manifest.json'), JSON.stringify({ generated: rows.length, uniqueHubs: uniqueHubs.size, deadHubs: dead, items: manifest }, null, 2));

  // RSS feed for Pinterest auto-publish (the primary delivery channel now).
  const feedXml = buildFeed(feedItems, Date.now());
  writeFileSync(join(OUT, 'feed.xml'), feedXml);
  await db.storage.from(BUCKET).upload('feed.xml', Buffer.from(feedXml, 'utf-8'), { contentType: 'application/rss+xml; charset=utf-8', upsert: true });
  const feedUrl = db.storage.from(BUCKET).getPublicUrl('feed.xml').data.publicUrl;

  console.log(`\nDONE: ${rows.length} pins -> ${BUCKET} bucket`);
  console.log(`feed.xml: ${feedItems.length} items -> ${feedUrl}`);
  console.log('CSV + manifest + feed.xml in pinterest-output/');
}

main().catch((e) => { console.error(e); process.exit(1); });
