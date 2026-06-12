// news.js — posts new K-pop news articles to #news. Run on a schedule
// (GitHub Actions cron). For each source it reads the RSS feed, skips anything
// already in the channel (dedup by checking recent messages), and posts an
// embed with the title + the article's opening (NO AI, just the feed excerpt) +
// a link. Resolves #news by stored ID or by name, so it works in CI without the
// gitignored generated-ids.json.
//
//   npm run news

import 'dotenv/config';
import { once } from 'node:events';
import Parser from 'rss-parser';
import { Client, GatewayIntentBits, Events, EmbedBuilder } from 'discord.js';
import { BRAND_COLOR } from './config.js';
import { load } from './store.js';

const SOURCES = [
  { name: 'Soompi', url: 'https://www.soompi.com/feed' },
  { name: 'Koreaboo', url: 'https://www.koreaboo.com/feed/' },
];
const MAX_PER_SOURCE = 3; // cap so a busy feed can't flood the channel

function excerpt(item) {
  const raw = item.contentSnippet || item.summary || item.content || '';
  const text = raw.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  return text.length > 350 ? text.slice(0, 349) + '…' : text;
}

function imageOf(item) {
  return item.enclosure?.url || item['media:content']?.$?.url || item['media:thumbnail']?.$?.url || null;
}

async function recentlyPostedUrls(channel) {
  const urls = new Set();
  const msgs = await channel.messages.fetch({ limit: 80 }).catch(() => null);
  if (msgs) for (const m of msgs.values()) for (const e of m.embeds) if (e.url) urls.add(e.url);
  return urls;
}

async function main() {
  const ids = load();
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(process.env.DISCORD_TOKEN);
  if (!client.isReady()) await once(client, Events.ClientReady);
  const guild = await client.guilds.fetch(process.env.GUILD_ID);

  let channel = null;
  const id = ids.channels['news'] || process.env.NEWS_CHANNEL_ID;
  if (id) channel = await guild.channels.fetch(id).catch(() => null);
  if (!channel) {
    await guild.channels.fetch();
    channel = guild.channels.cache.find((c) => c.type === 0 && c.name.endsWith('news'));
  }
  if (!channel) throw new Error('news channel not found (run setup, or set NEWS_CHANNEL_ID).');

  const seen = await recentlyPostedUrls(channel);
  const parser = new Parser({ timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0 (kpopquiz-bot)' } });
  let posted = 0;

  for (const src of SOURCES) {
    let feed;
    try { feed = await parser.parseURL(src.url); }
    catch (e) { console.error(`${src.name} feed error:`, e.message); continue; }

    // newest first from the feed; post oldest-first so the channel reads top-down
    const fresh = (feed.items || []).slice(0, MAX_PER_SOURCE).filter((it) => it.link && !seen.has(it.link));
    for (const item of fresh.reverse()) {
      const embed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setAuthor({ name: src.name })
        .setTitle((item.title || 'Untitled').slice(0, 256))
        .setURL(item.link)
        .setDescription(excerpt(item) || '​')
        .setFooter({ text: `${src.name} · via RSS` });
      if (item.isoDate || item.pubDate) embed.setTimestamp(new Date(item.isoDate || item.pubDate));
      const img = imageOf(item);
      if (img) embed.setThumbnail(img);

      await channel.send({ embeds: [embed] });
      seen.add(item.link);
      posted += 1;
      await new Promise((s) => setTimeout(s, 800));
    }
  }

  console.log(`news: posted ${posted} new item(s)`);
  await client.destroy();
}

main().catch((e) => { console.error('x', e); process.exit(1); });
