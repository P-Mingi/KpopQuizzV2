// dailyQuiz.js — posts the daily quiz announcement to #daily-quiz. Run once a
// day from a scheduler (system cron, pm2 cron, or a GitHub Actions cron):
//
//   npm run daily-quiz
//   # crontab example (09:00 every day): 0 9 * * * cd /path/to/Kpop\ Quiz && npm run daily-quiz
//
// Each run posts a new message (a daily ping in the channel). It does NOT
// @-everyone, to avoid noise — members keep the channel unmuted if they care.

import 'dotenv/config';
import { once } from 'node:events';
import {
  Client, GatewayIntentBits, Events, EmbedBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle,
} from 'discord.js';
import { BRAND_COLOR } from './config.js';
import { load } from './store.js';

const SITE = 'https://kpopquiz.org';

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

  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(`🧠  Daily Quiz · ${today}`)
    .setDescription(
      "Today's K-pop quiz is live! 🎶\n\n" +
      'Guess the songs, idols and MVs, keep your **streak** alive, and drop your score below. 👇\n' +
      'Who can get a perfect run today?')
    .setFooter({ text: 'kpopquiz.org · new quiz every day' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Play today's quiz").setEmoji('🎧').setURL(SITE),
  );

  await channel.send({ embeds: [embed], components: [row] });
  console.log(`daily quiz posted for ${today}`);
  await client.destroy();
}

main().catch((e) => { console.error('x', e); process.exit(1); });
