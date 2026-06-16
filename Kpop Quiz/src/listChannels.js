// listChannels.js: prints every text channel name (with hex codes) so we can
// see exactly which characters are in decorated vs bare names.
import 'dotenv/config';
import { once } from 'node:events';
import { Client, GatewayIntentBits, Events, ChannelType } from 'discord.js';

async function main() {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(process.env.DISCORD_TOKEN);
  if (!client.isReady()) await once(client, Events.ClientReady);
  const guild = await client.guilds.fetch(process.env.GUILD_ID);
  await guild.channels.fetch();
  const cats = guild.channels.cache.filter((c) => c.type === ChannelType.GuildCategory)
    .sort((a, b) => a.position - b.position);
  for (const [, cat] of cats) {
    console.log(`\n[${cat.name}]`);
    guild.channels.cache
      .filter((c) => c.parentId === cat.id && c.type !== ChannelType.GuildCategory)
      .sort((a, b) => a.position - b.position)
      .forEach((c) => {
        const hex = [...c.name].map((ch) => ch.codePointAt(0).toString(16).padStart(4, '0')).join(' ');
        console.log(`  #${c.name}  [${hex}]`);
      });
  }
  await client.destroy();
}
main().catch((e) => { console.error(e); process.exit(1); });
