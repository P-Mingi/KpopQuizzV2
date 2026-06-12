// colorRoles.js — creates the cosmetic name-color roles (no permissions),
// lifts them just under the bot's top role so the chosen color wins over a
// colored group role, and refreshes the #roles menu (which now includes the
// color picker). Idempotent. Run after editing COLOR_ROLES.
//
//   npm run color-roles

import 'dotenv/config';
import { once } from 'node:events';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import { COLOR_ROLES, GROUP_EMOJI } from './config.js';
import { postRoleMenu } from './roleMenu.js';
import { load, save } from './store.js';

async function main() {
  const ids = load();
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(process.env.DISCORD_TOKEN);
  if (!client.isReady()) await once(client, Events.ClientReady);
  const guild = await client.guilds.fetch(process.env.GUILD_ID);
  await guild.roles.fetch();

  for (const c of COLOR_ROLES) {
    let role = (ids.roles[c.name] && guild.roles.cache.get(ids.roles[c.name]))
      || guild.roles.cache.find((r) => r.name === c.name);
    if (!role) {
      role = await guild.roles.create({
        name: c.name, color: c.color, hoist: false, mentionable: false, permissions: [],
        reason: 'kpopquiz color roles',
      });
      console.log(`+ ${c.name}`);
    } else {
      await role.setColor(c.color).catch(() => {});
    }
    ids.roles[c.name] = role.id;
  }

  // Best-effort: lift color roles just below the bot's top role so the name
  // color wins over a colored group role. Flat hierarchies may reject this.
  try {
    let pos = (guild.members.me?.roles.highest.position ?? 1) - 1;
    const positions = COLOR_ROLES
      .map((c) => guild.roles.cache.get(ids.roles[c.name]))
      .filter((r) => r && r.editable && pos >= 1)
      .map((r) => ({ role: r.id, position: pos-- }));
    if (positions.length) await guild.roles.setPositions(positions);
  } catch (e) { console.log('(color role reorder skipped:', e.message + ')'); }

  await postRoleMenu(guild, ids.channels['roles'], ids.roles, ids, GROUP_EMOJI);
  save(ids);
  console.log('✓ color roles ready + menu refreshed');
  await client.destroy();
}

main().catch((e) => { console.error('x', e); process.exit(1); });
