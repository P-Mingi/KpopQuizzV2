// botGuides.js — posts + pins how-to cards for the server's bots:
//   • KMQ "how to play blindtest" in the blindtest channels (member-facing)
//   • a "server bots" overview in #bot-commands (staff-facing)
// Idempotent: edits the pinned card on re-run (ids stored under ids.botGuides).
//
//   npm run bot-guides

import 'dotenv/config';
import { once } from 'node:events';
import { Client, GatewayIntentBits, Events, EmbedBuilder } from 'discord.js';
import { BRAND_COLOR } from './config.js';
import { load, save } from './store.js';

const kmqEmbed = () => new EmbedBuilder()
  .setColor(BRAND_COLOR)
  .setTitle('🎧  How to play Blindtest (KMQ)')
  .setDescription(
    'Blindtests run on the **KMQ** bot, live in voice. Guess the K-pop song before anyone else!\n\n' +
    '**How to play**\n' +
    '`1.`  Join 🎧・blindtest-vc\n' +
    '`2.`  Type `/play` — KMQ starts playing a random K-pop song\n' +
    '`3.`  Be the first to type the **song title** in chat to win the point\n\n' +
    '**Handy commands**\n' +
    '`/options`  customize the game (by group, year, popularity, number of songs)\n' +
    '`/hint`  get a hint   `/skip`  vote to skip the current song\n' +
    '`/locale Français`  switch language\n' +
    '`/play elimination 5`  last-stan-standing mode, everyone starts with 5 lives\n' +
    '`/leaderboard`  see the top guessers\n\n' +
    'Tip: turn the volume up and trust your ears. 🎶')
  .setFooter({ text: 'KMQ · the K-pop Music Quiz bot' });

const botsEmbed = () => new EmbedBuilder()
  .setColor(BRAND_COLOR)
  .setTitle('🤖  Server bots (staff reference)')
  .setDescription(
    "What each bot does and where it's set up:\n\n" +
    '**KMQ (K-pop Music Quiz)** — runs blindtests in voice. Members use `/play` in 🎧・blindtest-vc. Nothing to configure.\n\n' +
    '**Carl-bot** — the admin toolkit, configured on its website **carl.gg** (log in, pick this server). Use it for:\n' +
    '• reaction / dropdown **roles** (can replace the hosted role-menu process)\n' +
    '• **logging** (set the log channel to #mod-log)\n' +
    '• **automod**, **starboard**, auto-responders\n\n' +
    '**Kpop Quiz** (our own bot) — built the server; runs the role menu, the daily-quiz post, and AutoMod alerts.\n\n' +
    'Native Discord **AutoMod** also auto-blocks NSFW/slurs, spam, mention-raids and invite ads.')
  .setFooter({ text: 'Mods only' });

async function upsert(channel, storedId, embed, pin) {
  let msg = storedId ? await channel.messages.fetch(storedId).catch(() => null) : null;
  if (msg) await msg.edit({ embeds: [embed] });
  else msg = await channel.send({ embeds: [embed] });
  if (pin) await msg.pin().catch(() => {});
  return msg.id;
}

async function main() {
  const ids = load();
  ids.botGuides = ids.botGuides || {};
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(process.env.DISCORD_TOKEN);
  if (!client.isReady()) await once(client, Events.ClientReady);
  const guild = await client.guilds.fetch(process.env.GUILD_ID);

  const post = async (key, channelName, embed) => {
    const id = ids.channels[channelName];
    if (!id) return;
    const channel = await guild.channels.fetch(id).catch(() => null);
    if (!channel) return;
    ids.botGuides[key] = await upsert(channel, ids.botGuides[key], embed, true);
    console.log(`✓ ${channelName}`);
  };

  await post('kmq-vc', 'blindtest-vc', kmqEmbed());
  await post('kmq-text', 'blindtest', kmqEmbed());
  await post('bots', 'bot-commands', botsEmbed());

  save(ids);
  await client.destroy();
}

main().catch((e) => { console.error('x', e); process.exit(1); });
