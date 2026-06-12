// events.js — creates a weekly recurring "Friday Quiz Night" scheduled event in
// the blindtest voice channel. Idempotent: skips if an event with the same name
// already exists.
//
//   npm run events

import 'dotenv/config';
import { once } from 'node:events';
import {
  Client, GatewayIntentBits, Events,
  GuildScheduledEventEntityType as EntityType,
  GuildScheduledEventPrivacyLevel as Privacy,
  GuildScheduledEventRecurrenceRuleFrequency as Frequency,
  GuildScheduledEventRecurrenceRuleWeekday as Weekday,
} from 'discord.js';
import { load } from './store.js';

const NAME = 'Friday Quiz Night 🎧';

// Next Friday at 19:00 UTC, strictly in the future.
function nextFriday1900() {
  const d = new Date();
  d.setUTCHours(19, 0, 0, 0);
  const day = d.getUTCDay();              // 0=Sun … 5=Fri
  let add = (5 - day + 7) % 7;            // days until Friday
  if (add === 0 && d.getTime() < Date.now() + 3600_000) add = 7; // already past today
  d.setUTCDate(d.getUTCDate() + add);
  return d;
}

async function main() {
  const ids = load();
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(process.env.DISCORD_TOKEN);
  if (!client.isReady()) await once(client, Events.ClientReady);
  const guild = await client.guilds.fetch(process.env.GUILD_ID);

  const existing = await guild.scheduledEvents.fetch();
  if (existing.some((e) => e.name === NAME)) { console.log(`= ${NAME} (exists)`); await client.destroy(); return; }

  const channel = ids.channels['blindtest-vc'];
  if (!channel) { console.log('x no blindtest-vc channel found'); await client.destroy(); return; }

  const start = nextFriday1900();
  const end = new Date(start.getTime() + 2 * 3600_000);

  await guild.scheduledEvents.create({
    name: NAME,
    scheduledStartTime: start,
    scheduledEndTime: end,
    privacyLevel: Privacy.GuildOnly,
    entityType: EntityType.Voice,
    channel,
    description: 'Weekly K-pop blindtest with KMQ — hop in, /play, and guess the song. ' +
                 'Bring your bias knowledge. Opt into Event Pings in #roles to get reminded!',
    recurrenceRule: { startAt: start, frequency: Frequency.Weekly, interval: 1, byWeekday: [Weekday.Friday] },
  });

  console.log(`+ ${NAME} — first session ${start.toISOString()}, repeats weekly`);
  await client.destroy();
}

main().catch((e) => { console.error('x', e); process.exit(1); });
