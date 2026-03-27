import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx);
  const val = trimmed.slice(eqIdx + 1);
  if (!process.env[key]) process.env[key] = val;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface Question {
  question: string;
  options?: string[];
  correct: number | boolean;
  fun_fact?: string;
  clues?: string[];
}

async function fixQuiz(quizId: string, label: string, patchFn: (questions: Question[]) => Question[]) {
  const { data, error } = await supabase
    .from('quizzes')
    .select('questions')
    .eq('id', quizId)
    .single();

  if (error || !data) {
    console.error(`  SKIP ${label}: quiz not found (${error?.message})`);
    return;
  }

  const questions = data.questions as Question[];
  const patched = patchFn(questions);

  const { error: updateError } = await supabase
    .from('quizzes')
    .update({ questions: patched as unknown as Record<string, unknown>[], updated_at: new Date().toISOString() })
    .eq('id', quizId);

  if (updateError) {
    console.error(`  FAIL ${label}: ${updateError.message}`);
  } else {
    console.log(`  OK   ${label}`);
  }
}

async function main() {
  console.log('Applying audit fixes...\n');

  // FIX 1: BTS world records Q2 - "2019" -> "2020"
  await fixQuiz(
    'a0189d77-42f3-499b-b6c3-e880ee158e21',
    'BTS world records Q2: year 2019 -> 2020',
    (qs) => {
      qs[1]!.question = 'BTS performed at which major US awards show in 2020 with Lil Nas X?';
      return qs;
    },
  );

  // FIX 2: BTS world records Q6 - correct answer 3 -> 4, fix fun fact
  await fixQuiz(
    'a0189d77-42f3-499b-b6c3-e880ee158e21',
    'BTS world records Q6: 3 consecutive -> 4',
    (qs) => {
      qs[5]!.correct = 2; // C) 4
      qs[5]!.fun_fact = 'Dynamite, Life Goes On, Butter, and Permission to Dance all debuted at #1 consecutively.';
      return qs;
    },
  );

  // FIX 3: BLACKPINK title tracks Q2 - Ice Cream -> How You Like That
  await fixQuiz(
    '08fbc359-7486-40ba-8cbd-652dd2c63fbe',
    'BLACKPINK title tracks Q2: Ice Cream -> How You Like That',
    (qs) => {
      qs[1]!.correct = 1; // B) How You Like That
      qs[1]!.fun_fact = 'How You Like That reached #1 on the Billboard Digital Song Sales chart in 2020.';
      return qs;
    },
  );

  // FIX 4: Stray Kids achievements Q1 - 4 albums -> 5 albums
  await fixQuiz(
    '31148326-a073-42ee-be52-c91f98181742',
    'Stray Kids achievements Q1: 4 -> 5 Billboard 200 #1s',
    (qs) => {
      qs[0]!.options = ['1', '2', '3', '5'];
      qs[0]!.correct = 3; // D) 5
      qs[0]!.fun_fact = 'ODDINARY, MAXIDENT, 5-STAR, Rock-Star, and ATE all reached #1 on the Billboard 200.';
      return qs;
    },
  );

  // FIX 5: TWICE Sixteen to stardom Q4 - 2018 -> 2017
  await fixQuiz(
    '9617acc8-a94f-468f-b175-23caab6ab35f',
    'TWICE Sixteen Q4: first tour 2018 -> 2017',
    (qs) => {
      qs[3]!.correct = 1; // B) 2017
      return qs;
    },
  );

  console.log('\nDone.');
}

main();
