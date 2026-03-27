import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Load .env.local manually
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
  question?: string;
  clues?: string[];
  options?: string[];
  correct: number | boolean;
  fun_fact?: string;
}

async function main() {
  const { data: quizzes, error } = await supabase
    .from('quizzes')
    .select(`
      id, title, slug, quiz_type, questions, status, play_count,
      groups!inner(name),
      profiles!inner(username)
    `)
    .eq('status', 'published')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching quizzes:', error);
    process.exit(1);
  }

  console.log(`Found ${quizzes.length} published quizzes.\n`);

  let output = `# KpopQuizz Content Audit\n`;
  output += `# Generated: ${new Date().toISOString()}\n`;
  output += `# Total published quizzes: ${quizzes.length}\n\n`;

  for (const quiz of quizzes) {
    const group = quiz.groups as unknown as { name: string };
    const profile = quiz.profiles as unknown as { username: string };

    output += `${'='.repeat(70)}\n`;
    output += `QUIZ: "${quiz.title}"\n`;
    output += `ID: ${quiz.id}\n`;
    output += `Group: ${group.name}\n`;
    output += `Creator: ${profile.username}\n`;
    output += `Type: ${quiz.quiz_type}\n`;
    output += `Plays: ${quiz.play_count}\n`;
    output += `Slug: /q/${quiz.slug}\n`;
    output += `${'='.repeat(70)}\n\n`;

    const questions = quiz.questions as Question[];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]!;
      output += `  Q${i + 1}: ${q.question || q.clues?.join(' / ')}\n`;

      if (quiz.quiz_type === 'true_false') {
        output += `  Answer: ${q.correct === true ? 'TRUE' : 'FALSE'}\n`;
      } else if (quiz.quiz_type === 'multiple_choice' || quiz.quiz_type === 'guess_from_clues') {
        if (q.options) {
          for (let j = 0; j < q.options.length; j++) {
            const marker = j === q.correct ? ' <<< CORRECT' : '';
            output += `    ${String.fromCharCode(65 + j)}) ${q.options[j]}${marker}\n`;
          }
        }
      }

      if (q.fun_fact) {
        output += `  Fun fact: ${q.fun_fact}\n`;
      }
      output += `\n`;
    }
    output += `\n`;
  }

  fs.writeFileSync('quiz-audit-data.txt', output, 'utf-8');
  console.log(`Exported to quiz-audit-data.txt (${(output.length / 1024).toFixed(1)} KB)`);
}

main();
