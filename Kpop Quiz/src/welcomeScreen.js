// welcomeScreen.js — sets the Community Welcome Screen (the card new members see
// when they land), with a short description and up to 5 featured channels.
//
//   npm run welcome-screen

import 'dotenv/config';
import { once } from 'node:events';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import { load } from './store.js';

async function main() {
  const ids = load();
  const ch = (n) => ids.channels[n];
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(process.env.DISCORD_TOKEN);
  if (!client.isReady()) await once(client, Events.ClientReady);
  const guild = await client.guilds.fetch(process.env.GUILD_ID);

  const welcomeChannels = [
    { channel: ch('rules'), description: 'Read this first', emoji: '📜' },
    { channel: ch('roles'), description: 'Pick your bias groups', emoji: '🎀' },
    { channel: ch('daily-quiz'), description: "Play today's quiz", emoji: '🧠' },
    { channel: ch('introduce-yourself'), description: 'Say hi 👋', emoji: '🌟' },
    { channel: ch('general'), description: 'Hang out with stans', emoji: '💬' },
  ].filter((c) => c.channel);

  await guild.editWelcomeScreen({
    enabled: true,
    description: 'Daily K-pop quizzes, blindtests & a home for every stan. 🐰💗',
    welcomeChannels,
  });

  console.log(`✓ Welcome screen set — ${welcomeChannels.length} featured channels.`);
  await client.destroy();
}

main().catch((e) => { console.error('x welcome-screen:', e.message); process.exit(1); });
