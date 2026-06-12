// branding.js — sets the server icon and uploads the mascot custom emojis from
// assets/out/ (prepared with rembg/PIL). Idempotent: skips an emoji whose name
// already exists. Re-run after adding more assets/out/emoji_<name>.png files.
//
//   npm run branding

import 'dotenv/config';
import { once } from 'node:events';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client, GatewayIntentBits, Events } from 'discord.js';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'out');

async function main() {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(process.env.DISCORD_TOKEN);
  if (!client.isReady()) await once(client, Events.ClientReady);
  const guild = await client.guilds.fetch(process.env.GUILD_ID);

  const iconPath = join(OUT, 'icon.png');
  if (existsSync(iconPath)) {
    await guild.setIcon(readFileSync(iconPath), 'kpopquiz branding');
    console.log('✓ server icon set');
  }

  const existing = await guild.emojis.fetch();
  const have = new Set(existing.map((e) => e.name));
  for (const file of readdirSync(OUT).filter((f) => f.startsWith('emoji_') && f.endsWith('.png'))) {
    const name = file.replace(/^emoji_/, '').replace(/\.png$/, '');
    if (have.has(name)) { console.log(`= ${name} (exists)`); continue; }
    try {
      const e = await guild.emojis.create({ attachment: readFileSync(join(OUT, file)), name });
      console.log(`+ :${e.name}:`);
    } catch (err) {
      console.log(`x ${name}: ${err.message}`);
    }
  }

  await client.destroy();
}

main().catch((e) => { console.error('x', e); process.exit(1); });
