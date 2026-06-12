// reveal.js — Section 6/7: flip a hidden channel live with one command.
//
//   npm run reveal <channel-name>          # reveal to @everyone
//   npm run reveal <channel-name> --hide   # hide again
//   npm run reveal --list                  # show launch state of all channels
//
// "Reveal" = remove the @everyone ViewChannel deny. That same deny is what
// enforces group gating, so reveal refuses group-gated channels (members get
// those by opting into the role in #roles). Uses the stored IDs so it's a
// one-liner.

import 'dotenv/config';
import { Client, GatewayIntentBits, PermissionFlagsBits } from 'discord.js';
import { load } from './store.js';
import { STRUCTURE } from './config.js';

const args = process.argv.slice(2);
const wantHide = args.includes('--hide');
const wantList = args.includes('--list');
const name = args.find((a) => !a.startsWith('--'));

function channelMeta(n) {
  for (const cat of STRUCTURE) for (const ch of cat.channels) if (ch.name === n) return ch;
  return null;
}

async function main() {
  const ids = load();

  if (wantList) {
    // Read the *live* state from the server rather than echoing config intent —
    // a channel revealed earlier should show as live, not its launch default.
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });
    await client.login(process.env.DISCORD_TOKEN);
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    await guild.channels.fetch();
    const everyoneId = guild.roles.everyone.id;

    console.log('\nChannel state (live, read from the server):\n');
    for (const cat of STRUCTURE) {
      console.log(`  ${cat.category}`);
      for (const ch of cat.channels) {
        const id = ids.channels[ch.name];
        const channel = id ? guild.channels.cache.get(id) : null;
        let state;
        if (!channel) {
          state = '·  not created';
        } else {
          const ow = channel.permissionOverwrites.cache.get(everyoneId);
          const deniedView = ow?.deny?.has(PermissionFlagsBits.ViewChannel);
          if (ch.groupRole) state = deniedView ? `✓  gated (${ch.groupRole})` : '✓  OPEN to everyone — gate removed!';
          else state = deniedView ? '✓  hidden' : '✓  live';
        }
        console.log(`    #${ch.name.padEnd(20)} ${state}`);
      }
    }
    console.log('');
    await client.destroy();
    return;
  }

  if (!name) {
    console.error('Usage: npm run reveal <channel-name> [--hide] | --list');
    process.exit(1);
  }
  const channelId = ids.channels[name];
  if (!channelId) {
    console.error(`No stored ID for #${name}. Run setup first, or check the name (npm run reveal --list).`);
    process.exit(1);
  }
  const meta = channelMeta(name);
  if (meta?.groupRole && !wantHide) {
    console.error(`✗ #${name} is group-gated (${meta.groupRole}). Revealing it clears the @everyone`);
    console.error(`  ViewChannel deny that enforces the gate, exposing it to the whole server.`);
    console.error(`  Members get access by opting into the ${meta.groupRole} role in #roles instead.`);
    process.exit(1);
  }

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(process.env.DISCORD_TOKEN);
  const guild = await client.guilds.fetch(process.env.GUILD_ID);
  const channel = await guild.channels.fetch(channelId);

  await channel.permissionOverwrites.edit(guild.roles.everyone, {
    ViewChannel: wantHide ? false : null, // null = clear the deny → inherit/visible
  }, { reason: `reveal.js ${wantHide ? 'hide' : 'reveal'}` });

  console.log(`✓ #${name} is now ${wantHide ? 'hidden from' : 'visible to'} @everyone.`);
  await client.destroy();
}

main().catch((e) => { console.error('✗', e.message); process.exit(1); });
