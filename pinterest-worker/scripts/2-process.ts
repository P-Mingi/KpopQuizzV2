/**
 * Reads approved pins from Supabase, downloads original images,
 * tweaks them with Sharp, uploads to Supabase Storage, marks as processed.
 *
 * Usage: tsx scripts/2-process.ts (from pinterest-worker/)
 */
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SITE_URL = process.env.SITE_URL || 'https://kpopquiz.org';

// ---- TITLE REWRITING ----
// Goal: keep the original vibe, names, and meaning but rephrase slightly

const usedTitles = new Set<string>();

/**
 * Light rewrite of the original title. Keeps names and meaning intact,
 * just shuffles phrasing slightly so it's not an exact duplicate.
 *
 * If a searchQuery is provided (e.g. "arirang bts"), the key terms from it
 * are guaranteed to appear in the final title.
 */
function rewriteTitle(originalTitle: string | null, group: string, searchQuery: string | null): string {
  // Extract key terms from search query that must appear in the title
  const queryTerms = searchQuery
    ? searchQuery.trim().split(/\s+/).filter(w => w.length > 1)
    : [];

  // If we have an original title, use it as the base
  if (originalTitle && originalTitle.trim().length > 3) {
    let base = originalTitle.trim();

    // Ensure search query terms are present in the title
    if (queryTerms.length > 0) {
      const baseLower = base.toLowerCase();
      const missingTerms = queryTerms.filter(t => !baseLower.includes(t.toLowerCase()));
      if (missingTerms.length > 0) {
        // Prepend missing terms naturally
        const prefix = missingTerms.join(' ');
        base = `${prefix} - ${base}`;
      }
    }

    // Try a set of light variations
    const variations = [
      base,
      tweakTitle(base),
      tweakTitle(base),
      tweakTitle(base),
    ];

    for (const v of variations) {
      const candidate = v.slice(0, 100);
      if (!usedTitles.has(candidate)) {
        usedTitles.add(candidate);
        return candidate;
      }
    }

    // All variations taken, append a small differentiator
    const fallback = `${base.slice(0, 95)}`.trim();
    usedTitles.add(fallback);
    return fallback;
  }

  // No original title - build from search query or group
  const label = searchQuery || group;
  const fallbacks = [
    `${label}`,
    `${label} aesthetic`,
    `${label} moments`,
    `${label} vibes`,
    `${label} pics`,
  ];
  for (const f of fallbacks) {
    if (!usedTitles.has(f)) {
      usedTitles.add(f);
      return f;
    }
  }
  const fb = `${label} ${usedTitles.size}`;
  usedTitles.add(fb);
  return fb;
}

/**
 * Apply a small random transformation to a title while keeping its meaning.
 * - Might swap word order slightly
 * - Might add/remove trailing punctuation
 * - Might lowercase/capitalize differently
 */
function tweakTitle(title: string): string {
  const ops: Array<(s: string) => string> = [
    // Remove trailing punctuation and re-add differently
    s => s.replace(/[.!?]+$/, '').trim(),
    // Add ellipsis
    s => s.replace(/[.!?]*$/, '...').trim(),
    // Swap to lowercase start (more casual)
    s => s.charAt(0).toLowerCase() + s.slice(1),
    // Remove emojis
    s => s.replace(/[\u{1F000}-\u{1FFFF}]/gu, '').trim(),
    // Add a subtle prefix
    s => {
      const prefixes = ['omg ', 'ok but ', 'wait ', 'literally ', 'honestly '];
      return prefixes[Math.floor(Math.random() * prefixes.length)] + s.charAt(0).toLowerCase() + s.slice(1);
    },
    // Remove "I" phrases at start and keep the rest
    s => s.replace(/^(I think |I love |I can't |I'm |My )/i, '').trim(),
    // Just return as-is (identity)
    s => s,
  ];

  const op = ops[Math.floor(Math.random() * ops.length)]!;
  const result = op(title);
  return result.length > 2 ? result : title;
}


// ---- DESCRIPTION REWRITING ----
// Goal: natural, fan-oriented description based on original content + relevant hashtags

function rewriteDescription(
  originalTitle: string | null,
  originalDesc: string | null,
  group: string | null,
  searchQuery: string | null,
): string {
  const g = group || 'K-pop';

  // Extract any meaningful text from the original to reuse
  const originalText = (originalDesc && originalDesc.trim().length > 10)
    ? cleanOriginalDesc(originalDesc)
    : (originalTitle || '').trim();

  // Build a natural description
  let body: string;
  if (originalText.length > 15) {
    // Reuse the original text (cleaned of existing hashtags and links)
    body = originalText.slice(0, 300);
  } else {
    // Minimal fallback
    body = '';
  }

  // Build relevant hashtags - search query terms first, then group-specific + general kpop
  const tags: string[] = [];

  // Add hashtags from search query terms (e.g. "arirang bts" -> #arirang #bts)
  if (searchQuery) {
    const queryWords = searchQuery.trim().split(/\s+/).filter(w => w.length > 1);
    for (const w of queryWords) {
      const tag = `#${w.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      if (tag.length > 1 && !tags.includes(tag)) tags.push(tag);
    }
  }

  // Group-specific tags
  if (group) {
    const groupTag = group.replace(/[\s()'-]/g, '').toLowerCase();
    tags.push(`#${groupTag}`);

    // Add common fan tags for the group
    const groupFandom: Record<string, string[]> = {
      'BTS': ['#bts', '#bangtan', '#army', '#mycelebrity'],
      'BLACKPINK': ['#blackpink', '#blink'],
      'Stray Kids': ['#straykids', '#skz', '#stay'],
      'aespa': ['#aespa', '#mys'],
      'TWICE': ['#twice', '#once'],
      'NewJeans': ['#newjeans', '#bunnies'],
      'SEVENTEEN': ['#seventeen', '#svt', '#carat'],
      'IVE': ['#ive', '#dive'],
      'EXO': ['#exo', '#exol'],
      'LE SSERAFIM': ['#lesserafim', '#lsfm', '#fearnot'],
      'ENHYPEN': ['#enhypen', '#engene'],
      'TXT': ['#txt', '#tomorrowxtogether', '#moa'],
      'ITZY': ['#itzy', '#midzy'],
      'Red Velvet': ['#redvelvet', '#reveluv'],
      '(G)I-DLE': ['#gidle', '#idle', '#neverland'],
      'ATEEZ': ['#ateez', '#atiny'],
    };
    const fandomTags = groupFandom[group];
    if (fandomTags) {
      for (const t of fandomTags) {
        if (!tags.includes(t)) tags.push(t);
      }
    }
  }

  // General kpop tags
  tags.push('#kpop', '#kpopfan', '#kpopaesthetic', '#kpopidol');

  const hashtagStr = tags.slice(0, 10).join(' ');

  // Combine: body + hashtags
  if (body.length > 0) {
    return `${body}\n\n${hashtagStr}`.slice(0, 500);
  }
  return hashtagStr.slice(0, 500);
}

/**
 * Clean an original Pinterest description:
 * - Remove existing hashtags
 * - Remove URLs
 * - Remove excessive whitespace
 */
function cleanOriginalDesc(desc: string): string {
  return desc
    .replace(/#\w+/g, '')           // remove hashtags
    .replace(/https?:\/\/\S+/g, '') // remove URLs
    .replace(/\n+/g, ' ')           // collapse newlines
    .replace(/\s{2,}/g, ' ')        // collapse spaces
    .trim();
}


// ---- QUIZ SLUG MAPPING ----

const DEFAULT_QUIZ_SLUGS: Record<string, string> = {
  'BTS': 'bts-discography',
  'BLACKPINK': 'blackpink-quiz',
  'Stray Kids': 'stray-kids-quiz',
  'aespa': 'aespa-quiz',
  'TWICE': 'twice-quiz',
  'NewJeans': 'newjeans-quiz',
  'SEVENTEEN': 'seventeen-quiz',
  'IVE': 'ive-quiz',
  'EXO': 'exo-quiz',
  'LE SSERAFIM': 'le-sserafim-quiz',
  'ENHYPEN': 'enhypen-quiz',
  'TXT': 'txt-quiz',
  'ITZY': 'itzy-quiz',
  'Red Velvet': 'red-velvet-quiz',
  '(G)I-DLE': 'gidle-quiz',
  'ATEEZ': 'ateez-quiz',
};


// ---- PROCESSING ----

interface ScrapedPin {
  id: string;
  job_id: string | null;
  source_image_url: string;
  original_title: string | null;
  original_description: string | null;
  detected_group: string | null;
  target_quiz_slug: string | null;
}

// Cache job queries so we don't re-fetch for every pin
const jobQueryCache = new Map<string, string>();

async function getJobQuery(jobId: string | null): Promise<string | null> {
  if (!jobId) return null;
  if (jobQueryCache.has(jobId)) return jobQueryCache.get(jobId)!;
  const { data } = await supabase
    .from('pinterest_scrape_jobs')
    .select('query, job_type')
    .eq('id', jobId)
    .single();
  const query = data?.job_type === 'search' ? (data.query as string) : null;
  if (query) jobQueryCache.set(jobId, query);
  return query;
}

async function processOne(pin: ScrapedPin) {
  const group = pin.detected_group || 'K-pop';
  console.log(`  -> Processing: ${group} pin (${pin.id}) - "${(pin.original_title || '').slice(0, 50)}"`);

  const response = await fetch(pin.source_image_url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());

  const meta = await sharp(buffer).metadata();
  const w = meta.width || 1000;
  const h = meta.height || 1500;

  const cropX = Math.floor(Math.random() * (w * 0.04)) + Math.floor(w * 0.02);
  const cropY = Math.floor(Math.random() * (h * 0.04)) + Math.floor(h * 0.02);
  const cropW = Math.max(10, w - cropX * 2);
  const cropH = Math.max(10, h - cropY * 2);

  const tweaked = await sharp(buffer)
    .extract({ left: cropX, top: cropY, width: cropW, height: cropH })
    .resize(1000, 1500, { fit: 'cover', position: 'center' })
    .modulate({
      brightness: 1 + (Math.random() * 0.06 - 0.03),
      saturation: 1 + (Math.random() * 0.08 - 0.04),
      hue: Math.floor(Math.random() * 6) - 3,
    })
    .jpeg({ quality: 88 + Math.floor(Math.random() * 8) })
    .toBuffer();

  const filename = `reposts/${randomUUID()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from('pinterest-pins')
    .upload(filename, tweaked, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('pinterest-pins')
    .getPublicUrl(filename);

  const tweakedUrl = urlData.publicUrl;

  const searchQuery = await getJobQuery(pin.job_id);
  const title = rewriteTitle(pin.original_title, group, searchQuery);
  const quizSlug = pin.target_quiz_slug || DEFAULT_QUIZ_SLUGS[group] || 'kpop-quiz';
  const description = rewriteDescription(pin.original_title, pin.original_description, pin.detected_group, searchQuery);
  const board = pin.detected_group || 'K-pop Aesthetic';

  const { error: updateError } = await supabase
    .from('pinterest_scraped')
    .update({
      tweaked_image_url: tweakedUrl,
      rewritten_title: title,
      rewritten_description: description,
      target_quiz_slug: quizSlug,
      target_board: board,
      status: 'processed',
      processed_at: new Date().toISOString(),
    })
    .eq('id', pin.id);

  if (updateError) throw new Error(`Update failed: ${updateError.message}`);

  console.log(`    OK "${title.slice(0, 60)}"`);
}

async function main() {
  const { data: pins, error } = await supabase
    .from('pinterest_scraped')
    .select('id, job_id, source_image_url, original_title, original_description, detected_group, target_quiz_slug')
    .eq('status', 'approved');

  if (error) {
    console.error('Fetch error:', error);
    return;
  }

  if (!pins || pins.length === 0) {
    console.log('No approved pins to process. Approve pins from /admin/pinterest first.');
    return;
  }

  console.log(`Processing ${pins.length} approved pins...\n`);

  let success = 0;
  let failed = 0;

  for (const pin of pins) {
    try {
      await processOne(pin as ScrapedPin);
      success++;
    } catch (err) {
      console.error(`  x Failed for ${pin.id}: ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(`\nProcessed: ${success}, Failed: ${failed}`);
  console.log('Now run: npm run export');
}

main();
