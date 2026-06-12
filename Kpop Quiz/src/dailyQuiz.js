// dailyQuiz.js: posts the daily quiz announcement to #daily-quiz. Run once a
// day from a scheduler (system cron, pm2 cron, or a GitHub Actions cron):
//
//   npm run daily-quiz
//   # crontab example (09:00 every day): 0 9 * * * cd /path/to/Kpop\ Quiz && npm run daily-quiz
//
// Each run posts a new message (a daily ping in the channel). It does NOT
// @-everyone, to avoid noise; members keep the channel unmuted if they care.

import 'dotenv/config';
import { once } from 'node:events';
import {
  Client, GatewayIntentBits, Events, EmbedBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle,
} from 'discord.js';
import { BRAND_COLOR } from './config.js';
import { getTodaysQuiz } from './quizData.js';
import { load } from './store.js';

const SITE = 'https://kpopquiz.org';

// Deep-link straight to today's Quiz-of-the-Day page. Prefer the real slug from
// the DB (the same source the in-Discord quiz uses, so both buttons match); fall
// back to scraping the homepage, then the homepage itself.
async function todaysQuizUrl() {
  try {
    const q = await getTodaysQuiz();
    if (q?.slug) { console.log('link: QOTD from DB ->', q.slug); return `${SITE}/q/${q.slug}`; }
    console.log('link: DB returned no QOTD');
  } catch (e) { console.log('link: DB read failed:', e.message); }
  try {
    const res = await fetch(SITE + '/', { headers: { 'User-Agent': 'kpopquiz-bot' } });
    const html = await res.text();
    const m = html.match(/href="(\/q\/[^"]+)"/);
    if (m) { console.log('link: scraped homepage ->', m[1]); return SITE + m[1]; }
  } catch (e) { console.log('link: scrape failed:', e.message); }
  console.log('link: homepage fallback');
  return SITE;
}

async function main() {
  const ids = load();
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(process.env.DISCORD_TOKEN);
  if (!client.isReady()) await once(client, Events.ClientReady);
  const guild = await client.guilds.fetch(process.env.GUILD_ID);

  // Resolve the daily-quiz channel: stored ID → env override → by-name (so the
  // GitHub Action works without the gitignored generated-ids.json).
  let channel = null;
  const id = ids.channels['daily-quiz'] || process.env.DAILY_QUIZ_CHANNEL_ID;
  if (id) channel = await guild.channels.fetch(id).catch(() => null);
  if (!channel) {
    await guild.channels.fetch();
    channel = guild.channels.cache.find((c) => c.type === 0 && c.name.endsWith('daily-quiz'));
  }
  if (!channel) throw new Error('daily-quiz channel not found (set DAILY_QUIZ_CHANNEL_ID).');
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC',
  });

  // Idempotent: skip if today's quiz was already posted (guards against extra
  // cron triggers / manual runs within the same UTC day).
  const recent = await channel.messages.fetch({ limit: 20 }).catch(() => null);
  if (recent && recent.some((m) => m.author.id === client.user?.id && m.embeds[0]?.title?.includes(today))) {
    console.log(`daily quiz for ${today} already posted, skipping`);
    await client.destroy();
    return;
  }

  // At 00:00 UTC the new QOTD may not be published yet (the site publishes it
  // lazily on first homepage load). Hit the homepage to trigger that publish so
  // the link + in-Discord quiz read today's quiz, not yesterday's.
  await fetch(`${SITE}/`, { headers: { 'User-Agent': 'kpopquiz-bot' } }).catch(() => {});

  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(`🧠  Daily Quiz · ${today}`)
    .setDescription(
      "Today's K-pop quiz is live! 🎶\n\n" +
      'Guess the songs, idols and MVs, keep your **streak** alive, and drop your score below. 👇\n' +
      'Who can get a perfect run today?')
    .setFooter({ text: 'kpopquiz.org · new quiz every day' });

  const quizUrl = await todaysQuizUrl();
  const row = new ActionRowBuilder().addComponents(
    // Interactive: handled by the worker (quizBot) for an in-Discord run.
    new ButtonBuilder().setStyle(ButtonStyle.Primary).setLabel('Play in Discord').setEmoji('▶️').setCustomId('kq_quiz_start'),
    // Link out to the full web quiz.
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Play on the web').setEmoji('🎧').setURL(quizUrl),
  );

  await channel.send({ embeds: [embed], components: [row] });
  console.log(`daily quiz posted for ${today}`);
  await client.destroy();
}

main().catch((e) => { console.error('x', e); process.exit(1); });
