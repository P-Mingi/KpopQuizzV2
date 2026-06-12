// Stateless in-Discord quiz: each interaction re-reads today's QOTD and carries
// progress in the button custom_ids (no server memory). Scores + streaks persist
// in discord_quiz_scores via the service-role client (bypasses RLS).

import { createServiceRoleClient } from '@/lib/supabase/server';
import { BRAND_COLOR, reply, ephemeral, postMessage, interactionUser, type Interaction } from './discord';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

interface QuizQuestion {
  question?: string;
  options?: unknown[];
  correct: number | boolean;
  fun_fact?: string;
  clues?: string[];
  image_url?: string;
}
interface Quiz { slug: string; title: string; quiz_type: string; questions: QuizQuestion[]; }

function today(): string { return new Date().toISOString().split('T')[0]!; }
function isoDay(ms: number): string { return new Date(ms).toISOString().split('T')[0]!; }

let cache: { date: string; quiz: Quiz | null } | null = null;
async function getTodaysQuiz(): Promise<Quiz | null> {
  const key = today();
  if (cache && cache.date === key) return cache.quiz;
  const db = createServiceRoleClient();
  const SELECT = 'slug, title, quiz_type, questions';
  const exact = await db.from('quizzes').select(SELECT)
    .eq('status', 'published').eq('is_quiz_of_the_day', true).eq('quiz_of_the_day_date', key).maybeSingle();
  let row = exact.data;
  if (!row) {
    const latest = await db.from('quizzes').select(SELECT)
      .eq('status', 'published').eq('is_quiz_of_the_day', true)
      .order('quiz_of_the_day_date', { ascending: false }).limit(1);
    row = latest.data?.[0] ?? null;
  }
  cache = { date: key, quiz: (row as Quiz | null) };
  return cache.quiz;
}

function choices(quiz: Quiz, q: QuizQuestion): { label: string; correct: boolean }[] {
  if (quiz.quiz_type === 'true_false' || typeof q.correct === 'boolean') {
    return [{ label: 'True', correct: q.correct === true }, { label: 'False', correct: q.correct === false }];
  }
  const opts = Array.isArray(q.options) ? q.options : [];
  return opts.map((o, i) => ({
    label: typeof o === 'string' ? o : ((o as { label?: string })?.label ?? `Option ${i + 1}`),
    correct: i === q.correct,
  }));
}

function questionView(quiz: Quiz, qIndex: number, score: number) {
  const q = quiz.questions[qIndex]!;
  const ch = choices(quiz, q);
  let desc = `**${q.question || 'Pick the answer:'}**`;
  if (quiz.quiz_type === 'guess_from_clues' && Array.isArray(q.clues)) {
    desc += '\n\n' + q.clues.map((c, i) => `\`${i + 1}.\` ${c}`).join('\n');
  }
  desc += '\n\n' + ch.map((c, i) => `**${LETTERS[i]}.**  ${c.label}`).join('\n');
  const embed: Record<string, unknown> = {
    color: BRAND_COLOR,
    author: { name: quiz.title },
    title: `Question ${qIndex + 1} / ${quiz.questions.length}`,
    description: desc.slice(0, 4096),
    footer: { text: `Score: ${score}` },
  };
  if (quiz.quiz_type === 'image' && q.image_url) embed.image = { url: q.image_url };
  const buttons = ch.map((_, i) => ({ type: 2, style: 2, label: LETTERS[i], custom_id: `kq_quiz_a:${qIndex}:${score}:${i}` }));
  return { embeds: [embed], components: [{ type: 1, components: buttons }] };
}

async function recordResult(userId: string, username: string, score: number, total: number): Promise<number> {
  try {
    const db = createServiceRoleClient();
    const date = today();
    const yesterday = isoDay(Date.now() - 86400000);
    const todayRow = (await db.from('discord_quiz_scores').select('score, streak')
      .eq('discord_user_id', userId).eq('quiz_date', date).maybeSingle()).data as { score: number; streak: number } | null;
    if (todayRow) {
      if (score > todayRow.score) {
        await db.from('discord_quiz_scores').update({ score, total, username, updated_at: new Date().toISOString() })
          .eq('discord_user_id', userId).eq('quiz_date', date);
      }
      return todayRow.streak;
    }
    const prev = (await db.from('discord_quiz_scores').select('streak')
      .eq('discord_user_id', userId).eq('quiz_date', yesterday).maybeSingle()).data as { streak: number } | null;
    const streak = prev ? prev.streak + 1 : 1;
    await db.from('discord_quiz_scores').insert({ discord_user_id: userId, quiz_date: date, username, score, total, streak });
    return streak;
  } catch { return 1; }
}

export async function quizStart() {
  const quiz = await getTodaysQuiz();
  if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    return ephemeral('No quiz is set for today yet. Check back soon, or play on kpopquiz.org!');
  }
  return reply(questionView(quiz, 0, 0));
}

export async function quizAnswer(qIndex: number, score: number, choice: number) {
  const quiz = await getTodaysQuiz();
  if (!quiz) return reply({ content: 'That run expired. Start again from #daily-quiz.', embeds: [], components: [] }, true);
  const q = quiz.questions[qIndex];
  if (!q) return reply({ content: 'That run expired. Start again from #daily-quiz.', embeds: [], components: [] }, true);
  const ch = choices(quiz, q);
  const isCorrect = !!ch[choice]?.correct;
  const newScore = score + (isCorrect ? 1 : 0);
  const correctLabel = ch.find((c) => c.correct)?.label ?? 'n/a';
  const embed = {
    color: isCorrect ? 0x4ade80 : 0xf87171,
    author: { name: quiz.title },
    title: isCorrect ? '✅  Correct!' : '❌  Not quite',
    description: `**${q.question || ''}**\n\nAnswer: **${correctLabel}**${q.fun_fact ? `\n\n💡 ${q.fun_fact}` : ''}`,
    footer: { text: `Score: ${newScore} / ${qIndex + 1}` },
  };
  const last = qIndex + 1 >= quiz.questions.length;
  const btn = { type: 2, style: 1, label: last ? 'See results' : 'Next ▶', custom_id: `kq_quiz_n:${qIndex + 1}:${newScore}` };
  return reply({ embeds: [embed], components: [{ type: 1, components: [btn] }] }, true);
}

export async function quizNext(i: Interaction, qIndex: number, score: number) {
  const quiz = await getTodaysQuiz();
  if (!quiz) return reply({ content: 'Start again from #daily-quiz.', embeds: [], components: [] }, true);
  if (qIndex < quiz.questions.length) return reply(questionView(quiz, qIndex, score), true);

  const total = quiz.questions.length;
  const { id, name } = interactionUser(i);
  const streak = await recordResult(id, name, score, total);
  const pct = Math.round((score / total) * 100);
  const rank = pct === 100 ? 'PERFECT RUN 🏆' : pct >= 80 ? 'Bias-level knowledge 💜' : pct >= 50 ? 'Solid stan 🎧' : 'Rookie 🐣';
  const streakLine = streak > 1 ? `\n🔥 **${streak}-day streak!**` : '';
  const embed = {
    color: BRAND_COLOR,
    author: { name: quiz.title },
    title: `🧠  ${score} / ${total}`,
    description: `${rank}${streakLine}\n\nNice run! Share your score with the server below.`,
    footer: { text: "kpopquiz.org · /quizleaderboard for today's top scores" },
  };
  const btn = { type: 2, style: 3, label: 'Share my score', emoji: { name: '📣' }, custom_id: `kq_quiz_sh:${score}:${total}` };
  return reply({ embeds: [embed], components: [{ type: 1, components: [btn] }] }, true);
}

export async function quizShare(i: Interaction, score: number, total: number) {
  const { id } = interactionUser(i);
  const quiz = await getTodaysQuiz();
  if (i.channel_id) {
    await postMessage(i.channel_id, {
      embeds: [{ color: BRAND_COLOR, description: `🧠 <@${id}> scored **${score}/${total}** on today's quiz${quiz ? `: *${quiz.title}*` : ''}` }],
    });
  }
  return reply({ content: 'Shared to the channel! 🎉', embeds: [], components: [] }, true);
}

export async function quizLeaderboard() {
  const db = createServiceRoleClient();
  const { data } = await db.from('discord_quiz_scores').select('username, score, total')
    .eq('quiz_date', today()).order('score', { ascending: false }).limit(10);
  const rows = (data ?? []) as Array<{ username: string; score: number; total: number }>;
  const medals = ['🥇', '🥈', '🥉'];
  const description = rows.length
    ? rows.map((r, i) => `${medals[i] || `\`${i + 1}.\``}  **${r.username}**  ·  ${r.score}/${r.total}`).join('\n')
    : 'No scores yet today. Tap **Play in Discord** in #daily-quiz, or use `/dailyquiz`.';
  return { type: 4, data: { embeds: [{ color: BRAND_COLOR, title: "🏆  Today's Quiz Leaderboard", description }] } };
}
