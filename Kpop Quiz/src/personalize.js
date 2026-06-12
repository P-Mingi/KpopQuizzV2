// personalize.js — cosmetic theming, separate from setup so it can't touch
// permissions/gating. Renames categories + channels with emoji and recolors
// the group roles. Idempotent: display names are rebuilt from the config slug,
// so re-running always converges to the same result.
//
//   npm run personalize
//
// Uses the discord.js Client (not raw fetch) so REST rate limits are handled.

import 'dotenv/config';
import { once } from 'node:events';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import {
  STRUCTURE, CHANNEL_EMOJI, CATEGORY_EMOJI, GROUP_EMOJI, GROUP_COLOR,
} from './config.js';
import { load } from './store.js';

const log = (...a) => console.log(...a);

function channelDisplay(ch) {
  const emoji = CHANNEL_EMOJI[ch.name] ?? (ch.groupRole ? GROUP_EMOJI[ch.groupRole] : '📁');
  return `${emoji}・${ch.name}`;
}

function categoryDisplay(name) {
  const emoji = CATEGORY_EMOJI[name] ?? '✦';
  return `『${emoji}』 ${name.toUpperCase()}`;
}

// discord.js 14.26 prefers `colors`; fall back to legacy `color` if unsupported.
async function setRoleColor(role, hex) {
  try { await role.edit({ colors: { primaryColor: hex } }); }
  catch { await role.edit({ color: hex }); }
}

async function main() {
  const ids = load();
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(process.env.DISCORD_TOKEN);
  if (!client.isReady()) await once(client, Events.ClientReady);
  const guild = await client.guilds.fetch(process.env.GUILD_ID);
  await Promise.all([guild.roles.fetch(), guild.channels.fetch()]);
  log(`\n✦ personalizing "${guild.name}"\n`);

  // Categories
  log('Categories');
  for (const group of STRUCTURE) {
    const id = ids.categories[group.category];
    const cat = id && guild.channels.cache.get(id);
    if (!cat) { log(`  · skip ${group.category} (not created)`); continue; }
    const name = categoryDisplay(group.category);
    if (cat.name !== name) { await cat.setName(name, 'personalize'); log(`  ✓ ${name}`); }
    else log(`  = ${name}`);
  }

  // Channels
  log('\nChannels');
  for (const group of STRUCTURE) {
    for (const ch of group.channels) {
      const id = ids.channels[ch.name];
      const channel = id && guild.channels.cache.get(id);
      if (!channel) { log(`  · skip #${ch.name} (not created)`); continue; }
      const name = channelDisplay(ch);
      if (channel.name !== name) { await channel.setName(name, 'personalize'); log(`  ✓ ${name}`); }
      else log(`  = ${name}`);
    }
  }

  // Group role colors
  log('\nGroup role colors');
  for (const [roleName, hex] of Object.entries(GROUP_COLOR)) {
    const id = ids.roles[roleName];
    const role = id && guild.roles.cache.get(id);
    if (!role) { log(`  · skip ${roleName} (not created)`); continue; }
    await setRoleColor(role, hex);
    log(`  ✓ ${roleName}  #${hex.toString(16).padStart(6, '0')}`);
  }

  log('\n✓ Personalized. Re-run any time after editing the theme maps in config.js.\n');
  await client.destroy();
}

main().catch((e) => { console.error('✗', e); process.exit(1); });
