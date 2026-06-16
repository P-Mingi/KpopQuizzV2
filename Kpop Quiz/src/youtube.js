// youtube.js: posts new videos from each group's OFFICIAL YouTube channel into
// that group's Discord channel. Posts the watch link so Discord renders the
// native YouTube preview (thumbnail + title) without copying/hosting anything.
// Reads the free, official per-channel RSS feed. Deduped by scanning the
// channel's recent messages for the video id, so no state is stored.
//
//   npm run youtube

import 'dotenv/config';
import { once } from 'node:events';
import Parser from 'rss-parser';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import { GROUP_YOUTUBE } from './config.js';
import { load } from './store.js';

const MAX_PER_GROUP = 2; // don't flood a channel if a group uploaded a batch
const slug = (g) => g.toLowerCase().replace(/\s+/g, '-');
const feedUrl = (id) => `https://www.youtube.com/feeds/videos.xml?channel_id=${id}`;

function videoId(item) {
  return (item.id || '').replace('yt:video:', '')
    || (item.link || '').match(/[?&]v=([\w-]{11})/)?.[1]
    || '';
}

async function recentVideoIds(channel) {
  const ids = new Set();
  const msgs = await channel.messages.fetch({ limit: 40 }).catch(() => null);
  if (msgs) for (const m of msgs.values()) {
    for (const mt of (m.content || '').matchAll(/(?:youtu\.be\/|[?&]v=)([\w-]{11})/g)) ids.add(mt[1]);
  }
  return ids;
}

async function main() {
  const ids = load();
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(process.env.DISCORD_TOKEN);
  if (!client.isReady()) await once(client, Events.ClientReady);
  const guild = await client.guilds.fetch(process.env.GUILD_ID);
  await guild.channels.fetch(); // populate cache for the by-name fallback (CI has no generated-ids.json)
  const parser = new Parser({ timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0 (kpopquiz-bot)' } });
  let posted = 0;

  for (const [group, ytId] of Object.entries(GROUP_YOUTUBE)) {
    // Resolve the group's Discord channel: stored ID, else by decorated name.
    const s = slug(group);
    let channel = null;
    if (ids.channels[s]) channel = await guild.channels.fetch(ids.channels[s]).catch(() => null);
    if (!channel) channel = guild.channels.cache.find((c) => c.type === 0 && c.name.endsWith(s));
    if (!channel) continue;

    let feed;
    try { feed = await parser.parseURL(feedUrl(ytId)); }
    catch (e) { console.error(`${group} feed error:`, e.message); continue; }

    const seen = await recentVideoIds(channel);
    const fresh = (feed.items || []).slice(0, MAX_PER_GROUP)
      .filter((it) => { const v = videoId(it); return v && !seen.has(v); });

    for (const item of fresh.reverse()) {
      await channel.send({ content: `🎬 **${group}** just posted a new video!\n${item.link}` });
      posted += 1;
      await new Promise((s) => setTimeout(s, 800));
    }
  }

  console.log(`youtube: posted ${posted} new video(s)`);
  await client.destroy();
}

main().catch((e) => { console.error('x', e); process.exit(1); });
