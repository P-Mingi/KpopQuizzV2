// cleanupDupes.js: deletes bare-name channels that are duplicates of their
// emoji-decorated counterparts (e.g. removes `bts` when `💜・bts` exists).
// Only deletes a channel if an emoji-decorated version exists in the same
// category. Safe to re-run — idempotent.

import 'dotenv/config';
import { once } from 'node:events';
import { Client, GatewayIntentBits, Events, ChannelType } from 'discord.js';

const DRY = process.env.DRY_RUN === 'true';

async function main() {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(process.env.DISCORD_TOKEN);
  if (!client.isReady()) await once(client, Events.ClientReady);

  const guild = await client.guilds.fetch(process.env.GUILD_ID);
  await guild.channels.fetch();

  const textVoice = guild.channels.cache.filter(
    (c) => c.type === ChannelType.GuildText || c.type === ChannelType.GuildVoice,
  );

  let deleted = 0;
  for (const [, bare] of textVoice) {
    if (bare.name.includes('・')) continue; // already decorated — not a dupe
    // Is there a decorated twin in the same category?
    const twin = textVoice.find(
      (c) => c.parentId === bare.parentId && c.name.endsWith('・' + bare.name),
    );
    if (!twin) continue;
    console.log(`${DRY ? '[DRY] ' : ''}delete #${bare.name} (twin: ${twin.name})`);
    if (!DRY) {
      await bare.delete('cleanup duplicate bare-name channel').catch((e) => console.error('  err:', e.message));
      await new Promise((r) => setTimeout(r, 500));
    }
    deleted++;
  }

  console.log(`\nDone — ${DRY ? 'would delete' : 'deleted'} ${deleted} duplicate channel(s).`);
  await client.destroy();
}

main().catch((e) => { console.error(e); process.exit(1); });
