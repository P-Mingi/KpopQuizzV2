#!/usr/bin/env node
/**
 * generate-pins.ts - Generate 1000x1500 Pinterest pin PNGs for kpopquiz.org
 *
 * Usage (from repo root):
 *   pnpm tsx scripts/generate-pins.ts --sample   # 3 samples, one per template, then STOP
 *   pnpm tsx scripts/generate-pins.ts            # full 200 pins
 *
 * Output: pinterest-pins/ (gitignored)
 *   - A-{group}.png, B-{slug}.png, C-{slug}.png
 *   - manifest.csv
 *   - manifest.json
 */

import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
// Load .env.local without dotenv (not available at monorepo root)
function loadEnv(file: string): void {
  try {
    const raw = readFileSync(file, 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch { /* file not found - rely on existing env */ }
}
loadEnv(join(process.cwd(), '.env.local'));

// ---- DIMENSIONS / BRAND ----
const W = 1000;
const H = 1500;
const PINK = '#E8457A';
const CREAM = '#FAF8F5';
const DARK = '#1A1816';
const GRAY = '#9B8B86';
const SITE = 'kpopquiz.org';

// ---- PATHS ----
const ASSET_DIR = join(process.cwd(), 'apps/quiz/public');
const FONT_DIR = join(process.cwd(), 'scripts/fonts');
const OUT_DIR = join(process.cwd(), 'pinterest-pins');

const SAMPLE_ONLY = process.argv.includes('--sample');

// ---- ASSETS (loaded once) ----
function b64(filePath: string): string {
  return readFileSync(filePath).toString('base64');
}

const MASCOT_DEFAULT_B64 = b64(join(ASSET_DIR, 'mascot/mascot-default.png'));
const MASCOT_CELEBRATE_B64 = b64(join(ASSET_DIR, 'mascot/mascot-celebrate.png'));
const MASCOT_DEFAULT_URI = `data:image/png;base64,${MASCOT_DEFAULT_B64}`;
const MASCOT_CELEBRATE_URI = `data:image/png;base64,${MASCOT_CELEBRATE_B64}`;

// Font: prefer DM Sans woff2 (downloaded), fall back to Pretendard
function loadFontUri(weight: 400 | 700 | 800): string {
  const dmPath = join(FONT_DIR, `dm-sans-${weight}.woff2`);
  const pretRegular = join(ASSET_DIR, 'fonts/Pretendard-Regular-latin.woff2');
  const pretMedium = join(ASSET_DIR, 'fonts/Pretendard-Medium-latin.woff2');
  if (existsSync(dmPath)) return `data:font/woff2;base64,${b64(dmPath)}`;
  // Pretendard only has 400 and 500; use medium for bold weights
  return `data:font/woff2;base64,${b64(weight === 400 ? pretRegular : pretMedium)}`;
}

const FONT_400_URI = loadFontUri(400);
const FONT_700_URI = loadFontUri(700);
const FONT_800_URI = loadFontUri(800);

const FONT_FACE = `
  @font-face {
    font-family: 'DM';
    font-weight: 400;
    src: url('${FONT_400_URI}') format('woff2');
  }
  @font-face {
    font-family: 'DM';
    font-weight: 700;
    src: url('${FONT_700_URI}') format('woff2');
  }
  @font-face {
    font-family: 'DM';
    font-weight: 800;
    src: url('${FONT_800_URI}') format('woff2');
  }
`;

// ---- TEXT WRAPPING ----
function wrap(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (test.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ---- ESCAPE FOR SVG ----
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---- SVG -> PNG ----
async function svgToPng(svg: string, outPath: string): Promise<void> {
  await sharp(Buffer.from(svg))
    .resize(W, H)
    .png({ compressionLevel: 8 })
    .toFile(outPath);
}

// ===================================================================
// TEMPLATE A: Group Quiz Promo
// "Are you a real [GROUP] fan?"
// Cream bg, mascot-default right side
// ===================================================================
function svgA(groupName: string): string {
  const groupSafe = esc(groupName);

  // Decide font size for group name based on length
  const gLen = groupName.length;
  const gFontSize = gLen <= 4 ? 160 : gLen <= 7 ? 130 : gLen <= 11 ? 100 : 80;
  const gY = gFontSize <= 100 ? 460 : 490;

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
<defs><style>${FONT_FACE}</style></defs>

<!-- background -->
<rect width="${W}" height="${H}" fill="${CREAM}"/>

<!-- top accent bar -->
<rect x="0" y="0" width="${W}" height="14" fill="${PINK}"/>

<!-- subtle bottom wave shape -->
<rect x="0" y="1380" width="${W}" height="120" fill="#F0EDE8"/>

<!-- mascot (bottom-right, large) -->
<image href="${MASCOT_DEFAULT_URI}" x="530" y="620" width="430" height="430" preserveAspectRatio="xMidYMid meet" opacity="0.97"/>

<!-- KICKER: kpopquiz -->
<text x="60" y="100" font-family="DM, sans-serif" font-size="22" font-weight="700" fill="${PINK}" letter-spacing="3">KPOPQUIZ.ORG</text>

<!-- "ARE YOU A" -->
<text x="60" y="230" font-family="DM, sans-serif" font-size="80" font-weight="800" fill="${DARK}">ARE YOU</text>
<text x="60" y="330" font-family="DM, sans-serif" font-size="80" font-weight="800" fill="${DARK}">A REAL</text>

<!-- GROUP NAME (pink, large) -->
<text x="60" y="${gY}" font-family="DM, sans-serif" font-size="${gFontSize}" font-weight="800" fill="${PINK}">${groupSafe}</text>

<!-- "FAN?" -->
<text x="60" y="590" font-family="DM, sans-serif" font-size="80" font-weight="800" fill="${DARK}">FAN?</text>

<!-- description text -->
<text x="60" y="800" font-family="DM, sans-serif" font-size="34" font-weight="400" fill="${GRAY}">Test your knowledge with</text>
<text x="60" y="846" font-family="DM, sans-serif" font-size="34" font-weight="400" fill="${GRAY}">fan-made quizzes. Free.</text>

<!-- divider -->
<rect x="60" y="920" width="400" height="2" fill="#E0DBD6"/>

<!-- stat pills -->
<rect x="60" y="950" width="160" height="44" rx="22" fill="#EDE8E4"/>
<text x="140" y="978" font-family="DM, sans-serif" font-size="22" font-weight="700" fill="${DARK}" text-anchor="middle">500+ Quizzes</text>

<rect x="235" y="950" width="160" height="44" rx="22" fill="#EDE8E4"/>
<text x="315" y="978" font-family="DM, sans-serif" font-size="22" font-weight="700" fill="${DARK}" text-anchor="middle">Free to Play</text>

<!-- CTA pill (large, pink) -->
<rect x="60" y="1050" width="560" height="90" rx="45" fill="${PINK}"/>
<text x="340" y="1104" font-family="DM, sans-serif" font-size="34" font-weight="700" fill="white" text-anchor="middle">Play free on kpopquiz.org</text>

<!-- bottom logo -->
<text x="60" y="1430" font-family="DM, sans-serif" font-size="40" font-weight="800" fill="${DARK}">kpop</text>
<text x="166" y="1430" font-family="DM, sans-serif" font-size="40" font-weight="800" fill="${PINK}">quiz</text>
<text x="60" y="1470" font-family="DM, sans-serif" font-size="20" font-weight="400" fill="${GRAY}">Made by fans, for fans</text>
</svg>`;
}

// ===================================================================
// TEMPLATE B: K-pop Fact / Trivia
// Dark bg, cream text, mascot-celebrate bottom-right
// ===================================================================
function svgB(fact: string, groupName: string): string {
  const lines = wrap(esc(fact), 30);
  const lineH = 74;
  const textStartY = 420;

  const textBlocks = lines
    .map((l, i) => `<text x="60" y="${textStartY + i * lineH}" font-family="DM, sans-serif" font-size="62" font-weight="700" fill="${CREAM}">${l}</text>`)
    .join('\n');

  // Attribution - use actual group name, not slug-derived
  const attrY = textStartY + lines.length * lineH + 40;
  const attrLabel = groupName ? `${esc(groupName)} Quiz` : 'kpopquiz.org';

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
<defs><style>${FONT_FACE}</style></defs>

<!-- dark background -->
<rect width="${W}" height="${H}" fill="${DARK}"/>

<!-- top pink accent bar -->
<rect x="0" y="0" width="${W}" height="14" fill="${PINK}"/>

<!-- decorative pink blob (top right) -->
<ellipse cx="900" cy="180" rx="200" ry="150" fill="${PINK}" opacity="0.12"/>

<!-- KICKER: K-POP FACT -->
<rect x="60" y="80" width="240" height="52" rx="26" fill="${PINK}"/>
<text x="180" y="114" font-family="DM, sans-serif" font-size="24" font-weight="700" fill="white" text-anchor="middle">K-POP FACT</text>

<!-- open quote mark -->
<text x="48" y="390" font-family="DM, sans-serif" font-size="160" font-weight="800" fill="${PINK}" opacity="0.3">"</text>

<!-- fact text -->
${textBlocks}

<!-- group attribution -->
<text x="60" y="${attrY}" font-family="DM, sans-serif" font-size="28" font-weight="400" fill="${PINK}" opacity="0.8">-- ${attrLabel}</text>

<!-- mascot celebrate -->
<image href="${MASCOT_CELEBRATE_URI}" x="570" y="1050" width="380" height="380" preserveAspectRatio="xMidYMid meet"/>

<!-- CTA pill -->
<rect x="60" y="1100" width="480" height="90" rx="45" fill="${PINK}"/>
<text x="300" y="1154" font-family="DM, sans-serif" font-size="32" font-weight="700" fill="white" text-anchor="middle">Quiz yourself - it's free</text>

<!-- bottom logo -->
<text x="60" y="1430" font-family="DM, sans-serif" font-size="40" font-weight="800" fill="${CREAM}">kpop</text>
<text x="166" y="1430" font-family="DM, sans-serif" font-size="40" font-weight="800" fill="${PINK}">quiz</text>
<text x="60" y="1472" font-family="DM, sans-serif" font-size="20" font-weight="400" fill="#6B5F5C">kpopquiz.org</text>
</svg>`;
}

// Scale VS name font size to fit within each half of the 1000px canvas.
// Each name has ~420px of usable horizontal space (with padding).
function vsFontSize(name: string): number {
  const charWidthRatio = 0.62; // DM Sans Bold uppercase approximation
  const maxWidth = 420;
  const ideal = Math.floor(maxWidth / (name.length * charWidthRatio));
  return Math.min(100, Math.max(40, ideal));
}

// ===================================================================
// TEMPLATE C: Comparison / Listicle
// Cream bg, two subjects VS, or listicle headline
// ===================================================================
function svgC(headline: string, isVs: boolean, leftName?: string, rightName?: string): string {
  const lines = wrap(esc(headline), 26);
  const lineH = 86;
  const textStartY = isVs ? 580 : 300;

  const headlineBlocks = lines
    .map((l, i) => `<text x="${W / 2}" y="${textStartY + i * lineH}" font-family="DM, sans-serif" font-size="76" font-weight="800" fill="${DARK}" text-anchor="middle">${l}</text>`)
    .join('\n');

  const vsBlock = isVs && leftName && rightName
    ? (() => {
        const lfs = vsFontSize(leftName);
        const rfs = vsFontSize(rightName);
        const nameY = 360 + Math.max(lfs, rfs);
        return `
<!-- vs block -->
<text x="220" y="${nameY}" font-family="DM, sans-serif" font-size="${lfs}" font-weight="800" fill="${PINK}" text-anchor="middle">${esc(leftName)}</text>
<rect x="440" y="${nameY - Math.max(lfs, rfs)}" width="3" height="${Math.max(lfs, rfs) + 20}" fill="${GRAY}" opacity="0.3"/>
<text x="500" y="${nameY - Math.round(Math.max(lfs, rfs) * 0.2)}" font-family="DM, sans-serif" font-size="44" font-weight="800" fill="${GRAY}" text-anchor="middle">VS</text>
<rect x="557" y="${nameY - Math.max(lfs, rfs)}" width="3" height="${Math.max(lfs, rfs) + 20}" fill="${GRAY}" opacity="0.3"/>
<text x="780" y="${nameY}" font-family="DM, sans-serif" font-size="${rfs}" font-weight="800" fill="${DARK}" text-anchor="middle">${esc(rightName)}</text>
`;
      })()
    : '';

  const kicker = isVs ? 'K-POP SHOWDOWN' : 'K-POP QUIZ';
  const ctaY = isVs ? 1100 : 900;

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
<defs><style>${FONT_FACE}</style></defs>

<!-- background -->
<rect width="${W}" height="${H}" fill="${CREAM}"/>

<!-- top accent bar -->
<rect x="0" y="0" width="${W}" height="14" fill="${PINK}"/>

<!-- decorative pink stripe (diagonal) -->
<polygon points="0,14 300,14 0,220" fill="${PINK}" opacity="0.08"/>

<!-- kicker pill -->
<rect x="${W / 2 - 140}" y="60" width="280" height="52" rx="26" fill="${PINK}"/>
<text x="${W / 2}" y="94" font-family="DM, sans-serif" font-size="22" font-weight="700" fill="white" text-anchor="middle">${kicker}</text>

${vsBlock}

<!-- headline -->
${headlineBlocks}

<!-- mascot (bottom right) -->
<image href="${MASCOT_DEFAULT_URI}" x="580" y="${ctaY + 120}" width="380" height="380" preserveAspectRatio="xMidYMid meet"/>

<!-- sub-text -->
<text x="${W / 2}" y="${ctaY - 60}" font-family="DM, sans-serif" font-size="32" font-weight="400" fill="${GRAY}" text-anchor="middle">Play free on kpopquiz.org</text>
<text x="${W / 2}" y="${ctaY - 20}" font-family="DM, sans-serif" font-size="32" font-weight="400" fill="${GRAY}" text-anchor="middle">and see how you compare</text>

<!-- CTA pill -->
<rect x="${W / 2 - 280}" y="${ctaY + 20}" width="560" height="90" rx="45" fill="${PINK}"/>
<text x="${W / 2}" y="${ctaY + 74}" font-family="DM, sans-serif" font-size="34" font-weight="700" fill="white" text-anchor="middle">Take the quiz - it's free</text>

<!-- bottom logo -->
<text x="60" y="1430" font-family="DM, sans-serif" font-size="40" font-weight="800" fill="${DARK}">kpop</text>
<text x="166" y="1430" font-family="DM, sans-serif" font-size="40" font-weight="800" fill="${PINK}">quiz</text>
<text x="60" y="1472" font-family="DM, sans-serif" font-size="20" font-weight="400" fill="${GRAY}">Made by fans, for fans</text>
</svg>`;
}

// ===================================================================
// MANIFEST ENTRY
// ===================================================================
interface PinEntry {
  filename: string;
  pin_type: 'A' | 'B' | 'C';
  pin_title: string;
  description: string;
  destination_url: string;
}

function makeUrl(path: string, type: 'group' | 'trivia' | 'comparison'): string {
  const campaign = type === 'group' ? 'group-quiz' : type === 'trivia' ? 'trivia-fact' : 'comparison';
  return `${SITE}${path}?utm_source=pinterest&utm_medium=pin&utm_campaign=${campaign}`;
}

// ===================================================================
// DB QUERIES
// ===================================================================
async function fetchGroups(supabase: ReturnType<typeof createClient>, limit: number) {
  const { data, error } = await supabase
    .from('groups')
    .select('id, name, slug, quiz_count')
    .gt('quiz_count', 0)
    .order('quiz_count', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`groups query failed: ${error.message}`);
  return (data ?? []) as Array<{ id: number; name: string; slug: string; quiz_count: number }>;
}

async function fetchFacts(supabase: ReturnType<typeof createClient>, limit: number) {
  // Pull quizzes with fun_fact fields from questions
  const { data, error } = await supabase
    .from('quizzes')
    .select('slug, group_id, questions, groups(name, slug)')
    .eq('status', 'published')
    .not('questions', 'is', null)
    .order('play_count', { ascending: false })
    .limit(300);
  if (error) throw new Error(`facts query failed: ${error.message}`);

  const facts: Array<{ fact: string; groupSlug: string; groupName: string; quizSlug: string }> = [];
  const seen = new Set<string>();

  for (const quiz of data ?? []) {
    const questions = (Array.isArray(quiz.questions) ? quiz.questions : []) as Array<{ fun_fact?: string }>;
    const group = (quiz.groups as { name: string; slug: string } | null);
    const gSlug = group?.slug ?? quiz.slug;
    const gName = group?.name ?? '';

    for (const q of questions) {
      const fact = q.fun_fact?.trim();
      if (!fact || fact.length < 30 || fact.length > 200) continue;
      // No em/en dashes
      const clean = fact.replace(/[--]/g, '-').replace(/[""]/g, '"');
      const key = clean.toLowerCase().slice(0, 40);
      if (seen.has(key)) continue;
      seen.add(key);
      facts.push({ fact: clean, groupSlug: gSlug, groupName: gName, quizSlug: quiz.slug });
      if (facts.length >= limit) break;
    }
    if (facts.length >= limit) break;
  }
  return facts;
}

// ===================================================================
// CURATED COMPARISON LIST (40 items)
// ===================================================================
const COMPARISONS: Array<{
  headline: string;
  isVs: boolean;
  left?: string;
  right?: string;
  slug: string;
  path: string;
}> = [
  { headline: 'BTS vs BLACKPINK', isVs: true, left: 'BTS', right: 'BLACKPINK', slug: 'bts-vs-blackpink', path: '/kpop-true-or-false' },
  { headline: 'aespa vs NewJeans', isVs: true, left: 'aespa', right: 'NewJeans', slug: 'aespa-vs-newjeans', path: '/easy-kpop-quizzes' },
  { headline: 'Stray Kids vs ATEEZ', isVs: true, left: 'SKZ', right: 'ATEEZ', slug: 'skz-vs-ateez', path: '/hard-kpop-quizzes' },
  { headline: 'TWICE vs IVE', isVs: true, left: 'TWICE', right: 'IVE', slug: 'twice-vs-ive', path: '/easy-kpop-quizzes' },
  { headline: 'EXO vs BTS: who do fans know better?', isVs: true, left: 'EXO', right: 'BTS', slug: 'exo-vs-bts', path: '/hard-kpop-quizzes' },
  { headline: 'SEVENTEEN vs MONSTA X', isVs: true, left: 'SVT', right: 'MX', slug: 'svt-vs-mx', path: '/quizzes' },
  { headline: 'Girl groups vs Boy groups', isVs: true, left: 'Girls', right: 'Boys', slug: 'girl-vs-boy', path: '/quizzes' },
  { headline: '4th gen vs 3rd gen K-pop', isVs: true, left: '4th gen', right: '3rd gen', slug: '4gen-vs-3gen', path: '/quizzes' },
  { headline: '10 Hardest K-pop Quizzes Only Superfans Pass', isVs: false, slug: 'hardest-quizzes', path: '/hard-kpop-quizzes' },
  { headline: 'Best K-pop Blind Test Online in 2026', isVs: false, slug: 'best-blindtest', path: '/blindtest' },
  { headline: 'Can You Name All BTS Members?', isVs: false, slug: 'name-all-bts', path: '/games/name-all' },
  { headline: 'The Ultimate BLACKPINK Quiz', isVs: false, slug: 'ultimate-blackpink', path: '/hard-kpop-quizzes' },
  { headline: 'How Well Do You Know Stray Kids?', isVs: false, slug: 'know-skz', path: '/guess-the-kpop-idol' },
  { headline: '10 K-pop Facts That Will Blow Your Mind', isVs: false, slug: 'kpop-facts', path: '/trivia' },
  { headline: 'Guess the K-pop Idol from 3 Clues', isVs: false, slug: 'guess-idol-clues', path: '/guess-the-kpop-idol' },
  { headline: 'K-pop True or False: Harder Than You Think', isVs: false, slug: 'true-false-hard', path: '/kpop-true-or-false' },
  { headline: 'Which K-pop Group Fits Your Personality?', isVs: false, slug: 'group-personality', path: '/quizzes' },
  { headline: '2026 K-pop Comebacks: The Quiz', isVs: false, slug: '2026-comebacks', path: '/kpop-quiz-2026' },
  { headline: 'aespa vs ITZY: 4th gen showdown', isVs: true, left: 'aespa', right: 'ITZY', slug: 'aespa-vs-itzy', path: '/easy-kpop-quizzes' },
  { headline: 'BLACKPINK vs TWICE: girl group legends', isVs: true, left: 'BP', right: 'TWICE', slug: 'bp-vs-twice', path: '/hard-kpop-quizzes' },
  { headline: 'Only Real Fans Score 10/10 on This Quiz', isVs: false, slug: 'real-fans-10', path: '/hard-kpop-quizzes' },
  { headline: 'The Hardest BTS Quiz on the Internet', isVs: false, slug: 'hardest-bts', path: '/hard-kpop-quizzes' },
  { headline: '1st gen vs 5th gen K-pop Knowledge', isVs: true, left: '1st gen', right: '5th gen', slug: '1gen-vs-5gen', path: '/quizzes' },
  { headline: 'NCT vs EXO: SM Entertainment showdown', isVs: true, left: 'NCT', right: 'EXO', slug: 'nct-vs-exo', path: '/quizzes' },
  { headline: 'Can You Pass This K-pop 2026 Quiz?', isVs: false, slug: '2026-kpop-pass', path: '/kpop-quiz-2026' },
  { headline: 'IVE vs LE SSERAFIM: who do fans know better?', isVs: true, left: 'IVE', right: 'LSF', slug: 'ive-vs-lsf', path: '/easy-kpop-quizzes' },
  { headline: 'MONSTA X vs ATEEZ: dark concept kings', isVs: true, left: 'MX', right: 'ATEEZ', slug: 'mx-vs-ateez', path: '/quizzes' },
  { headline: 'K-pop Leaderboard: Top Fans This Week', isVs: false, slug: 'top-fans-week', path: '/leaderboard' },
  { headline: 'How Many K-pop Songs Can You Guess?', isVs: false, slug: 'guess-songs', path: '/blindtest' },
  { headline: 'SEVENTEEN quiz: 13 members, can you name all?', isVs: false, slug: 'seventeen-all', path: '/games/name-all' },
  { headline: 'K-pop Blind Test: 10 Songs, 10 Seconds Each', isVs: false, slug: 'blindtest-10', path: '/blindtest' },
  { headline: 'The Easiest K-pop Quiz vs The Hardest', isVs: true, left: 'Easy', right: 'Hard', slug: 'easy-vs-hard', path: '/easy-kpop-quizzes' },
  { headline: 'NewJeans vs FIFTY FIFTY: new gen queens', isVs: true, left: 'NJ', right: 'FF', slug: 'nj-vs-ff', path: '/easy-kpop-quizzes' },
  { headline: 'BIGBANG vs BTS: who shaped K-pop more?', isVs: true, left: 'BB', right: 'BTS', slug: 'bb-vs-bts', path: '/hard-kpop-quizzes' },
  { headline: 'Quiz: Which K-pop Era Do You Belong To?', isVs: false, slug: 'kpop-era-quiz', path: '/quizzes' },
  { headline: 'G-DRAGON vs Jimin: solo king showdown', isVs: true, left: 'GD', right: 'Jimin', slug: 'gd-vs-jimin', path: '/quizzes' },
  { headline: 'Top 10 K-pop Quiz Questions Fans Always Get Wrong', isVs: false, slug: 'always-get-wrong', path: '/hard-kpop-quizzes' },
  { headline: 'Weeekly vs tripleS: niche fan quiz', isVs: true, left: 'Weeekly', right: 'tripleS', slug: 'weeekly-vs-triples', path: '/quizzes' },
  { headline: 'ENHYPEN vs TXT: 4th gen boy group rivalry', isVs: true, left: 'ENH', right: 'TXT', slug: 'enh-vs-txt', path: '/quizzes' },
  { headline: 'K-pop Fan Rankings: Where Do You Stand?', isVs: false, slug: 'fan-rankings', path: '/leaderboard' },
];

// ===================================================================
// PIN DESCRIPTIONS (no em dashes)
// ===================================================================
function descA(groupName: string): string {
  return `Think you know everything about ${groupName}? Test your fan knowledge with free quiz games made by real ${groupName} fans. Play hundreds of quizzes, earn XP, and climb the K-pop leaderboard on kpopquiz.org. No signup needed! #kpop #${groupName.toLowerCase().replace(/\s+/g, '')} #kpopquiz #kpopfan #kpopgame`;
}

function descB(fact: string): string {
  return `${fact} Discover more amazing K-pop facts and test your knowledge with free fan-made quizzes on kpopquiz.org. Play blind test, true or false, and hundreds of quizzes - no signup needed! #kpop #kpopfact #kpoptrivia #kpopquiz #kpopfan`;
}

function descC(headline: string, path: string): string {
  const page = path.includes('blindtest') ? 'blind test'
    : path.includes('hard') ? 'hardest quiz'
    : path.includes('easy') ? 'easiest quiz'
    : path.includes('leaderboard') ? 'leaderboard'
    : 'quiz';
  return `${headline} - take the ${page} on kpopquiz.org and find out! Free K-pop games and quizzes made by fans. Play blind test, true or false, guess the idol, and more. No signup, 100% free. #kpop #kpopquiz #kpopgame #kpopfan #kpoptrivia`;
}

// ===================================================================
// MAIN
// ===================================================================
async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const manifest: PinEntry[] = [];

  // ---- SAMPLE ONLY: one of each template ----
  if (SAMPLE_ONLY) {
    console.log('SAMPLE MODE: generating 3 sample PNGs...\n');

    // Sample A: BTS
    const sampleA = 'BTS';
    const fnA = 'A-sample-bts.png';
    await svgToPng(svgA(sampleA), join(OUT_DIR, fnA));
    console.log(`  [A] ${fnA}`);

    // Sample B: a real fact from DB (fallback if DB unreachable)
    let facts: Array<{ fact: string; groupSlug: string; groupName: string; quizSlug: string }> = [];
    try { facts = await fetchFacts(supabase, 5); } catch (e) { console.warn('  DB unreachable, using fallback fact'); }
    const fact = facts[0] ?? { fact: 'BTS holds the record for the most-streamed K-pop album on Spotify with over 3 billion streams.', groupSlug: 'bts', groupName: 'BTS', quizSlug: 'bts-quiz' };
    const fnB = 'B-sample-fact.png';
    await svgToPng(svgB(fact.fact, fact.groupName), join(OUT_DIR, fnB));
    console.log(`  [B] ${fnB}  fact: "${fact.fact.slice(0, 60)}..."`);

    // Sample C: BTS vs BLACKPINK
    const comp = COMPARISONS[0];
    const fnC = 'C-sample-vs.png';
    await svgToPng(svgC(comp.headline, comp.isVs, comp.left, comp.right), join(OUT_DIR, fnC));
    console.log(`  [C] ${fnC}  headline: "${comp.headline}"`);

    console.log(`\nSample PNGs written to: ${OUT_DIR}/`);
    console.log('Review them, then run without --sample to generate all 200.');
    return;
  }

  // ---- FULL RUN ----
  console.log('Fetching data from DB...');
  const [groups, facts] = await Promise.all([
    fetchGroups(supabase, 120),
    fetchFacts(supabase, 50),
  ]);

  console.log(`  Groups: ${groups.length}`);
  console.log(`  Facts: ${facts.length}`);

  // --- TYPE A: group promos ---
  for (const g of groups.slice(0, 120)) {
    const fn = `A-${g.slug}.png`;
    await svgToPng(svgA(g.name), join(OUT_DIR, fn));
    manifest.push({
      filename: fn,
      pin_type: 'A',
      pin_title: `Are you a real ${g.name} fan? Take the quiz`,
      description: descA(g.name),
      destination_url: makeUrl(`/${g.slug}-quiz`, 'group'),
    });
    process.stdout.write(`  [A] ${fn}\n`);
  }

  // --- TYPE B: trivia/fact pins ---
  for (const f of facts.slice(0, 40)) {
    const fn = `B-${f.groupSlug}-${facts.indexOf(f)}.png`;
    await svgToPng(svgB(f.fact, f.groupName), join(OUT_DIR, fn));
    manifest.push({
      filename: fn,
      pin_type: 'B',
      pin_title: `K-pop fact: ${f.fact.slice(0, 80)}`.replace(/[--]/g, '-'),
      description: descB(f.fact),
      destination_url: makeUrl(`/${f.groupSlug}-quiz`, 'trivia'),
    });
    process.stdout.write(`  [B] ${fn}\n`);
  }

  // --- TYPE C: comparison/listicle ---
  for (const c of COMPARISONS.slice(0, 40)) {
    const fn = `C-${c.slug}.png`;
    await svgToPng(svgC(c.headline, c.isVs, c.left, c.right), join(OUT_DIR, fn));
    manifest.push({
      filename: fn,
      pin_type: 'C',
      pin_title: c.headline.slice(0, 100),
      description: descC(c.headline, c.path),
      destination_url: makeUrl(c.path, 'comparison'),
    });
    process.stdout.write(`  [C] ${fn}\n`);
  }

  // --- MANIFEST ---
  const csvLines = [
    'filename,pin_type,pin_title,description,destination_url',
    ...manifest.map((m) =>
      `"${m.filename}","${m.pin_type}","${m.pin_title.replace(/"/g, '""')}","${m.description.replace(/"/g, '""')}","${m.destination_url}"`
    ),
  ];
  writeFileSync(join(OUT_DIR, 'manifest.csv'), csvLines.join('\n'), 'utf-8');
  writeFileSync(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

  console.log(`\nDone. ${manifest.length} pins in ${OUT_DIR}/`);
  console.log(`Manifest: ${OUT_DIR}/manifest.csv`);
}

main().catch((err) => {
  console.error('generate-pins failed:', err);
  process.exit(1);
});
