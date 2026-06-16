// birthdays.js — posts idol birthday cards to #birthdays every morning.
//
// Runs daily via GitHub Actions at 09:00 UTC. Reads birthdays.json, finds
// everyone whose MM-DD matches today (UTC), and posts a rich embed for each.
// Dedup: if the idol's name already appears in the last 20 messages, skip
// (guards against manual workflow re-runs on the same day).
//
//   npm run birthdays      # run manually
//
// Requires DISCORD_TOKEN and GUILD_ID in .env.

import 'dotenv/config';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { Client, GatewayIntentBits, Events } from 'discord.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const BIRTHDAYS = JSON.parse(readFileSync(join(__dir, 'birthdays.json'), 'utf8'));

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function todayMMDD() {
  const now = new Date();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  return `${mm}-${dd}`;
}

function age(birthYear) {
  return new Date().getUTCFullYear() - birthYear;
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function buildEmbed(idol, today) {
  const [mm, dd] = today.split('-').map(Number);
  const monthName = MONTHS[mm - 1];
  const currentAge = age(idol.year);

  return {
    embeds: [{
      title: `Happy Birthday, ${idol.name}! 🎂`,
      description: `**${idol.name}** from **${idol.group}** is celebrating their ${ordinal(currentAge)} birthday today!\n\nWe love you and wish you happiness, good health, and incredible music. 💖`,
      color: idol.color,
      fields: [
        { name: 'Group', value: idol.group, inline: true },
        { name: 'Turning', value: `${currentAge}`, inline: true },
        { name: 'Date', value: `${monthName} ${dd}`, inline: true },
      ],
      footer: {
        text: 'kpopquiz.org | Idol Birthday Calendar',
      },
      timestamp: new Date().toISOString(),
    }],
  };
}

async function recentNames(channel) {
  const msgs = await channel.messages.fetch({ limit: 20 }).catch(() => null);
  if (!msgs) return new Set();
  const names = new Set();
  for (const msg of msgs.values()) {
    for (const embed of msg.embeds ?? []) {
      const title = embed.title ?? '';
      const m = title.match(/^Happy Birthday, (.+)!/);
      if (m) names.add(m[1]);
    }
  }
  return names;
}

async function main() {
  const missing = ['DISCORD_TOKEN', 'GUILD_ID'].filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`Missing env: ${missing.join(', ')}`);
    process.exit(1);
  }

  const today = todayMMDD();
  const celebrants = BIRTHDAYS.filter((i) => i.birthday === today);

  if (celebrants.length === 0) {
    console.log(`No birthdays today (${today}). Nothing to post.`);
    return;
  }

  console.log(`Birthdays on ${today}: ${celebrants.map((i) => i.name).join(', ')}`);

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(process.env.DISCORD_TOKEN);
  if (!client.isReady()) await once(client, Events.ClientReady);

  const guild = await client.guilds.fetch(process.env.GUILD_ID);
  await guild.channels.fetch();

  const channel = guild.channels.cache.find(
    (c) => c.type === 0 && (c.name === 'birthdays' || c.name.endsWith('birthdays')),
  );

  if (!channel) {
    console.error('Could not find #birthdays channel.');
    await client.destroy();
    process.exit(1);
  }

  const alreadyPosted = await recentNames(channel);

  let posted = 0;
  for (const idol of celebrants) {
    if (alreadyPosted.has(idol.name)) {
      console.log(`  skip ${idol.name} (already posted today)`);
      continue;
    }
    await channel.send(buildEmbed(idol, today));
    console.log(`  posted: ${idol.name} (${idol.group})`);
    posted++;
  }

  console.log(`Done. Posted ${posted} birthday card(s).`);
  await client.destroy();
}

main().catch((err) => { console.error('birthdays.js failed:', err); process.exit(1); });
