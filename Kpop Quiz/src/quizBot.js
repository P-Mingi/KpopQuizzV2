// quizBot.js — native in-Discord daily quiz (v1). Exposes handleQuizInteraction()
// which the menu worker (roleMenu.js) wires to button interactions, so it shares
// the one gateway connection (no duplicate bot login).
//
// Per-user PRIVATE (ephemeral) run: tap "Play in Discord" on the daily post,
// answer A/B/C/D, get correct/wrong + fun fact, see your score, then optionally
// share a spoiler-free card to the channel. Correct answers stay server-side
// until you answer. Sessions are in-memory (v1, no persistence): a worker
// restart just makes players start over.

import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { BRAND_COLOR } from './config.js';
import { getTodaysQuiz } from './quizData.js';

const sessions = new Map(); // userId -> { quiz, qIndex, score }
let cache = { date: null, quiz: null };
const LETTERS = ['A', 'B', 'C', 'D', 'E'];
const OK = 0x4ade80;
const NO = 0xf87171;

async function todaysQuiz() {
  const key = new Date().toISOString().split('T')[0];
  if (cache.date !== key) cache = { date: key, quiz: await getTodaysQuiz() };
  return cache.quiz;
}

// Answer choices as [{ label, correct }], normalised across question shapes.
function choices(quiz, q) {
  if (quiz.quiz_type === 'true_false' || typeof q.correct === 'boolean') {
    return [{ label: 'True', correct: q.correct === true }, { label: 'False', correct: q.correct === false }];
  }
  const opts = Array.isArray(q.options) ? q.options : [];
  return opts.map((o, i) => ({
    label: typeof o === 'string' ? o : (o?.label ?? `Option ${i + 1}`),
    correct: i === q.correct,
  }));
}

function questionView(session) {
  const { quiz, qIndex } = session;
  const q = quiz.questions[qIndex];
  const ch = choices(quiz, q);

  let desc = `**${q.question || 'Pick the answer:'}**`;
  if (quiz.quiz_type === 'guess_from_clues' && Array.isArray(q.clues)) {
    desc += '\n\n' + q.clues.map((c, i) => `\`${i + 1}.\` ${c}`).join('\n');
  }
  desc += '\n\n' + ch.map((c, i) => `**${LETTERS[i]}.**  ${c.label}`).join('\n');

  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setAuthor({ name: quiz.title })
    .setTitle(`Question ${qIndex + 1} / ${quiz.questions.length}`)
    .setDescription(desc.slice(0, 4096))
    .setFooter({ text: `Score: ${session.score}` });
  if (quiz.quiz_type === 'image' && q.image_url) embed.setImage(q.image_url);

  const row = new ActionRowBuilder().addComponents(
    ch.map((_, i) => new ButtonBuilder().setCustomId(`kq_quiz_ans_${i}`).setLabel(LETTERS[i]).setStyle(ButtonStyle.Secondary)),
  );
  return { embeds: [embed], components: [row] };
}

async function start(interaction) {
  let quiz;
  try { quiz = await todaysQuiz(); }
  catch (e) { console.error('quiz load:', e.message); }
  if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    return interaction.reply({ content: 'No quiz is set for today yet. Check back soon, or play on kpopquiz.org!', flags: MessageFlags.Ephemeral });
  }
  sessions.set(interaction.user.id, { quiz, qIndex: 0, score: 0 });
  return interaction.reply({ ...questionView(sessions.get(interaction.user.id)), flags: MessageFlags.Ephemeral });
}

async function answer(interaction, idx) {
  const session = sessions.get(interaction.user.id);
  if (!session) return interaction.reply({ content: 'That run expired. Tap **Play in Discord** on the daily post to start again.', flags: MessageFlags.Ephemeral });

  const q = session.quiz.questions[session.qIndex];
  const ch = choices(session.quiz, q);
  const isCorrect = !!ch[idx]?.correct;
  if (isCorrect) session.score += 1;
  const correctLabel = ch.find((c) => c.correct)?.label ?? 'n/a';

  const embed = new EmbedBuilder()
    .setColor(isCorrect ? OK : NO)
    .setAuthor({ name: session.quiz.title })
    .setTitle(isCorrect ? '✅  Correct!' : '❌  Not quite')
    .setDescription(`**${q.question || ''}**\n\nAnswer: **${correctLabel}**${q.fun_fact ? `\n\n💡 ${q.fun_fact}` : ''}`)
    .setFooter({ text: `Score: ${session.score} / ${session.qIndex + 1}` });

  const last = session.qIndex + 1 >= session.quiz.questions.length;
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('kq_quiz_next').setLabel(last ? 'See results' : 'Next ▶').setStyle(ButtonStyle.Primary),
  );
  return interaction.update({ embeds: [embed], components: [row] });
}

async function next(interaction) {
  const session = sessions.get(interaction.user.id);
  if (!session) return interaction.reply({ content: 'Tap **Play in Discord** on the daily post to start.', flags: MessageFlags.Ephemeral });

  session.qIndex += 1;
  if (session.qIndex < session.quiz.questions.length) {
    return interaction.update(questionView(session));
  }

  const total = session.quiz.questions.length;
  const pct = Math.round((session.score / total) * 100);
  const rank = pct === 100 ? 'PERFECT RUN 🏆'
    : pct >= 80 ? 'Bias-level knowledge 💜'
    : pct >= 50 ? 'Solid stan 🎧'
    : 'Rookie 🐣';

  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setAuthor({ name: session.quiz.title })
    .setTitle(`🧠  ${session.score} / ${total}`)
    .setDescription(`${rank}\n\nNice run! Share your score with the server below.`)
    .setFooter({ text: 'kpopquiz.org' });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('kq_quiz_share').setLabel('Share my score').setEmoji('📣').setStyle(ButtonStyle.Success),
  );
  return interaction.update({ embeds: [embed], components: [row] });
}

async function share(interaction) {
  const session = sessions.get(interaction.user.id);
  if (!session) return interaction.update({ content: 'Already shared!', embeds: [], components: [] });
  const total = session.quiz.questions.length;
  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setDescription(`🧠 <@${interaction.user.id}> scored **${session.score}/${total}** on today's quiz: *${session.quiz.title}*`);
  await interaction.channel?.send({ embeds: [embed] }).catch(() => {});
  sessions.delete(interaction.user.id);
  return interaction.update({ content: 'Shared to the channel! 🎉', embeds: [], components: [] });
}

// Wired by the menu worker for button interactions. Returns true if handled.
export async function handleQuizInteraction(interaction) {
  if (!interaction.isButton()) return false;
  const id = interaction.customId;
  if (!id.startsWith('kq_quiz_')) return false;

  if (id === 'kq_quiz_start') await start(interaction);
  else if (id.startsWith('kq_quiz_ans_')) await answer(interaction, parseInt(id.slice('kq_quiz_ans_'.length), 10));
  else if (id === 'kq_quiz_next') await next(interaction);
  else if (id === 'kq_quiz_share') await share(interaction);
  return true;
}
