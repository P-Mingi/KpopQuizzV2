// cleanupDupes.js: removes bare-name duplicate categories + their channels.
// A category is a "bare duplicate" when a decorated version (『emoji』 NAME)
// already exists for the same logical name. Channels inside the bare category
// are deleted EXCEPT #youtube which is moved to the decorated NEWS category first.

import 'dotenv/config';
import { once } from 'node:events';
import { Client, GatewayIntentBits, Events, ChannelType } from 'discord.js';

const DRY = process.env.DRY_RUN === 'true';
const tag = DRY ? '[DRY] ' : '';

async function main() {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(process.env.DISCORD_TOKEN);
  if (!client.isReady()) await once(client, Events.ClientReady);

  const guild = await client.guilds.fetch(process.env.GUILD_ID);
  await guild.channels.fetch();

  const cats = guild.channels.cache.filter((c) => c.type === ChannelType.GuildCategory);

  // Build map: bare name -> [decorated cat, bare cat]
  // Decorated categories match /^『[^』]+』/
  const decorated = new Map(); // bareName -> decorated cat
  const bare = new Map();      // bareName -> bare cat

  for (const [, cat] of cats) {
    const decoratedMatch = cat.name.match(/^『[^』]+』\s*(.+)/u);
    if (decoratedMatch) {
      decorated.set(decoratedMatch[1].toLowerCase(), cat);
    } else {
      bare.set(cat.name.toLowerCase(), cat);
    }
  }

  // Find the decorated NEWS category to move #youtube into.
  const newsDecorated = decorated.get('news');
  if (!newsDecorated) {
    console.log('Could not find decorated NEWS category — aborting.');
    await client.destroy(); return;
  }

  let moved = 0;
  let deleted = 0;

  for (const [bareName, bareCat] of bare) {
    if (!decorated.has(bareName)) continue; // no decorated twin, skip

    const children = guild.channels.cache.filter(
      (c) => c.parentId === bareCat.id && c.type !== ChannelType.GuildCategory,
    );

    for (const [, ch] of children) {
      if (ch.name === 'youtube' || ch.name.endsWith('・youtube')) {
        // Move #youtube to the decorated NEWS category instead of deleting.
        console.log(`${tag}move #${ch.name} -> ${newsDecorated.name}`);
        if (!DRY) {
          await ch.setParent(newsDecorated.id, { lockPermissions: false, reason: 'cleanup: move youtube to decorated NEWS' });
          await new Promise((r) => setTimeout(r, 500));
        }
        moved++;
      } else {
        console.log(`${tag}delete #${ch.name} (bare dupe in ${bareCat.name})`);
        if (!DRY) {
          await ch.delete('cleanup: bare-name dupe removed').catch((e) => console.error('  err:', e.message));
          await new Promise((r) => setTimeout(r, 500));
        }
        deleted++;
      }
    }

    console.log(`${tag}delete category: ${bareCat.name}`);
    if (!DRY) {
      await bareCat.delete('cleanup: bare-name dupe removed').catch((e) => console.error('  err:', e.message));
      await new Promise((r) => setTimeout(r, 600));
    }
    deleted++;
  }

  console.log(`\nDone — ${tag}moved ${moved}, deleted ${deleted} channel(s)/category(s).`);
  await client.destroy();
}

main().catch((e) => { console.error(e); process.exit(1); });
