// postMenu.js — refresh the #roles select menus from config (groups + emojis)
// WITHOUT running full setup, so it never touches channel permissions or
// re-hides revealed channels. Run after editing GROUPS_BY_GEN / GROUP_EMOJI.
//
//   npm run post-menu

import 'dotenv/config';
import { once } from 'node:events';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import { postRoleMenu } from './roleMenu.js';
import { GROUP_EMOJI } from './config.js';
import { load, save } from './store.js';

async function main() {
  const ids = load();
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(process.env.DISCORD_TOKEN);
  if (!client.isReady()) await once(client, Events.ClientReady);
  const guild = await client.guilds.fetch(process.env.GUILD_ID);
  await postRoleMenu(guild, ids.channels['roles'], ids.roles, ids, GROUP_EMOJI);
  save(ids);
  console.log('✓ role menu refreshed');
  await client.destroy();
}

main().catch((e) => { console.error('x', e); process.exit(1); });
