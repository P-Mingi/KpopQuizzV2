import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { ImageResponse } from '@vercel/og';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// ---- BRAND CONSTANTS ----
const PINTEREST_BOARD = 'K-pop Quiz';
const SITE_URL = 'https://kpopquiz.org';
const STORAGE_BUCKET = 'pinterest-brand-pins';
const W = 1000;
const H = 1500;
const PINK = '#E8457A';
const CREAM = '#FAF8F5';
const DARK = '#1A1816';
const GRAY = '#9B8B86';

// ---- FONT LOADING ----
function loadFonts(): Array<{ name: string; data: ArrayBuffer; weight: 400 | 700 | 800; style: 'normal' }> {
  const publicFonts = join(process.cwd(), 'public', 'fonts');
  const dm400 = join(publicFonts, 'dm-sans-400.ttf');
  const dm700 = join(publicFonts, 'dm-sans-700.ttf');
  const dm800 = join(publicFonts, 'dm-sans-800.ttf');

  if (!existsSync(dm400)) throw new Error('DM Sans TTF not found — expected at public/fonts/dm-sans-400.ttf');

  return [
    { name: 'DM', data: readFileSync(dm400).buffer as ArrayBuffer, weight: 400, style: 'normal' },
    { name: 'DM', data: readFileSync(dm700).buffer as ArrayBuffer, weight: 700, style: 'normal' },
    { name: 'DM', data: readFileSync(dm800).buffer as ArrayBuffer, weight: 800, style: 'normal' },
  ];
}

// ---- ASSET LOADING ----
function loadMascotUri(name: 'mascot-default' | 'mascot-celebrate'): string {
  const p = join(process.cwd(), 'public', 'mascot', `${name}.png`);
  return `data:image/png;base64,${readFileSync(p).toString('base64')}`;
}

// ---- FONT SIZE HELPERS ----
function groupFontSize(name: string): number {
  const l = name.length;
  return l <= 4 ? 160 : l <= 7 ? 130 : l <= 11 ? 100 : 80;
}

function vsFontSize(name: string): number {
  const ideal = Math.floor(420 / (name.length * 0.62));
  return Math.min(100, Math.max(40, ideal));
}

// ---- TEXT WRAP ----
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

const fontFamily = 'DM, sans-serif';

// ---- TEMPLATE A: Group Quiz Promo ----
function TemplateA({ groupName, mascotUri }: { groupName: string; mascotUri: string }) {
  const gSize = groupFontSize(groupName);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: W, height: H, backgroundColor: CREAM, position: 'relative', fontFamily }}>
      <div style={{ width: W, height: 14, backgroundColor: PINK }} />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mascotUri} alt="" width={400} height={400} style={{ position: 'absolute', right: 20, top: 620, objectFit: 'contain' }} />

      <div style={{ display: 'flex', flexDirection: 'column', padding: '36px 60px 0', flex: 1 }}>
        <div style={{ display: 'flex', fontSize: 22, fontWeight: 700, color: PINK, letterSpacing: 3 }}>KPOPQUIZ.ORG</div>

        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 60 }}>
          <div style={{ display: 'flex', fontSize: 80, fontWeight: 800, color: DARK, lineHeight: 1.1 }}>ARE YOU</div>
          <div style={{ display: 'flex', fontSize: 80, fontWeight: 800, color: DARK, lineHeight: 1.1 }}>A REAL</div>
          <div style={{ display: 'flex', fontSize: gSize, fontWeight: 800, color: PINK, lineHeight: 1.05 }}>{groupName}</div>
          <div style={{ display: 'flex', fontSize: 80, fontWeight: 800, color: DARK, lineHeight: 1.1 }}>FAN?</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 48, gap: 4 }}>
          <div style={{ display: 'flex', fontSize: 34, color: GRAY }}>Test your knowledge with</div>
          <div style={{ display: 'flex', fontSize: 34, color: GRAY }}>fan-made quizzes. Free.</div>
        </div>

        <div style={{ display: 'flex', width: 400, height: 2, backgroundColor: '#E0DBD6', marginTop: 40 }} />

        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <div style={{ display: 'flex', padding: '10px 22px', borderRadius: 22, backgroundColor: '#EDE8E4' }}>
            <div style={{ display: 'flex', fontSize: 22, fontWeight: 700, color: DARK }}>500+ Quizzes</div>
          </div>
          <div style={{ display: 'flex', padding: '10px 22px', borderRadius: 22, backgroundColor: '#EDE8E4' }}>
            <div style={{ display: 'flex', fontSize: 22, fontWeight: 700, color: DARK }}>Free to Play</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: 560, height: 90, borderRadius: 45, backgroundColor: PINK, marginTop: 40 }}>
          <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, color: 'white' }}>Play free on kpopquiz.org</div>
        </div>
      </div>

      <div style={{ display: 'flex', width: W, height: 100, backgroundColor: '#F0EDE8', position: 'absolute', bottom: 0 }} />
      <div style={{ display: 'flex', position: 'absolute', bottom: 36, left: 60, flexDirection: 'column' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <div style={{ display: 'flex', fontSize: 40, fontWeight: 800, color: DARK }}>kpop</div>
          <div style={{ display: 'flex', fontSize: 40, fontWeight: 800, color: PINK }}>quiz</div>
        </div>
        <div style={{ display: 'flex', fontSize: 18, color: GRAY }}>Made by fans, for fans</div>
      </div>
    </div>
  );
}

// ---- TEMPLATE B: K-pop Fact ----
function TemplateB({ fact, groupName, mascotUri }: { fact: string; groupName: string; mascotUri: string }) {
  const lines = wrap(fact, 28);
  const attrLabel = groupName ? `${groupName} Quiz` : 'kpopquiz.org';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: W, height: H, backgroundColor: DARK, position: 'relative', fontFamily }}>
      <div style={{ width: W, height: 14, backgroundColor: PINK }} />

      <div style={{ position: 'absolute', top: -60, right: -60, width: 320, height: 240, backgroundColor: PINK, opacity: 0.12, borderRadius: 160 }} />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mascotUri} alt="" width={360} height={360} style={{ position: 'absolute', bottom: 120, right: 20, objectFit: 'contain' }} />

      <div style={{ display: 'flex', flexDirection: 'column', padding: '48px 60px 0', flex: 1 }}>
        <div style={{ display: 'flex', width: 220, height: 52, borderRadius: 26, backgroundColor: PINK, alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', fontSize: 24, fontWeight: 700, color: 'white' }}>K-POP FACT</div>
        </div>

        <div style={{ display: 'flex', fontSize: 140, fontWeight: 800, color: PINK, opacity: 0.35, marginTop: 40, lineHeight: 1 }}>&quot;</div>

        <div style={{ display: 'flex', flexDirection: 'column', marginTop: -20, gap: 4 }}>
          {lines.map((line, i) => (
            <div key={i} style={{ display: 'flex', fontSize: 60, fontWeight: 700, color: '#FAF8F5', lineHeight: 1.2 }}>{line}</div>
          ))}
        </div>

        <div style={{ display: 'flex', fontSize: 28, color: PINK, marginTop: 32, opacity: 0.85 }}>-- {attrLabel}</div>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: 480, height: 90, borderRadius: 45, backgroundColor: PINK, marginTop: 48 }}>
          <div style={{ display: 'flex', fontSize: 32, fontWeight: 700, color: 'white' }}>Quiz yourself - it&apos;s free</div>
        </div>
      </div>

      <div style={{ display: 'flex', position: 'absolute', bottom: 36, left: 60, flexDirection: 'column' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <div style={{ display: 'flex', fontSize: 40, fontWeight: 800, color: '#FAF8F5' }}>kpop</div>
          <div style={{ display: 'flex', fontSize: 40, fontWeight: 800, color: PINK }}>quiz</div>
        </div>
        <div style={{ display: 'flex', fontSize: 18, color: '#6B5F5C' }}>kpopquiz.org</div>
      </div>
    </div>
  );
}

// ---- TEMPLATE C: Comparison / VS ----
function TemplateC({ headline, isVs, leftName, rightName, mascotUri }: {
  headline: string; isVs: boolean; leftName?: string | undefined; rightName?: string | undefined; mascotUri: string;
}) {
  const kicker = isVs ? 'K-POP SHOWDOWN' : 'K-POP QUIZ';
  const lines = wrap(headline, 22);
  const lfs = leftName ? vsFontSize(leftName) : 80;
  const rfs = rightName ? vsFontSize(rightName) : 80;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: W, height: H, backgroundColor: CREAM, position: 'relative', fontFamily }}>
      <div style={{ width: W, height: 14, backgroundColor: PINK }} />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mascotUri} alt="" width={360} height={360} style={{ position: 'absolute', bottom: 120, right: 10, objectFit: 'contain' }} />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '50px 40px 0', flex: 1 }}>
        <div style={{ display: 'flex', height: 52, paddingLeft: 28, paddingRight: 28, borderRadius: 26, backgroundColor: PINK, alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', fontSize: 22, fontWeight: 700, color: 'white' }}>{kicker}</div>
        </div>

        {isVs && leftName && rightName && (
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 60, width: '100%' }}>
            <div style={{ display: 'flex', fontSize: lfs, fontWeight: 800, color: PINK, flex: 1, justifyContent: 'center' }}>{leftName}</div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 100 }}>
              <div style={{ width: 3, height: 60, backgroundColor: GRAY, opacity: 0.3 }} />
              <div style={{ display: 'flex', fontSize: 40, fontWeight: 800, color: GRAY }}>VS</div>
              <div style={{ width: 3, height: 60, backgroundColor: GRAY, opacity: 0.3 }} />
            </div>
            <div style={{ display: 'flex', fontSize: rfs, fontWeight: 800, color: DARK, flex: 1, justifyContent: 'center' }}>{rightName}</div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 40, gap: 4 }}>
          {lines.map((line, i) => (
            <div key={i} style={{ display: 'flex', fontSize: 68, fontWeight: 800, color: DARK }}>{line}</div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 60, gap: 4 }}>
          <div style={{ display: 'flex', fontSize: 32, color: GRAY }}>Play free on kpopquiz.org</div>
          <div style={{ display: 'flex', fontSize: 32, color: GRAY }}>and see how you compare</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: 560, height: 90, borderRadius: 45, backgroundColor: PINK, marginTop: 32 }}>
          <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, color: 'white' }}>Take the quiz - it&apos;s free</div>
        </div>
      </div>

      <div style={{ display: 'flex', position: 'absolute', bottom: 36, left: 60, flexDirection: 'column' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <div style={{ display: 'flex', fontSize: 40, fontWeight: 800, color: DARK }}>kpop</div>
          <div style={{ display: 'flex', fontSize: 40, fontWeight: 800, color: PINK }}>quiz</div>
        </div>
        <div style={{ display: 'flex', fontSize: 18, color: GRAY }}>Made by fans, for fans</div>
      </div>
    </div>
  );
}

// ---- RASTERIZE ----
async function elementToPng(
  element: React.ReactElement,
  fonts: Array<{ name: string; data: ArrayBuffer; weight: 400 | 700 | 800; style: 'normal' }>,
): Promise<Buffer> {
  const ir = new ImageResponse(element, { width: W, height: H, fonts });
  return Buffer.from(await ir.arrayBuffer());
}

// ---- DB QUERIES ----
async function fetchGroups(supabase: ReturnType<typeof createServiceRoleClient>, limit: number) {
  const { data, error } = await supabase
    .from('groups').select('id, name, slug, quiz_count')
    .gt('quiz_count', 0).order('quiz_count', { ascending: false }).limit(limit);
  if (error) throw new Error(`groups: ${error.message}`);
  return (data ?? []) as Array<{ id: number; name: string; slug: string; quiz_count: number }>;
}

async function fetchFacts(supabase: ReturnType<typeof createServiceRoleClient>, limit: number) {
  const { data, error } = await supabase
    .from('quizzes').select('slug, group_id, questions, groups(name, slug)')
    .eq('status', 'published').not('questions', 'is', null)
    .order('play_count', { ascending: false }).limit(300);
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

// ---- COMPARISONS ----
const COMPARISONS: Array<{ headline: string; isVs: boolean; left?: string; right?: string; slug: string; path: string }> = [
  { headline: 'BTS vs BLACKPINK', isVs: true, left: 'BTS', right: 'BLACKPINK', slug: 'bts-vs-blackpink', path: '/kpop-true-or-false' },
  { headline: 'aespa vs NewJeans', isVs: true, left: 'aespa', right: 'NewJeans', slug: 'aespa-vs-newjeans', path: '/easy-kpop-quizzes' },
  { headline: 'Stray Kids vs ATEEZ', isVs: true, left: 'SKZ', right: 'ATEEZ', slug: 'skz-vs-ateez', path: '/hard-kpop-quizzes' },
  { headline: 'TWICE vs IVE', isVs: true, left: 'TWICE', right: 'IVE', slug: 'twice-vs-ive', path: '/easy-kpop-quizzes' },
  { headline: 'EXO vs BTS: who do fans know better?', isVs: true, left: 'EXO', right: 'BTS', slug: 'exo-vs-bts', path: '/hard-kpop-quizzes' },
  { headline: 'SEVENTEEN vs MONSTA X', isVs: true, left: 'SVT', right: 'MX', slug: 'svt-vs-mx', path: '/quizzes' },
  { headline: 'Girl groups vs Boy groups', isVs: true, left: 'Girls', right: 'Boys', slug: 'girl-vs-boy', path: '/quizzes' },
  { headline: '4th gen vs 3rd gen K-pop', isVs: true, left: '4th', right: '3rd gen', slug: '4gen-vs-3gen', path: '/quizzes' },
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
  { headline: 'NCT vs EXO: SM showdown', isVs: true, left: 'NCT', right: 'EXO', slug: 'nct-vs-exo', path: '/quizzes' },
  { headline: 'Can You Pass This K-pop 2026 Quiz?', isVs: false, slug: '2026-kpop-pass', path: '/kpop-quiz-2026' },
  { headline: 'IVE vs LE SSERAFIM: who do fans know better?', isVs: true, left: 'IVE', right: 'LSF', slug: 'ive-vs-lsf', path: '/easy-kpop-quizzes' },
  { headline: 'MONSTA X vs ATEEZ: dark concept kings', isVs: true, left: 'MX', right: 'ATEEZ', slug: 'mx-vs-ateez', path: '/quizzes' },
  { headline: 'K-pop Leaderboard: Top Fans This Week', isVs: false, slug: 'top-fans-week', path: '/leaderboard' },
  { headline: 'How Many K-pop Songs Can You Guess?', isVs: false, slug: 'guess-songs', path: '/blindtest' },
  { headline: 'SEVENTEEN: 13 members, can you name all?', isVs: false, slug: 'seventeen-all', path: '/games/name-all' },
  { headline: 'K-pop Blind Test: 10 Songs, 10 Seconds', isVs: false, slug: 'blindtest-10', path: '/blindtest' },
  { headline: 'Easiest K-pop Quiz vs The Hardest', isVs: true, left: 'Easy', right: 'Hard', slug: 'easy-vs-hard', path: '/easy-kpop-quizzes' },
  { headline: 'NewJeans vs FIFTY FIFTY: new gen queens', isVs: true, left: 'NJ', right: 'FF', slug: 'nj-vs-ff', path: '/easy-kpop-quizzes' },
  { headline: 'BIGBANG vs BTS: who shaped K-pop more?', isVs: true, left: 'BB', right: 'BTS', slug: 'bb-vs-bts', path: '/hard-kpop-quizzes' },
  { headline: 'Quiz: Which K-pop Era Do You Belong To?', isVs: false, slug: 'kpop-era-quiz', path: '/quizzes' },
  { headline: 'G-DRAGON vs Jimin: solo king showdown', isVs: true, left: 'GD', right: 'Jimin', slug: 'gd-vs-jimin', path: '/quizzes' },
  { headline: 'Top 10 K-pop Questions Fans Always Get Wrong', isVs: false, slug: 'always-get-wrong', path: '/hard-kpop-quizzes' },
  { headline: 'Weeekly vs tripleS: niche fan quiz', isVs: true, left: 'Weeekly', right: 'tripleS', slug: 'weeekly-vs-triples', path: '/quizzes' },
  { headline: 'ENHYPEN vs TXT: 4th gen boy group rivalry', isVs: true, left: 'ENH', right: 'TXT', slug: 'enh-vs-txt', path: '/quizzes' },
  { headline: 'K-pop Fan Rankings: Where Do You Stand?', isVs: false, slug: 'fan-rankings', path: '/leaderboard' },
];

const makeUrl = () => SITE_URL;

const descA = (g: string) =>
  `Think you know everything about ${g}? Test your fan knowledge with free quiz games on kpopquiz.org. Play hundreds of quizzes, earn XP, and climb the K-pop leaderboard. No signup needed!`.slice(0, 500);
const descB = (fact: string) =>
  `${fact} Discover more K-pop facts and test your knowledge with free fan-made quizzes on kpopquiz.org. No signup needed!`.slice(0, 500);
const descC = (headline: string, path: string) =>
  `${headline} - take the ${path.includes('blindtest') ? 'blind test' : 'quiz'} on kpopquiz.org! Free K-pop games made by fans. No signup, 100% free.`.slice(0, 500);

const kwA = (g: string) => `kpop, ${g.toLowerCase()}, kpop quiz, kpop fan, ${g.toLowerCase()} quiz, kpop game`;
const kwB = (g: string) => `kpop, kpop fact, kpop trivia, kpop quiz, ${g ? g.toLowerCase() + ', ' : ''}kpop knowledge`;
const kwC = () => 'kpop, kpop quiz, kpop vs, kpop game, kpop fan, best kpop quiz';

interface ManifestEntry {
  filename: string;
  pin_type: 'A' | 'B' | 'C';
  // Pinterest bulk upload columns
  title: string;
  media_url: string;
  board: string;
  description: string;
  link: string;
  keywords: string;
}

// ---- HANDLER ----
export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { mode } = (await req.json()) as { mode: 'sample' | 'full' };
  const db = createServiceRoleClient();
  const fonts = loadFonts();
  const mascotDefault = loadMascotUri('mascot-default');
  const mascotCelebrate = loadMascotUri('mascot-celebrate');

  if (mode === 'sample') {
    let factItem = { fact: 'BTS holds the record for the most-streamed K-pop album on Spotify with over 3 billion streams.', groupName: 'BTS', groupSlug: 'bts' };
    try { const f = await fetchFacts(db, 5); if (f[0]) factItem = f[0]; } catch { /* fallback */ }
    const comp = COMPARISONS[0]!;

    const [pngA, pngB, pngC] = await Promise.all([
      elementToPng(<TemplateA groupName="BTS" mascotUri={mascotDefault} />, fonts),
      elementToPng(<TemplateB fact={factItem.fact} groupName={factItem.groupName} mascotUri={mascotCelebrate} />, fonts),
      elementToPng(<TemplateC headline={comp.headline} isVs={comp.isVs} leftName={comp.left} rightName={comp.right} mascotUri={mascotDefault} />, fonts),
    ]);

    return NextResponse.json({
      pins: [
        { filename: 'A-sample-bts.png', base64: pngA.toString('base64') },
        { filename: 'B-sample-fact.png', base64: pngB.toString('base64') },
        { filename: 'C-sample-vs.png', base64: pngC.toString('base64') },
      ],
    });
  }

  if (mode === 'full') {
    const [groups, facts] = await Promise.all([fetchGroups(db, 120), fetchFacts(db, 50)]);
    const manifest: ManifestEntry[] = [];

    await db.storage.createBucket(STORAGE_BUCKET, { public: true }).catch(() => null);

    async function savePng(fn: string, buf: Buffer): Promise<string> {
      const storagePath = `brand-pins/${fn}`;
      await db.storage.from(STORAGE_BUCKET).upload(storagePath, buf, { contentType: 'image/png', upsert: true });
      const { data } = db.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
      return data.publicUrl;
    }

    for (const g of groups.slice(0, 120)) {
      const fn = `A-${g.slug}.png`;
      const buf = await elementToPng(<TemplateA groupName={g.name} mascotUri={mascotDefault} />, fonts);
      const mediaUrl = await savePng(fn, buf);
      manifest.push({
        filename: fn, pin_type: 'A',
        title: `Are you a real ${g.name} fan? Take the quiz`.slice(0, 100),
        media_url: mediaUrl,
        board: PINTEREST_BOARD,
        description: descA(g.name),
        link: makeUrl(),
        keywords: kwA(g.name),
      });
    }

    for (let i = 0; i < Math.min(facts.length, 40); i++) {
      const f = facts[i]!;
      const fn = `B-${f.groupSlug}-${i}.png`;
      const buf = await elementToPng(<TemplateB fact={f.fact} groupName={f.groupName} mascotUri={mascotCelebrate} />, fonts);
      const mediaUrl = await savePng(fn, buf);
      manifest.push({
        filename: fn, pin_type: 'B',
        title: `K-pop fact: ${f.fact.slice(0, 75)}`.slice(0, 100),
        media_url: mediaUrl,
        board: PINTEREST_BOARD,
        description: descB(f.fact),
        link: makeUrl(),
        keywords: kwB(f.groupName),
      });
    }

    for (const c of COMPARISONS.slice(0, 40)) {
      const fn = `C-${c.slug}.png`;
      const buf = await elementToPng(<TemplateC headline={c.headline} isVs={c.isVs} leftName={c.left} rightName={c.right} mascotUri={mascotDefault} />, fonts);
      const mediaUrl = await savePng(fn, buf);
      manifest.push({
        filename: fn, pin_type: 'C',
        title: c.headline.slice(0, 100),
        media_url: mediaUrl,
        board: PINTEREST_BOARD,
        description: descC(c.headline, c.path),
        link: makeUrl(),
        keywords: kwC(),
      });
    }

    const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const csvLines = [
      'Title,Media URL,Pinterest board,Thumbnail,Description,Link,Publish date,Keywords',
      ...manifest.map((m) =>
        [q(m.title), q(m.media_url), q(m.board), '', q(m.description), q(m.link), '', q(m.keywords)].join(',')
      ),
    ];
    // UTF-8 BOM required for Pinterest bulk upload to recognise the file
    const bom = Buffer.from([0xef, 0xbb, 0xbf]);
    const csvBuf = Buffer.concat([bom, Buffer.from(csvLines.join('\n'), 'utf-8')]);
    return new NextResponse(csvBuf, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="pinterest-pins.csv"',
        'Content-Length': String(csvBuf.length),
      },
    });
  }

  return NextResponse.json({ error: 'invalid mode' }, { status: 400 });
}
