import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
// crypto not needed - batch3 reuses existing creators

// Load env (same approach as seed-platform.ts)
const envContent = fs.readFileSync('.env.local', 'utf-8');
for (const line of envContent.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i > 0 && !process.env[t.slice(0, i)]) process.env[t.slice(0, i)] = t.slice(i + 1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// ============================================================
// Utilities
// ============================================================

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(
    Math.floor(Math.random() * 14) + 8,
    Math.floor(Math.random() * 60),
    Math.floor(Math.random() * 60),
  );
  return d.toISOString();
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function weightedScore(totalQ: number): number {
  const r = Math.random();
  let pct: number;
  if (r < 0.10) pct = randomBetween(0, 29) / 100;
  else if (r < 0.30) pct = randomBetween(30, 49) / 100;
  else if (r < 0.60) pct = randomBetween(50, 69) / 100;
  else if (r < 0.85) pct = randomBetween(70, 89) / 100;
  else pct = randomBetween(90, 100) / 100;
  return Math.min(Math.round(pct * totalQ), totalQ);
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

// ============================================================
// Avatar colors (same palette as seed-platform.ts)
// ============================================================

const AVATAR_COLORS = [
  { bg: '#EEEDFE', text: '#3C3489' },
  { bg: '#E1F5EE', text: '#085041' },
  { bg: '#FAECE7', text: '#712B13' },
  { bg: '#FBEAF0', text: '#72243E' },
  { bg: '#E6F1FB', text: '#0C447C' },
  { bg: '#FAEEDA', text: '#633806' },
  { bg: '#EAF3DE', text: '#27500A' },
  { bg: '#FCEBEB', text: '#791F1F' },
];

// ============================================================
// Creator profiles
// ============================================================

interface Creator {
  username: string;
  display_name: string;
  bio: string;
  joined_days_ago: number;
  color_idx: number;
}

const CREATORS: Creator[] = [
  { username: 'soojinnie', display_name: 'Soojin', bio: 'girl group enthusiast. deep trivia lover.', joined_days_ago: 25, color_idx: 0 },
  { username: 'joonified', display_name: 'Joon', bio: 'BTS encyclopedia. every era, every album.', joined_days_ago: 28, color_idx: 1 },
  { username: 'pinkvelvet', display_name: 'Rosie', bio: 'girl group multi-stan. BP + RV forever.', joined_days_ago: 26, color_idx: 2 },
  { username: 'caratland', display_name: 'Carat', bio: '13+3+1=17. CARAT since debut.', joined_days_ago: 24, color_idx: 3 },
  { username: 'skzrealm', display_name: 'Felix_fan', bio: 'SKZ + ATEEZ. 4th gen bg supremacy.', joined_days_ago: 23, color_idx: 4 },
  { username: 'njeansstan', display_name: 'Bunny', bio: '4th gen gg collector. NJ, IVE, LSRFM.', joined_days_ago: 22, color_idx: 5 },
  { username: 'kpophistory', display_name: 'KpopProf', bio: 'been here since 2nd gen. I quiz everything.', joined_days_ago: 30, color_idx: 6 },
  { username: 'twiceland', display_name: 'Nayeonist', bio: 'ONCE + MIDZY. JYP nation.', joined_days_ago: 27, color_idx: 7 },
  { username: 'exoplanet99', display_name: 'ExoPlanet', bio: 'EXO-L and Shawol. 2nd/3rd gen specialist.', joined_days_ago: 26, color_idx: 0 },
];

// ============================================================
// Quiz -> Creator assignment
// ============================================================

const CREATOR_MAP: Record<string, string> = {
  // joonified - TXT (HYBE labelmate)
  'TXT discography deep dive': 'joonified',
  'TXT members deep knowledge': 'joonified',
  'TXT true or false - MOA edition': 'joonified',

  // skzrealm - Stray Kids, ATEEZ, ENHYPEN
  'Stray Kids - know each member': 'skzrealm',
  'ATEEZ discography challenge': 'skzrealm',
  'ATEEZ members quiz': 'skzrealm',
  'ENHYPEN discography quiz': 'skzrealm',
  'ENHYPEN members deep dive': 'skzrealm',

  // pinkvelvet - Red Velvet
  'Red Velvet discography quiz': 'pinkvelvet',
  'Red Velvet true or false': 'pinkvelvet',
  'K-pop fashion and style quiz': 'pinkvelvet',
  'K-pop fashion true or false': 'pinkvelvet',

  // twiceland - TWICE
  'TWICE Japanese discography': 'twiceland',
  'TWICE specific eras quiz': 'twiceland',
  'K-pop music show programs quiz': 'twiceland',

  // exoplanet99 - NCT, Super Junior, f(x), 2nd gen
  'NCT system explained quiz': 'exoplanet99',
  'NCT Dream quiz': 'exoplanet99',
  'Super Junior legacy quiz': 'exoplanet99',
  "f(x) quiz - SM's unique girl group": 'exoplanet99',
  'WINNER and iKON quiz - YG brothers': 'exoplanet99',

  // soojinnie - TikTok, choreography
  'K-pop TikTok viral moments': 'soojinnie',
  'K-pop choreography quiz': 'soojinnie',
  'K-pop music video themes quiz': 'soojinnie',

  // caratland - concert/streaming
  'K-pop concert and tour facts': 'caratland',
  'K-pop concert facts true or false': 'caratland',
  'K-pop Spotify streaming quiz': 'caratland',

  // njeansstan - culture, fan life
  'K-pop photocard culture quiz': 'njeansstan',
  'K-pop album packaging quiz': 'njeansstan',
  'K-pop sasaeng and fan culture dark side': 'njeansstan',

  // kpophistory - general deep knowledge
  'K-pop OST (drama soundtracks) quiz': 'kpophistory',
  'DAY6 quiz': 'kpophistory',
  'K-pop dating and relationships - verified facts only': 'kpophistory',
  'K-pop training system quiz': 'kpophistory',
  'K-pop military service deep dive': 'kpophistory',
  'K-pop MAMA awards history': 'kpophistory',
  'K-pop Melon Music Awards quiz': 'kpophistory',
  'K-pop group name meanings': 'kpophistory',
  'K-pop group name meanings true or false': 'kpophistory',
  'Which year did this song come out?': 'kpophistory',
  'K-pop B-sides that became fan favorites': 'kpophistory',
  'K-pop Weverse and social media quiz': 'kpophistory',
  'K-pop Produce series quiz': 'kpophistory',
  'K-pop food quiz - idols and their favorites': 'kpophistory',
  'K-pop industry business quiz': 'kpophistory',
  'K-pop girl group generations timeline': 'kpophistory',
  'K-pop boy group generations timeline': 'kpophistory',
  'K-pop Korean language basics for fans': 'kpophistory',
};

// ============================================================
// Group name -> slug mapping (for groups not in DB by exact name)
// ============================================================

const GROUP_NAME_OVERRIDES: Record<string, string> = {
  'General K-pop': 'general-kpop',
  "Girls' Generation": 'girls-generation',
  'NCT': 'nct',
};

// ============================================================
// Play count generation
// ============================================================

const GROUP_POPULARITY: Record<string, number> = {
  'BTS': 1.5,
  'BLACKPINK': 1.4,
  'NewJeans': 1.3,
  'TWICE': 1.2,
  'Stray Kids': 1.1,
  'aespa': 1.1,
  'IVE': 1.1,
  'SEVENTEEN': 1.0,
  'LE SSERAFIM': 1.0,
  'ITZY': 0.95,
  '(G)I-DLE': 0.95,
  'EXO': 0.9,
  'SHINee': 0.85,
  'ATEEZ': 0.9,
  'BIGBANG': 0.85,
  "Girls' Generation": 0.8,
  'GOT7': 0.8,
  'Red Velvet': 0.85,
  'NMIXX': 0.8,
  'MONSTA X': 0.75,
  'NCT': 0.9,
  'General K-pop': 0.8,
};

function generatePlayCount(difficulty: string, group: string): number {
  const base = randomBetween(60, 250);
  const groupMult = GROUP_POPULARITY[group] ?? 0.8;
  const diffMult = difficulty === 'easy' ? 1.2 : difficulty === 'hard' ? 0.8 : 1.0;
  return Math.floor(base * groupMult * diffMult);
}

function generateLikeCount(playCount: number): number {
  // ~5-12% of plays become likes
  const rate = 0.05 + Math.random() * 0.07;
  return Math.max(2, Math.floor(playCount * rate));
}

// ============================================================
// Question format transformers
// ============================================================

interface InputMCQuestion {
  q: string;
  correct: string;
  wrong: string[];
}

interface InputTFQuestion {
  q: string;
  correct: boolean;
}

interface DBMCQuestion {
  question: string;
  options: string[];
  correct: number;
}

interface DBTFQuestion {
  question: string;
  correct: boolean;
}

function transformMCQuestion(input: InputMCQuestion): DBMCQuestion {
  const options = shuffle([input.correct, ...input.wrong]);
  return {
    question: input.q,
    options,
    correct: options.indexOf(input.correct),
  };
}

function transformTFQuestion(input: InputTFQuestion): DBTFQuestion {
  return {
    question: input.q,
    correct: input.correct,
  };
}

// ============================================================
// Timer settings (matching seed-platform.ts)
// ============================================================

const TIMER_NORMAL = { timer: true, timer_seconds: 15, shuffle: true, show_answers: false };
const TIMER_EASY = { timer: true, timer_seconds: 20, shuffle: true, show_answers: false };
const TIMER_HARD = { timer: true, timer_seconds: 10, shuffle: true, show_answers: false };

function getSettings(difficulty: string) {
  if (difficulty === 'easy') return TIMER_EASY;
  if (difficulty === 'hard') return TIMER_HARD;
  return TIMER_NORMAL;
}

// ============================================================
// Main
// ============================================================

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const isClean = process.argv.includes('--clean');

  // Load quiz data
  const quizData = JSON.parse(fs.readFileSync('scripts/batch3-quizzes.json', 'utf-8')) as Array<{
    title: string;
    group: string;
    type: string;
    difficulty: string;
    questions: Array<InputMCQuestion | InputTFQuestion>;
  }>;

  console.log(`Loaded ${quizData.length} quizzes from batch3-quizzes.json`);

  if (isDryRun) {
    console.log('\n[DRY RUN] Would create:');
    const creatorCounts: Record<string, number> = {};
    for (const q of quizData) {
      const creator = CREATOR_MAP[q.title] ?? 'kpophistory';
      creatorCounts[creator] = (creatorCounts[creator] ?? 0) + 1;
    }
    for (const [username, count] of Object.entries(creatorCounts)) {
      console.log(`  ${username}: ${count} quizzes`);
    }
    console.log(`\nTotal: ${quizData.length} quizzes across ${Object.keys(creatorCounts).length} creators`);
    return;
  }

  // ---- Step 1: Look up existing batch3 creator profiles ----
  console.log('\n1. Loading existing creator profiles...');
  const userMap = new Map<string, string>(); // username -> uuid
  const batch3Usernames = CREATORS.map(c => c.username);
  // Also load seed-platform users to use as additional creators
  const allKnownUsernames = [...batch3Usernames, 'army_mina97', 'jimin_universe', 'blink_forever22', 'stay_dreamer', 'carat_hoshi', 'once_upon_sana', 'my_winter99', 'bunny_haerin', 'exol_chen', 'midzy_ryujin', 'kpop_scholar', 'hallyu_nerd'];

  const { data: existingProfiles } = await supabase
    .from('profiles')
    .select('id, username')
    .in('username', allKnownUsernames);

  for (const p of existingProfiles ?? []) {
    userMap.set(p.username, p.id);
  }
  console.log(`  Found ${userMap.size} existing creators.`);

  if (userMap.size === 0) {
    console.error('  No creators found! Run import-batch3.ts first.');
    return;
  }

  // ---- Step 2: Fetch group map ----
  console.log('\n2. Loading groups...');
  const { data: groups } = await supabase.from('groups').select('id, slug, name');
  const groupBySlug = new Map<string, number>();
  const groupByName = new Map<string, number>();
  for (const g of groups ?? []) {
    groupBySlug.set(g.slug, g.id);
    groupByName.set(g.name.toLowerCase(), g.id);
  }
  console.log(`  Loaded ${groupBySlug.size} groups.`);

  // Helper to find group_id from quiz group name
  function resolveGroupId(groupName: string): number | null {
    const override = GROUP_NAME_OVERRIDES[groupName];
    if (override && groupBySlug.has(override)) return groupBySlug.get(override)!;

    // Try exact slug match
    const slug = groupName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
    if (groupBySlug.has(slug)) return groupBySlug.get(slug)!;

    // Try name match (case-insensitive)
    if (groupByName.has(groupName.toLowerCase())) return groupByName.get(groupName.toLowerCase())!;

    return null;
  }

  // ---- Step 3: Insert quizzes ----
  console.log('\n3. Inserting quizzes...');

  interface QuizRecord {
    id: string;
    creator_id: string;
    group_id: number | null;
    question_count: number;
    target_plays: number;
    target_likes: number;
    created_at: string;
    difficulty: string;
  }

  const quizRecords: QuizRecord[] = [];
  let skipped = 0;

  // Stagger creation dates: spread over ~21 days, recent quizzes clustered
  const sortedQuizzes = [...quizData].sort(() => Math.random() - 0.5); // randomize order

  for (let idx = 0; idx < sortedQuizzes.length; idx++) {
    const q = sortedQuizzes[idx]!;
    const creatorUsername = CREATOR_MAP[q.title] ?? 'kpophistory';
    const creatorId = userMap.get(creatorUsername);
    const groupId = resolveGroupId(q.group);

    if (!creatorId) {
      console.error(`  Skipping "${q.title}" - creator ${creatorUsername} not found`);
      skipped++;
      continue;
    }

    if (groupId === null) {
      console.error(`  Skipping "${q.title}" - group "${q.group}" not found in DB`);
      skipped++;
      continue;
    }

    // Transform questions to DB format
    const dbQuestions = q.questions.map((question) => {
      if (q.type === 'true_false') {
        return transformTFQuestion(question as InputTFQuestion);
      }
      return transformMCQuestion(question as InputMCQuestion);
    });

    // Check minimum question count
    if (dbQuestions.length < 5) {
      console.error(`  Skipping "${q.title}" - only ${dbQuestions.length} questions (min 5)`);
      skipped++;
      continue;
    }

    // Generate slug + ensure uniqueness
    let slug = generateSlug(q.title);
    const { data: existing } = await supabase.from('quizzes').select('id').eq('slug', slug).maybeSingle();
    if (existing) {
      slug = `${slug}-${randomBetween(2, 99)}`;
    }

    // Stagger dates: spread over 21 days
    const daysBack = Math.floor((idx / sortedQuizzes.length) * 21) + randomBetween(0, 2);
    const createdAt = daysAgo(daysBack);

    const quizType = q.type === 'true_false' ? 'true_false' : 'multiple_choice';
    const settings = getSettings(q.difficulty);
    const targetPlays = generatePlayCount(q.difficulty, q.group);
    const targetLikes = generateLikeCount(targetPlays);

    const { data: quiz, error } = await supabase
      .from('quizzes')
      .insert({
        creator_id: creatorId,
        group_id: groupId,
        title: q.title,
        slug,
        quiz_type: quizType,
        questions: dbQuestions,
        settings,
        status: 'published',
        difficulty: q.difficulty,
        question_count: dbQuestions.length,
        created_at: createdAt,
      })
      .select('id')
      .single();

    if (error) {
      console.error(`  Failed: "${q.title}": ${error.message}`);
      skipped++;
      continue;
    }

    quizRecords.push({
      id: quiz.id,
      creator_id: creatorId,
      group_id: groupId,
      question_count: dbQuestions.length,
      target_plays: targetPlays,
      target_likes: targetLikes,
      created_at: createdAt,
      difficulty: q.difficulty,
    });

    console.log(`  [${quizRecords.length}/${sortedQuizzes.length}] "${q.title}" -> ${creatorUsername} (${targetPlays} target plays)`);
  }
  console.log(`  Inserted ${quizRecords.length} quizzes, skipped ${skipped}.`);

  if (quizRecords.length === 0) {
    console.log('\nNo quizzes inserted. Exiting.');
    return;
  }

  // ---- Step 4: Generate plays ----
  console.log('\n4. Generating plays...');
  const allUserIds = Array.from(userMap.values());
  // Also fetch existing seed users to use as players
  const { data: existingUsers } = await supabase
    .from('profiles')
    .select('id')
    .limit(50);
  const allPlayerIds = [...new Set([...allUserIds, ...(existingUsers ?? []).map(u => u.id)])];

  let totalPlays = 0;

  for (const qr of quizRecords) {
    const playCount = qr.target_plays + randomBetween(-15, 15);
    const quizCreatedDate = new Date(qr.created_at);
    const now = new Date();
    const daysSinceCreation = Math.max(1, Math.floor((now.getTime() - quizCreatedDate.getTime()) / 86400000));

    const plays: Array<{
      quiz_id: string;
      player_id: string | null;
      score: number;
      total_questions: number;
      time_taken_seconds: number;
      created_at: string;
    }> = [];

    for (let i = 0; i < playCount; i++) {
      // ~45% anonymous plays
      const isAnon = Math.random() < 0.45;
      const playerId = isAnon ? null : pickRandom(allPlayerIds);
      const score = weightedScore(qr.question_count);
      const timeTaken = randomBetween(25, 45) + qr.question_count * randomBetween(5, 15);

      const daysOffset = Math.random() * daysSinceCreation;
      const playDate = new Date(quizCreatedDate.getTime() + daysOffset * 86400000);
      playDate.setHours(randomBetween(6, 23), randomBetween(0, 59), randomBetween(0, 59));

      plays.push({
        quiz_id: qr.id,
        player_id: playerId,
        score,
        total_questions: qr.question_count,
        time_taken_seconds: timeTaken,
        created_at: playDate.toISOString(),
      });
    }

    // Insert in batches of 500
    for (let i = 0; i < plays.length; i += 500) {
      const batch = plays.slice(i, i + 500);
      const { error } = await supabase.from('plays').insert(batch);
      if (error) {
        console.error(`  Play insert error for "${qr.id}": ${error.message}`);
        break;
      }
    }
    totalPlays += plays.length;
    process.stdout.write(`  Plays: ${totalPlays}\r`);
  }
  console.log(`  Generated ${totalPlays} plays.`);

  // ---- Step 5: Update cached quiz stats ----
  console.log('\n5. Updating quiz stats...');
  for (const qr of quizRecords) {
    const { data: playData } = await supabase.from('plays').select('score').eq('quiz_id', qr.id);
    const plays = playData ?? [];
    const playCount = plays.length;
    const totalScoreSum = plays.reduce((s, p) => s + p.score, 0);

    await supabase.from('quizzes').update({
      play_count: playCount,
      total_completions: playCount,
      total_score_sum: totalScoreSum,
    }).eq('id', qr.id);
  }

  // Update group stats (recalculate for ALL groups, not just batch3)
  const { data: allGroups } = await supabase.from('groups').select('id');
  for (const g of allGroups ?? []) {
    const { data: gQuizzes } = await supabase
      .from('quizzes')
      .select('play_count')
      .eq('group_id', g.id)
      .eq('status', 'published');
    const totalPlaysGroup = (gQuizzes ?? []).reduce((s, q) => s + (q.play_count ?? 0), 0);
    const quizCount = (gQuizzes ?? []).length;
    await supabase.from('groups').update({ total_plays: totalPlaysGroup, quiz_count: quizCount }).eq('id', g.id);
  }

  // Update profile stats for batch3 creators
  for (const [username, userId] of userMap) {
    const { data: userQuizzes } = await supabase
      .from('quizzes')
      .select('play_count')
      .eq('creator_id', userId)
      .eq('status', 'published');
    const totalCreated = (userQuizzes ?? []).length;
    const totalPlaysReceived = (userQuizzes ?? []).reduce((s, q) => s + (q.play_count ?? 0), 0);
    await supabase.from('profiles').update({
      total_quizzes_created: totalCreated,
      total_plays_received: totalPlaysReceived,
    }).eq('id', userId);
    console.log(`  ${username}: ${totalCreated} quizzes, ${totalPlaysReceived} plays received`);
  }
  console.log('  Stats updated.');

  // ---- Step 6: Generate likes ----
  console.log('\n6. Generating likes...');
  let totalLikes = 0;

  for (const qr of quizRecords) {
    const likeCount = Math.max(0, qr.target_likes + randomBetween(-2, 2));
    const eligibleUsers = allPlayerIds.filter(id => id !== qr.creator_id);
    const shuffled = shuffle(eligibleUsers);
    const likers = shuffled.slice(0, Math.min(likeCount, shuffled.length));

    const quizCreatedDate = new Date(qr.created_at);

    for (const userId of likers) {
      const likeDate = new Date(quizCreatedDate.getTime() + Math.random() * (Date.now() - quizCreatedDate.getTime()));
      await supabase.from('likes').upsert({
        user_id: userId,
        quiz_id: qr.id,
        created_at: likeDate.toISOString(),
      }, { onConflict: 'user_id,quiz_id', ignoreDuplicates: true });
    }
    totalLikes += likers.length;
  }
  console.log(`  Generated ${totalLikes} likes.`);

  // Update like counts on quizzes
  for (const qr of quizRecords) {
    const { count } = await supabase.from('likes').select('*', { count: 'exact', head: true }).eq('quiz_id', qr.id);
    await supabase.from('quizzes').update({ like_count: count ?? 0 }).eq('id', qr.id);
  }

  // Update profile total_likes_received for batch3 creators
  for (const [, userId] of userMap) {
    const { data: userQuizzes } = await supabase.from('quizzes').select('like_count').eq('creator_id', userId);
    const totalLikesReceived = (userQuizzes ?? []).reduce((s, q) => s + (q.like_count ?? 0), 0);
    await supabase.from('profiles').update({ total_likes_received: totalLikesReceived }).eq('id', userId);
  }

  // ---- Step 7: Calculate XP ----
  console.log('\n7. Calculating XP...');
  for (const [username, userId] of userMap) {
    let xp = 0;

    // Playing XP
    const { data: userPlays } = await supabase.from('plays').select('score, total_questions').eq('player_id', userId);
    for (const p of userPlays ?? []) {
      xp += 10;
      if (p.total_questions > 0 && p.score / p.total_questions >= 0.7) xp += 5;
      if (p.score === p.total_questions) xp += 15;
    }

    // Creating XP
    const { data: userQuizzes } = await supabase
      .from('quizzes')
      .select('play_count')
      .eq('creator_id', userId)
      .eq('status', 'published');
    const quizCount = (userQuizzes ?? []).length;
    if (quizCount >= 1) {
      xp += 75; // first quiz bonus
      xp += Math.max(0, quizCount - 1) * 25;
    }

    // Plays received XP (capped at 500 per quiz)
    for (const q of userQuizzes ?? []) {
      xp += Math.min(q.play_count ?? 0, 500);
    }

    // Likes received XP
    const { data: profile } = await supabase.from('profiles').select('total_likes_received').eq('id', userId).single();
    xp += (profile?.total_likes_received ?? 0) * 2;

    await supabase.from('profiles').update({ xp }).eq('id', userId);
    console.log(`  ${username}: ${xp} XP`);
  }

  // ---- Step 8: Award badges ----
  console.log('\n8. Awarding badges...');
  for (const [username, userId] of userMap) {
    const badges: string[] = [];

    const { data: userPlays } = await supabase
      .from('plays')
      .select('score, total_questions, quiz_id')
      .eq('player_id', userId);
    const plays = userPlays ?? [];

    const { data: userQuizzes } = await supabase
      .from('quizzes')
      .select('play_count, like_count, difficulty, group_id')
      .eq('creator_id', userId)
      .eq('status', 'published');
    const quizzes = userQuizzes ?? [];

    if (plays.length >= 1) badges.push('first_steps');
    if (quizzes.length >= 1) badges.push('quiz_maker');
    if (plays.some(p => p.score === p.total_questions)) badges.push('perfect_score');
    if (quizzes.length >= 10) badges.push('prolific_creator');
    if (quizzes.some(q => (q.play_count ?? 0) >= 1000)) badges.push('viral_hit');
    if (plays.length >= 100) badges.push('dedicated_fan');

    // multi_stan check
    const groupIds = new Set<number>();
    for (const p of plays.slice(0, 200)) { // limit to avoid too many queries
      const { data: quiz } = await supabase.from('quizzes').select('group_id').eq('id', p.quiz_id).single();
      if (quiz?.group_id) groupIds.add(quiz.group_id);
    }
    if (groupIds.size >= 10) badges.push('multi_stan');

    // community_star
    const totalLikesOnQuizzes = quizzes.reduce((s, q) => s + (q.like_count ?? 0), 0);
    if (totalLikesOnQuizzes >= 100) badges.push('community_star');

    // hard_mode
    for (const p of plays) {
      if (p.total_questions > 0 && p.score / p.total_questions >= 0.7) {
        const { data: quiz } = await supabase.from('quizzes').select('difficulty').eq('id', p.quiz_id).single();
        if (quiz?.difficulty === 'hard') {
          badges.push('hard_mode');
          break;
        }
      }
    }

    const uniqueBadges = [...new Set(badges)];
    for (const badgeId of uniqueBadges) {
      await supabase.from('user_badges').upsert({
        user_id: userId,
        badge_id: badgeId,
        earned_at: daysAgo(randomBetween(1, 14)),
      }, { onConflict: 'user_id,badge_id', ignoreDuplicates: true });
    }
    console.log(`  ${username}: ${uniqueBadges.join(', ') || '(none)'}`);
  }

  // ---- Step 9: Verification ----
  console.log('\n9. Verification...');
  const { count: totalQuizCount } = await supabase
    .from('quizzes')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'published');
  const { count: totalPlayCount } = await supabase
    .from('plays')
    .select('*', { count: 'exact', head: true });
  const { count: totalLikeCount } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true });

  console.log(`  Total published quizzes: ${totalQuizCount}`);
  console.log(`  Total plays: ${totalPlayCount}`);
  console.log(`  Total likes: ${totalLikeCount}`);

  // Show batch3 creators
  console.log('\n  Batch1 creators:');
  for (const [username] of userMap) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, xp, total_quizzes_created, total_plays_received, total_likes_received')
      .eq('username', username)
      .single();
    if (profile) {
      console.log(`    ${profile.username}: ${profile.total_quizzes_created} quizzes, ${profile.total_plays_received} plays, ${profile.total_likes_received} likes, ${profile.xp} XP`);
    }
  }

  // Top batch3 quizzes
  const batch3Ids = quizRecords.map(q => q.id);
  const { data: topQuizzes } = await supabase
    .from('quizzes')
    .select('title, play_count, like_count, difficulty')
    .in('id', batch3Ids)
    .order('play_count', { ascending: false })
    .limit(10);
  console.log('\n  Top 10 batch3 quizzes:');
  for (const q of topQuizzes ?? []) {
    console.log(`    ${q.title}: ${q.play_count} plays, ${q.like_count} likes (${q.difficulty})`);
  }

  console.log('\nBatch2 import complete!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
