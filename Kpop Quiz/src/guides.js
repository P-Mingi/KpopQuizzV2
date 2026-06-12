// guides.js — posts + pins a short info card in every channel so members always
// know what each room is for. Idempotent: edits the pinned card on re-run
// (message ids stored under ids.guides). welcome/rules/roles are skipped (they
// already carry their own embeds/menu).
//
//   npm run guides

import 'dotenv/config';
import { once } from 'node:events';
import { Client, GatewayIntentBits, Events, EmbedBuilder } from 'discord.js';
import { STRUCTURE, CHANNEL_INFO, CHANNEL_EMOJI, GROUP_EMOJI, BRAND_COLOR } from './config.js';
import { load, save } from './store.js';

const SKIP = new Set(['welcome', 'rules', 'roles']);

function cardFor(ch) {
  // Group channels get a generated card; everything else uses CHANNEL_INFO.
  if (ch.groupRole) {
    const e = GROUP_EMOJI[ch.groupRole] ? GROUP_EMOJI[ch.groupRole] + '  ' : '';
    return {
      title: `${e}${ch.groupRole}`,
      body: `Welcome to the ${ch.groupRole} channel! Talk all things ${ch.groupRole}: comebacks, ` +
            `performances, photos, theories. Don't have access elsewhere? Opt into the ${ch.groupRole} role in #roles.`,
    };
  }
  const body = CHANNEL_INFO[ch.name];
  if (!body) return null;
  const e = CHANNEL_EMOJI[ch.name] ? CHANNEL_EMOJI[ch.name] + '  ' : '';
  return { title: `${e}#${ch.name}`, body };
}

async function upsert(channel, storedId, embed) {
  let msg = storedId ? await channel.messages.fetch(storedId).catch(() => null) : null;
  if (msg) { await msg.edit({ embeds: [embed] }); }
  else { msg = await channel.send({ embeds: [embed] }); }
  await msg.pin().catch(() => {}); // harmless if already pinned / unsupported
  return msg.id;
}

async function main() {
  const ids = load();
  ids.guides = ids.guides || {};
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(process.env.DISCORD_TOKEN);
  if (!client.isReady()) await once(client, Events.ClientReady);
  const guild = await client.guilds.fetch(process.env.GUILD_ID);

  for (const group of STRUCTURE) {
    for (const ch of group.channels) {
      if (SKIP.has(ch.name)) continue;
      const card = cardFor(ch);
      if (!card) continue;
      const id = ids.channels[ch.name];
      if (!id) continue;
      const channel = await guild.channels.fetch(id).catch(() => null);
      if (!channel) continue;
      const embed = new EmbedBuilder().setColor(BRAND_COLOR).setTitle(card.title).setDescription(card.body);
      try {
        ids.guides[ch.name] = await upsert(channel, ids.guides[ch.name], embed);
        console.log(`✓ #${ch.name}`);
      } catch (e) {
        console.log(`x #${ch.name}: ${e.message}`);
      }
    }
  }

  save(ids);
  await client.destroy();
}

main().catch((e) => { console.error('x', e); process.exit(1); });
