// registerCommands.js — registers the /dailyquiz and /quizleaderboard slash
// commands to the guild (guild scope = instant; global takes up to an hour).
// Run once after changing the command list.
//
//   npm run register-commands

import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const commands = [
  new SlashCommandBuilder().setName('dailyquiz').setDescription("Play today's K-pop quiz right here").toJSON(),
  new SlashCommandBuilder().setName('quizleaderboard').setDescription("See today's quiz leaderboard").toJSON(),
];

async function main() {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  const app = await rest.get(Routes.oauth2CurrentApplication());
  await rest.put(Routes.applicationGuildCommands(app.id, process.env.GUILD_ID), { body: commands });
  console.log(`✓ registered ${commands.length} slash commands to guild ${process.env.GUILD_ID}`);
}

main().catch((e) => { console.error('x', e); process.exit(1); });
