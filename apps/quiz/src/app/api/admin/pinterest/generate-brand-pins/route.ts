import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import sharp from 'sharp';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// ---- BRAND CONSTANTS ----
const W = 1000;
const H = 1500;
const PINK = '#E8457A';
const CREAM = '#FAF8F5';
const DARK = '#1A1816';
const GRAY = '#9B8B86';

// ---- ASSET LOADING ----
// Reads from public/ which is bundled in Next.js deployments.
function loadPublicB64(relPath: string): string {
  const full = join(process.cwd(), 'public', relPath);
  if (!existsSync(full)) throw new Error(`Asset not found: ${full}`);
  return readFileSync(full).toString('base64');
}

function buildFontFace(): string {
  // Use Pretendard (available in public/fonts/). DM Sans lives in scripts/fonts/ (gitignored).
  const dmDir = join(process.cwd(), '..', '..', 'scripts', 'fonts');
  const hasDm = existsSync(join(dmDir, 'dm-sans-400.woff2'));

  function fontUri(weight: 400 | 700 | 800): string {
    if (hasDm) {
      const p = join(dmDir, `dm-sans-${weight}.woff2`);
      return `data:font/woff2;base64,${readFileSync(p).toString('base64')}`;
    }
    const reg = join(process.cwd(), 'public/fonts/Pretendard-Regular-latin.woff2');
    const med = join(process.cwd(), 'public/fonts/Pretendard-Medium-latin.woff2');
    return `data:font/woff2;base64,${readFileSync(weight === 400 ? reg : med).toString('base64')}`;
  }

  return `
    @font-face { font-family: 'DM'; font-weight: 400; src: url('${fontUri(400)}') format('woff2'); }
    @font-face { font-family: 'DM'; font-weight: 700; src: url('${fontUri(700)}') format('woff2'); }
    @font-face { font-family: 'DM'; font-weight: 800; src: url('${fontUri(800)}') format('woff2'); }
  `;
}

// ---- TEXT HELPERS ----
function wrap(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (test.length > maxChars && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function vsFontSize(name: string): number {
  const ideal = Math.floor(420 / (name.length * 0.62));
  return Math.min(100, Math.max(40, ideal));
}

// ---- SVG TEMPLATES ----
function svgA(groupName: string, mascotDefaultUri: string, fontFace: string): string {
  const groupSafe = esc(groupName);
  const gLen = groupName.length;
  const gFontSize = gLen <= 4 ? 160 : gLen <= 7 ? 130 : gLen <= 11 ? 100 : 80;
  const gY = gFontSize <= 100 ? 460 : 490;

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
<defs><style>${fontFace}</style></defs>
<rect width="${W}" height="${H}" fill="${CREAM}"/>
<rect x="0" y="0" width="${W}" height="14" fill="${PINK}"/>
<rect x="0" y="1380" width="${W}" height="120" fill="#F0EDE8"/>
<image href="${mascotDefaultUri}" x="530" y="620" width="430" height="430" preserveAspectRatio="xMidYMid meet" opacity="0.97"/>
<text x="60" y="100" font-family="DM, sans-serif" font-size="22" font-weight="700" fill="${PINK}" letter-spacing="3">KPOPQUIZ.ORG</text>
<text x="60" y="230" font-family="DM, sans-serif" font-size="80" font-weight="800" fill="${DARK}">ARE YOU</text>
<text x="60" y="330" font-family="DM, sans-serif" font-size="80" font-weight="800" fill="${DARK}">A REAL</text>
<text x="60" y="${gY}" font-family="DM, sans-serif" font-size="${gFontSize}" font-weight="800" fill="${PINK}">${groupSafe}</text>
<text x="60" y="590" font-family="DM, sans-serif" font-size="80" font-weight="800" fill="${DARK}">FAN?</text>
<text x="60" y="800" font-family="DM, sans-serif" font-size="34" font-weight="400" fill="${GRAY}">Test your knowledge with</text>
<text x="60" y="846" font-family="DM, sans-serif" font-size="34" font-weight="400" fill="${GRAY}">fan-made quizzes. Free.</text>
<rect x="60" y="920" width="400" height="2" fill="#E0DBD6"/>
<rect x="60" y="950" width="160" height="44" rx="22" fill="#EDE8E4"/>
<text x="140" y="978" font-family="DM, sans-serif" font-size="22" font-weight="700" fill="${DARK}" text-anchor="middle">500+ Quizzes</text>
<rect x="235" y="950" width="160" height="44" rx="22" fill="#EDE8E4"/>
<text x="315" y="978" font-family="DM, sans-serif" font-size="22" font-weight="700" fill="${DARK}" text-anchor="middle">Free to Play</text>
<rect x="60" y="1050" width="560" height="90" rx="45" fill="${PINK}"/>
<text x="340" y="1104" font-family="DM, sans-serif" font-size="34" font-weight="700" fill="white" text-anchor="middle">Play free on kpopquiz.org</text>
<text x="60" y="1430" font-family="DM, sans-serif" font-size="40" font-weight="800" fill="${DARK}">kpop</text>
<text x="166" y="1430" font-family="DM, sans-serif" font-size="40" font-weight="800" fill="${PINK}">quiz</text>
<text x="60" y="1470" font-family="DM, sans-serif" font-size="20" font-weight="400" fill="${GRAY}">Made by fans, for fans</text>
</svg>`;
}

function svgB(fact: string, groupName: string, mascotCelebrateUri: string, fontFace: string): string {
  const lines = wrap(esc(fact), 30);
  const lineH = 74;
  const textStartY = 420;
  const textBlocks = lines
    .map((l, i) => `<text x="60" y="${textStartY + i * lineH}" font-family="DM, sans-serif" font-size="62" font-weight="700" fill="${CREAM}">${l}</text>`)
    .join('\n');
  const attrY = textStartY + lines.length * lineH + 40;
  const attrLabel = groupName ? `${esc(groupName)} Quiz` : 'kpopquiz.org';

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
<defs><style>${fontFace}</style></defs>
<rect width="${W}" height="${H}" fill="${DARK}"/>
<rect x="0" y="0" width="${W}" height="14" fill="${PINK}"/>
<ellipse cx="900" cy="180" rx="200" ry="150" fill="${PINK}" opacity="0.12"/>
<rect x="60" y="80" width="240" height="52" rx="26" fill="${PINK}"/>
<text x="180" y="114" font-family="DM, sans-serif" font-size="24" font-weight="700" fill="white" text-anchor="middle">K-POP FACT</text>
<text x="48" y="390" font-family="DM, sans-serif" font-size="160" font-weight="800" fill="${PINK}" opacity="0.3">"</text>
${textBlocks}
<text x="60" y="${attrY}" font-family="DM, sans-serif" font-size="28" font-weight="400" fill="${PINK}" opacity="0.8">-- ${attrLabel}</text>
<image href="${mascotCelebrateUri}" x="570" y="1050" width="380" height="380" preserveAspectRatio="xMidYMid meet"/>
<rect x="60" y="1100" width="480" height="90" rx="45" fill="${PINK}"/>
<text x="300" y="1154" font-family="DM, sans-serif" font-size="32" font-weight="700" fill="white" text-anchor="middle">Quiz yourself - it's free</text>
<text x="60" y="1430" font-family="DM, sans-serif" font-size="40" font-weight="800" fill="${CREAM}">kpop</text>
<text x="166" y="1430" font-family="DM, sans-serif" font-size="40" font-weight="800" fill="${PINK}">quiz</text>
<text x="60" y="1472" font-family="DM, sans-serif" font-size="20" font-weight="400" fill="#6B5F5C">kpopquiz.org</text>
</svg>`;
}

function svgC(
  headline: string,
  isVs: boolean,
  leftName: string | undefined,
  rightName: string | undefined,
  mascotDefaultUri: string,
  fontFace: string,
): string {
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
        const divH = Math.max(lfs, rfs) + 20;
        const divTop = nameY - Math.max(lfs, rfs);
        return `
<text x="220" y="${nameY}" font-family="DM, sans-serif" font-size="${lfs}" font-weight="800" fill="${PINK}" text-anchor="middle">${esc(leftName)}</text>
<rect x="440" y="${divTop}" width="3" height="${divH}" fill="${GRAY}" opacity="0.3"/>
<text x="500" y="${nameY - Math.round(Math.max(lfs, rfs) * 0.2)}" font-family="DM, sans-serif" font-size="44" font-weight="800" fill="${GRAY}" text-anchor="middle">VS</text>
<rect x="557" y="${divTop}" width="3" height="${divH}" fill="${GRAY}" opacity="0.3"/>
<text x="780" y="${nameY}" font-family="DM, sans-serif" font-size="${rfs}" font-weight="800" fill="${DARK}" text-anchor="middle">${esc(rightName)}</text>`;
      })()
    : '';

  const kicker = isVs ? 'K-POP SHOWDOWN' : 'K-POP QUIZ';
  const ctaY = isVs ? 1100 : 900;

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
<defs><style>${fontFace}</style></defs>
<rect width="${W}" height="${H}" fill="${CREAM}"/>
<rect x="0" y="0" width="${W}" height="14" fill="${PINK}"/>
<polygon points="0,14 300,14 0,220" fill="${PINK}" opacity="0.08"/>
<rect x="${W / 2 - 140}" y="60" width="280" height="52" rx="26" fill="${PINK}"/>
<text x="${W / 2}" y="94" font-family="DM, sans-serif" font-size="22" font-weight="700" fill="white" text-anchor="middle">${kicker}</text>
${vsBlock}
${headlineBlocks}
<image href="${mascotDefaultUri}" x="580" y="${ctaY + 120}" width="380" height="380" preserveAspectRatio="xMidYMid meet"/>
<text x="${W / 2}" y="${ctaY - 60}" font-family="DM, sans-serif" font-size="32" font-weight="400" fill="${GRAY}" text-anchor="middle">Play free on kpopquiz.org</text>
<text x="${W / 2}" y="${ctaY - 20}" font-family="DM, sans-serif" font-size="32" font-weight="400" fill="${GRAY}" text-anchor="middle">and see how you compare</text>
<rect x="${W / 2 - 280}" y="${ctaY + 20}" width="560" height="90" rx="45" fill="${PINK}"/>
<text x="${W / 2}" y="${ctaY + 74}" font-family="DM, sans-serif" font-size="34" font-weight="700" fill="white" text-anchor="middle">Take the quiz - it's free</text>
<text x="60" y="1430" font-family="DM, sans-serif" font-size="40" font-weight="800" fill="${DARK}">kpop</text>
<text x="166" y="1430" font-family="DM, sans-serif" font-size="40" font-weight="800" fill="${PINK}">quiz</text>
<text x="60" y="1472" font-family="DM, sans-serif" font-size="20" font-weight="400" fill="${GRAY}">Made by fans, for fans</text>
</svg>`;
}

// ---- RASTERIZE ----
async function svgToPng(svg: string): Promise<Buffer> {
  return sharp(Buffer.from(svg)).resize(W, H).png({ compressionLevel: 8 }).toBuffer();
}

// ---- DB QUERIES ----
async function fetchGroups(supabase: ReturnType<typeof createServiceRoleClient>, limit: number) {
  const { data, error } = await supabase
    .from('groups')
    .select('id, name, slug, quiz_count')
    .gt('quiz_count', 0)
    .order('quiz_count', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`groups: ${error.message}`);
  return (data ?? []) as Array<{ id: number; name: string; slug: string; quiz_count: number }>;
}

async function fetchFacts(supabase: ReturnType<typeof createServiceRoleClient>, limit: number) {
  const { data, error } = await supabase
    .from('quizzes')
    .select('slug, group_id, questions, groups(name, slug)')
    .eq('status', 'published')
    .not('questions', 'is', null)
    .order('play_count', { ascending: false })
    .limit(300);
  if (error) throw new Error(`facts: ${error.message}`);

  const facts: Array<{ fact: string; groupSlug: string; groupName: string }> = [];
  const seen = new Set<string>();

  for (const quiz of data ?? []) {
    const questions = (Array.isArray(quiz.questions) ? quiz.questions : []) as Array<{ fun_fact?: string }>;
    const group = (quiz.groups as unknown as { name: string; slug: string } | null);
    const gSlug = group?.slug ?? quiz.slug;
    const gName = group?.name ?? '';

    for (const q of questions) {
      const fact = q.fun_fact?.trim();
      if (!fact || fact.length < 30 || fact.length > 200) continue;
      const clean = fact.replace(/[--]/g, '-').replace(/[""]/g, '"');
      const key = clean.toLowerCase().slice(0, 40);
      if (seen.has(key)) continue;
      seen.add(key);
      facts.push({ fact: clean, groupSlug: gSlug, groupName: gName });
      if (facts.length >= limit) break;
    }
    if (facts.length >= limit) break;
  }
  return facts;
}

// ---- COMPARISONS LIST ----
const COMPARISONS: Array<{
  headline: string; isVs: boolean; left?: string; right?: string; slug: string; path: string;
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

const SITE = 'kpopquiz.org';
function makeUrl(path: string, type: string): string {
  return `${SITE}${path}?utm_source=pinterest&utm_medium=pin&utm_campaign=${type}`;
}

// ---- PIN DESCRIPTIONS ----
function descA(groupName: string): string {
  return `Think you know everything about ${groupName}? Test your fan knowledge with free quiz games made by real ${groupName} fans. Play hundreds of quizzes, earn XP, and climb the K-pop leaderboard on kpopquiz.org. No signup needed! #kpop #${groupName.toLowerCase().replace(/\s+/g, '')} #kpopquiz`;
}
function descB(fact: string): string {
  return `${fact} Discover more amazing K-pop facts and test your knowledge with free fan-made quizzes on kpopquiz.org. Play blind test, true or false, and hundreds of quizzes - no signup needed! #kpop #kpopfact #kpoptrivia`;
}
function descC(headline: string, path: string): string {
  const page = path.includes('blindtest') ? 'blind test' : path.includes('hard') ? 'hardest quiz' : path.includes('easy') ? 'easiest quiz' : 'quiz';
  return `${headline} - take the ${page} on kpopquiz.org and find out! Free K-pop games and quizzes made by fans. No signup, 100% free. #kpop #kpopquiz`;
}

// ---- MANIFEST ENTRY TYPE ----
interface ManifestEntry {
  filename: string;
  pin_type: 'A' | 'B' | 'C';
  pin_title: string;
  description: string;
  destination_url: string;
}

// ---- HANDLER ----
export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { mode } = (await req.json()) as { mode: 'sample' | 'full' };
  const db = createServiceRoleClient();

  // Load assets once
  const mascotDefaultUri = `data:image/png;base64,${loadPublicB64('mascot/mascot-default.png')}`;
  const mascotCelebrateUri = `data:image/png;base64,${loadPublicB64('mascot/mascot-celebrate.png')}`;
  const fontFace = buildFontFace();

  // ---- SAMPLE MODE: 3 PNGs returned as base64 ----
  if (mode === 'sample') {
    let factItem = { fact: 'BTS holds the record for the most-streamed K-pop album on Spotify with over 3 billion streams.', groupName: 'BTS', groupSlug: 'bts' };
    try {
      const facts = await fetchFacts(db, 5);
      if (facts[0]) factItem = facts[0];
    } catch { /* fallback to hardcoded above */ }

    const [pngA, pngB, pngC] = await Promise.all([
      svgToPng(svgA('BTS', mascotDefaultUri, fontFace)),
      svgToPng(svgB(factItem.fact, factItem.groupName, mascotCelebrateUri, fontFace)),
      svgToPng(svgC(COMPARISONS[0]!.headline, COMPARISONS[0]!.isVs, COMPARISONS[0]!.left, COMPARISONS[0]!.right, mascotDefaultUri, fontFace)),
    ]);

    return NextResponse.json({
      pins: [
        { filename: 'A-sample-bts.png', base64: pngA.toString('base64'), meta: { type: 'A', group: 'BTS' } },
        { filename: 'B-sample-fact.png', base64: pngB.toString('base64'), meta: { type: 'B', fact: factItem.fact.slice(0, 80) } },
        { filename: 'C-sample-vs.png', base64: pngC.toString('base64'), meta: { type: 'C', headline: COMPARISONS[0]!.headline } },
      ],
    });
  }

  // ---- FULL MODE: generate all PNGs, zip, return binary ----
  if (mode === 'full') {
    const [groups, facts] = await Promise.all([
      fetchGroups(db, 120),
      fetchFacts(db, 50),
    ]);

    const tmpDir = `/tmp/kpopquiz-brand-pins-${Date.now()}`;
    mkdirSync(tmpDir, { recursive: true });
    const manifest: ManifestEntry[] = [];

    // Type A
    for (const g of groups.slice(0, 120)) {
      const fn = `A-${g.slug}.png`;
      const buf = await svgToPng(svgA(g.name, mascotDefaultUri, fontFace));
      writeFileSync(join(tmpDir, fn), buf);
      manifest.push({
        filename: fn, pin_type: 'A',
        pin_title: `Are you a real ${g.name} fan? Take the quiz`,
        description: descA(g.name),
        destination_url: makeUrl(`/${g.slug}-quiz`, 'group-quiz'),
      });
    }

    // Type B
    for (let i = 0; i < Math.min(facts.length, 40); i++) {
      const f = facts[i]!;
      const fn = `B-${f.groupSlug}-${i}.png`;
      const buf = await svgToPng(svgB(f.fact, f.groupName, mascotCelebrateUri, fontFace));
      writeFileSync(join(tmpDir, fn), buf);
      manifest.push({
        filename: fn, pin_type: 'B',
        pin_title: `K-pop fact: ${f.fact.slice(0, 80)}`.replace(/--/g, '-'),
        description: descB(f.fact),
        destination_url: makeUrl(`/${f.groupSlug}-quiz`, 'trivia-fact'),
      });
    }

    // Type C
    for (const c of COMPARISONS.slice(0, 40)) {
      const fn = `C-${c.slug}.png`;
      const buf = await svgToPng(svgC(c.headline, c.isVs, c.left, c.right, mascotDefaultUri, fontFace));
      writeFileSync(join(tmpDir, fn), buf);
      manifest.push({
        filename: fn, pin_type: 'C',
        pin_title: c.headline.slice(0, 100),
        description: descC(c.headline, c.path),
        destination_url: makeUrl(c.path, 'comparison'),
      });
    }

    // Write manifest files
    const csvLines = [
      'filename,pin_type,pin_title,description,destination_url',
      ...manifest.map((m) =>
        `"${m.filename}","${m.pin_type}","${m.pin_title.replace(/"/g, '""')}","${m.description.replace(/"/g, '""')}","${m.destination_url}"`
      ),
    ];
    writeFileSync(join(tmpDir, 'manifest.csv'), csvLines.join('\n'), 'utf-8');
    writeFileSync(join(tmpDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

    // Zip and return
    const zipPath = `${tmpDir}.zip`;
    try {
      execSync(`zip -j "${zipPath}" "${tmpDir}"/*.png "${tmpDir}"/manifest.csv "${tmpDir}"/manifest.json`, { timeout: 120000 });
      const zipBuf = readFileSync(zipPath);
      return new NextResponse(zipBuf, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="kpopquiz-brand-pins.zip"`,
          'Content-Length': String(zipBuf.length),
        },
      });
    } catch {
      // zip not available; return manifest + count only
      return NextResponse.json({ count: manifest.length, manifest, error: 'zip unavailable; files at ' + tmpDir });
    }
  }

  return NextResponse.json({ error: 'invalid mode' }, { status: 400 });
}
