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

const TITLE_TEMPLATES = [
  (g: string) => `${g} Aesthetic That Hits Different`,
  (g: string) => `Only Real ${g} Fans Will Understand`,
  (g: string) => `This ${g} Energy Is Everything`,
  (g: string) => `POV: You're a ${g} Stan`,
  (g: string) => `${g} Vibes For Your Soul`,
  (g: string) => `The ${g} Content We Needed Today`,
  (g: string) => `How Well Do You Know ${g}?`,
  (g: string) => `${g} Stans Will Love This`,
  (g: string) => `Calling All ${g} Fans`,
  (g: string) => `${g} Fan? Prove It With This Quiz`,
  (g: string) => `${g} Moments That Live Rent Free`,
  (g: string) => `Every ${g} Fan Needs to See This`,
  (g: string) => `${g} Quiz: How Well Do You Know Them?`,
  (g: string) => `This Is Your Sign to Stan ${g}`,
  (g: string) => `${g} Core Aesthetic`,
  (g: string) => `The Ultimate ${g} Fan Challenge`,
  (g: string) => `Are You the Biggest ${g} Fan?`,
  (g: string) => `${g} Appreciation Post`,
  (g: string) => `${g} Pictures That Go Hard`,
  (g: string) => `Why ${g} Fans Are Built Different`,
  (g: string) => `${g} Content for Your Feed`,
  (g: string) => `Tag a ${g} Stan`,
  (g: string) => `${g} Quiz Time`,
  (g: string) => `Only ${g} Stans Will Get This`,
  (g: string) => `${g} Fan Check`,
  (g: string) => `Can You Name Every ${g} Member?`,
  (g: string) => `${g} Era Was Everything`,
  (g: string) => `Living for This ${g} Moment`,
  (g: string) => `${g} Trivia Challenge`,
  (g: string) => `Test Your ${g} Knowledge`,
];

// Track used titles to guarantee uniqueness within a batch
const usedTitles = new Set<string>();

function getUniqueTitle(group: string): string {
  const emojis = ['', ' !!', ' ??', ' >>'];
  for (let attempt = 0; attempt < 200; attempt++) {
    const fn = TITLE_TEMPLATES[Math.floor(Math.random() * TITLE_TEMPLATES.length)]!;
    const suffix = attempt < TITLE_TEMPLATES.length ? '' : emojis[attempt % emojis.length];
    const candidate = (fn(group) + suffix).slice(0, 100);
    if (!usedTitles.has(candidate)) {
      usedTitles.add(candidate);
      return candidate;
    }
  }
  // Fallback: append a number
  const fn = TITLE_TEMPLATES[Math.floor(Math.random() * TITLE_TEMPLATES.length)]!;
  const fallback = `${fn(group)} #${usedTitles.size + 1}`.slice(0, 100);
  usedTitles.add(fallback);
  return fallback;
}

function rewriteDescription(group: string | null, quizSlug: string): string {
  const g = group || 'K-pop';
  const intros = [
    `Are you a true ${g} stan?`,
    `This gives me so many ${g} feels!`,
    `The ${g} community is unmatched`,
    `${g} fans, this one's for you`,
    `Calling all ${g} stans!`,
  ];
  const ctas = [
    `Test your knowledge: ${SITE_URL}/q/${quizSlug}`,
    `Take the ultimate quiz: ${SITE_URL}/q/${quizSlug}`,
    `How well do you REALLY know ${g}? ${SITE_URL}/q/${quizSlug}`,
    `Prove you're the biggest ${g} fan: ${SITE_URL}/q/${quizSlug}`,
  ];
  const hashtags = [
    '#kpop', '#kpopfan', '#kpopaesthetic',
    group ? `#${group.replace(/[\s()]/g, '').toLowerCase()}` : '#kpoplife',
    '#kpopquiz', '#kpoptrivia', '#kpopchallenge',
    '#kpopidol', '#hallyu',
  ].join(' ');

  const intro = intros[Math.floor(Math.random() * intros.length)];
  const cta = ctas[Math.floor(Math.random() * ctas.length)];
  return `${intro} ${cta}\n\n${hashtags}`.slice(0, 500);
}

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
};

interface ScrapedPin {
  id: string;
  source_image_url: string;
  detected_group: string | null;
  target_quiz_slug: string | null;
}

async function processOne(pin: ScrapedPin) {
  console.log(`  -> Processing: ${pin.detected_group || 'K-pop'} pin (${pin.id})`);

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

  const group = pin.detected_group || 'K-pop';
  const title = getUniqueTitle(group);

  const quizSlug = pin.target_quiz_slug || DEFAULT_QUIZ_SLUGS[group] || 'kpop-quiz';
  const description = rewriteDescription(pin.detected_group, quizSlug);
  const board = pin.detected_group
    ? `K-pop Aesthetic/${pin.detected_group}`
    : 'K-pop Aesthetic';

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

  console.log(`    OK ${title.slice(0, 50)}...`);
}

async function main() {
  const { data: pins, error } = await supabase
    .from('pinterest_scraped')
    .select('*')
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
