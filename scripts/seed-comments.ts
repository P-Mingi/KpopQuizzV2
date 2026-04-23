import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Load env
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

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Returns a random date between `daysAgoMin` and `daysAgoMax` days in the past */
function randomPastDate(daysAgoMin: number, daysAgoMax: number): string {
  const d = new Date();
  d.setDate(d.getDate() - randomBetween(daysAgoMin, daysAgoMax));
  d.setHours(randomBetween(8, 23), randomBetween(0, 59), randomBetween(0, 59));
  return d.toISOString();
}

// ============================================================
// Comment pool (52 approved comments)
// ============================================================

const COMMENTS = [
  // Positive reactions (general)
  'this was so fun! got most of them right',
  'harder than I expected lol',
  'ok this humbled me',
  'screaming at my score rn',
  'finally a quiz that\'s actually challenging',
  'this brought back so many memories',
  'the questions were so well picked',
  'obsessed with this quiz ngl',

  // Score-related
  '8/10 not bad for my first try',
  'got 100% lets gooo',
  'how did I miss that one',
  'I knew every single answer let\'s go',
  'the last question got me',
  'I guessed half of these but somehow passed',
  'need to retake this immediately',
  'perfect score on the first try!!',
  'so close to perfect ugh',

  // Fan identity
  'my bias would be proud of me',
  'this is why I spend hours on fandom wikis',
  'stream their music and take their quizzes',

  // Requesting more
  'make more like this please!!',
  'we need a part 2',
  'can you make one about their solos?',
  'do one for b-sides next!',
  'more hard mode quizzes please',

  // Group-specific
  'army forever',
  'blinks unite',
  'my stays will ace this',
  'carats know everything',
  'onces rise',

  // Casual/short
  'loved it!',
  'so good',
  'best quiz on here',
  'W quiz',
  'this was everything',

  // Competitive
  'sending this to my friend who thinks they know everything',
  'I refuse to accept this score',
  'top 72% lets goooo',

  // Nostalgia/emotional
  'the debut era questions hit different',
  'getting emotional remembering all of this',
  'this quiz took me back to 2020',
  'the golden era of kpop right here',

  // Fun/personality
  'my multistan brain is confused',
  'I panicked on the timer questions lol',
  'took this quiz at 3am and no regrets',
  'my kpop knowledge finally paying off',
  'the way I yelled when I got it right',

  // Quality praise
  'whoever made this quiz is a real one',
  'this is better than most quiz apps tbh',
  'the fun facts are actually interesting',
  'love that the questions aren\'t just basic stuff',
  'quality quiz right here',
];

// ============================================================
// Main
// ============================================================

async function main() {
  console.log('--- Seed Comments ---\n');

  // 1. Fetch all fake users from profiles by known usernames
  const FAKE_USERNAMES = [
    'army_mina97', 'jimin_universe', 'blink_forever22', 'stay_dreamer',
    'carat_hoshi', 'once_upon_sana', 'my_winter99', 'bunny_haerin',
    'exol_chen', 'midzy_ryujin', 'engene_jake', 'moa_yeonjun',
    'reveluv_joy', 'atiny_wooyoung', 'neverland_soyeon', 'dive_wonyoung',
    'fearnot_yunjin', 'shawol_taemin', 'melody_btob', 'kpop_scholar',
    'stan_attacker', 'hallyu_nerd',
    // import-batch creators
    'soojinnie', 'joonified', 'pinkvelvet', 'caratland', 'skzrealm',
    'njeansstan', 'kpophistory', 'twiceland', 'exoplanet99',
  ];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username')
    .in('username', FAKE_USERNAMES);

  if (!profiles || profiles.length === 0) {
    console.error('No fake users found. Run seed-platform first.');
    process.exit(1);
  }

  const fakeUsers = profiles.map((p) => p.id);

  const userMap = new Map<string, string>();
  for (const p of profiles ?? []) {
    userMap.set(p.id, p.username);
  }

  console.log(`Found ${userMap.size} fake users with profiles`);

  // 2. Fetch quizzes with 2+ plays
  const { data: quizzes, error: quizErr } = await supabase
    .from('quizzes')
    .select('id, title, play_count, creator_id')
    .gte('play_count', 2);

  if (quizErr) throw quizErr;
  if (!quizzes || quizzes.length === 0) {
    console.log('No quizzes with 2+ plays found.');
    return;
  }

  console.log(`Found ${quizzes.length} quizzes with 2+ plays`);

  // 3. Check for existing seeded comments to avoid duplicates
  const { data: existingComments } = await supabase
    .from('quiz_comments')
    .select('quiz_id, user_id')
    .in('user_id', fakeUsers);

  const existingSet = new Set(
    (existingComments ?? []).map((c) => `${c.quiz_id}:${c.user_id}`),
  );

  // 4. Pick ~70% of eligible quizzes
  const shuffled = [...quizzes].sort(() => Math.random() - 0.5);
  const target = Math.round(shuffled.length * 0.7);
  const selected = shuffled.slice(0, target);

  console.log(`Selected ${selected.length} quizzes to receive comments\n`);

  const allUserIds = Array.from(userMap.keys());
  const rows: Array<{
    quiz_id: string;
    user_id: string;
    username: string;
    content: string;
    created_at: string;
  }> = [];

  for (const quiz of selected) {
    const commentCount = randomBetween(1, 3);
    // Pick random unique users for this quiz
    const availableUsers = allUserIds
      .filter((uid) => uid !== quiz.creator_id && !existingSet.has(`${quiz.id}:${uid}`))
      .sort(() => Math.random() - 0.5);

    const usersForQuiz = availableUsers.slice(0, commentCount);

    // Track used comments per quiz to avoid duplicates on same quiz
    const usedComments = new Set<string>();

    for (const userId of usersForQuiz) {
      let comment: string;
      do {
        comment = pickRandom(COMMENTS);
      } while (usedComments.has(comment));
      usedComments.add(comment);

      rows.push({
        quiz_id: quiz.id,
        user_id: userId,
        username: userMap.get(userId) ?? 'anonymous',
        content: comment,
        created_at: randomPastDate(1, 14),
      });
    }
  }

  console.log(`Inserting ${rows.length} comments...`);

  // 5. Insert in batches of 100
  const BATCH = 100;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error: insertErr } = await supabase
      .from('quiz_comments')
      .insert(batch);

    if (insertErr) {
      console.error(`Batch ${i / BATCH + 1} failed:`, insertErr.message);
    } else {
      inserted += batch.length;
    }
  }

  console.log(`\nDone! Inserted ${inserted} comments across ${selected.length} quizzes.`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
