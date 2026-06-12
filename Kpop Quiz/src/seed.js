// seed.js — posts the branded #welcome and #rules embeds via the bot.
// Idempotent: stores the message IDs and edits them on re-run instead of
// re-posting. Edit the copy below (or the embeds) and re-run to update.
//
//   npm run seed

import 'dotenv/config';
import { once } from 'node:events';
import { Client, GatewayIntentBits, Events, EmbedBuilder } from 'discord.js';
import { BRAND_COLOR } from './config.js';
import { load, save } from './store.js';

const SITE = 'https://kpopquiz.org';

const welcomeEmbed = () => new EmbedBuilder()
  .setColor(BRAND_COLOR)
  .setTitle('🐰  Welcome to kpopquiz!')
  .setDescription(
    `You made it! Welcome to the official community for **[kpopquiz.org](${SITE})** 💗\n\n` +
    'Daily K-pop quizzes, blindtests, 1v1 battles, and a home to flex your bias knowledge with ' +
    "fellow stans. Day-one ARMY or just fell down the rabbit hole, there's a seat for you here. 🎧")
  .addFields(
    { name: '🎯  What is kpopquiz?',
      value: `A daily K-pop guessing game at **[kpopquiz.org](${SITE})**. Guess songs, idols, MVs and ` +
             'lyrics, keep your streak, and climb the leaderboard.' },
    { name: '🚀  Get started in 3 steps',
      value: '`1.`  Read the **#rules** 📜\n' +
             "`2.`  Grab your bias roles in **#roles** 🎀 (unlocks your group's channel)\n" +
             '`3.`  Play today in **#daily-quiz** 🧠 and drop your score!' },
    { name: '💬  Hang out',
      value: 'Say hi in **#introduce-yourself**, chat in **#general**, and request quizzes in **#quiz-requests**.' },
  )
  .setFooter({ text: 'kpopquiz.org · made by stans, for stans' });

const rulesEmbed = () => new EmbedBuilder()
  .setColor(BRAND_COLOR)
  .setTitle('📜  Server Rules')
  .setDescription(
    "Keep kpopquiz fun and welcoming for everyone. TL;DR: don't be the reason we can't have nice things. 💗\n\n" +
    '**1. Be kind.** Respect every fandom and member. No harassment, hate, racism, homophobia, or fanwars. Stan whoever you want.\n' +
    '**2. No leaks or pirated content.** No ripped albums, leaked tracks, or full MV reuploads.\n' +
    '**3. Keep it SFW.** No NSFW, gore, or shock content.\n' +
    '**4. No spam or unapproved self-promo.** No advertising servers, links, or socials without staff OK.\n' +
    '**5. Use the right channels.** Read the topics, stay on-topic, tag spoilers.\n' +
    '**6. No drama or doxxing.** Keep personal info private; drop fights or take them to DMs.\n' +
    '**7. English-friendly,** but our chosen community languages are welcome, just stay understandable.\n' +
    "**8. Follow Discord's ToS & Community Guidelines.** You must be 13+.\n" +
    '**9. Listen to staff.** Mods have final say. DM one if you need help.')
  .setFooter({ text: 'By chatting here you agree to these rules. · kpopquiz.org' });

// Post or edit-in-place using a stored message id.
async function upsert(channel, storedId, embed) {
  if (storedId) {
    const existing = await channel.messages.fetch(storedId).catch(() => null);
    if (existing) { await existing.edit({ embeds: [embed] }); return existing.id; }
  }
  const msg = await channel.send({ embeds: [embed] });
  return msg.id;
}

async function main() {
  const ids = load();
  ids.seed = ids.seed || {};
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(process.env.DISCORD_TOKEN);
  if (!client.isReady()) await once(client, Events.ClientReady);
  const guild = await client.guilds.fetch(process.env.GUILD_ID);

  const welcomeCh = await guild.channels.fetch(ids.channels['welcome']);
  const rulesCh = await guild.channels.fetch(ids.channels['rules']);

  ids.seed.welcomeMessageId = await upsert(welcomeCh, ids.seed.welcomeMessageId, welcomeEmbed());
  console.log('welcome embed posted');
  ids.seed.rulesMessageId = await upsert(rulesCh, ids.seed.rulesMessageId, rulesEmbed());
  console.log('rules embed posted');

  save(ids);
  await client.destroy();
}

main().catch((e) => { console.error('x', e); process.exit(1); });
