// leaderboardPost.js: posts the day's FINAL quiz leaderboard to #daily-quiz,
// ~5 min before the new quiz drops (GitHub Actions cron at 23:55 UTC), so the
// previous day's top scores are always visible. Reads discord_quiz_scores via
// the quiz Supabase anon key (needs the public-read policy, migration 071).
// Skips silently if nobody played that day.
//
//   npm run leaderboard

import 'dotenv/config';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { createClient } from '@supabase/supabase-js';
import { Client, GatewayIntentBits, Events, EmbedBuilder } from 'discord.js';
import { BRAND_COLOR } from './config.js';
import { load } from './store.js';

// supabase-js expects a global WebSocket; Node < 22 (incl. the Actions runner) has none.
if (typeof globalThis.WebSocket === 'undefined') globalThis.WebSocket = WebSocket;

const todayKey = () => new Date().toISOString().split('T')[0];

async function getLeaderboard() {
  const url = process.env.QUIZ_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.QUIZ_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing QUIZ_SUPABASE_URL / QUIZ_SUPABASE_ANON_KEY.');
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.from('discord_quiz_scores')
    .select('username, score, total').eq('quiz_date', todayKey())
    .order('score', { ascending: false }).limit(10);
  if (error) throw error;
  return data || [];
}

async function main() {
  const rows = await getLeaderboard();
  if (!rows.length) { console.log('no scores today, skipping leaderboard'); return; }

  const ids = load();
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(process.env.DISCORD_TOKEN);
  if (!client.isReady()) await once(client, Events.ClientReady);
  const guild = await client.guilds.fetch(process.env.GUILD_ID);

  let channel = null;
  const id = ids.channels['daily-quiz'] || process.env.DAILY_QUIZ_CHANNEL_ID;
  if (id) channel = await guild.channels.fetch(id).catch(() => null);
  if (!channel) {
    await guild.channels.fetch();
    channel = guild.channels.cache.find((c) => c.type === 0 && c.name.endsWith('daily-quiz'));
  }
  if (!channel) throw new Error('daily-quiz channel not found.');

  const medals = ['🥇', '🥈', '🥉'];
  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle("🏆  Today's Final Leaderboard")
    .setDescription(rows.map((r, i) => `${medals[i] || `\`${i + 1}.\``}  **${r.username}**  ·  ${r.score}/${r.total}`).join('\n'))
    .setFooter({ text: 'A new quiz drops in ~5 minutes. Play with /dailyquiz!' });
  await channel.send({ embeds: [embed] });

  console.log(`posted leaderboard with ${rows.length} entries`);
  await client.destroy();
}

main().catch((e) => { console.error('x', e); process.exit(1); });
