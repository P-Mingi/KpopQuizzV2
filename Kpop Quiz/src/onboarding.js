// onboarding.js — configures Discord Onboarding (Server Settings → Onboarding)
// via the API: default channels new members see + two quick prompts (what they
// want + a starter set of bias groups wired to the real roles). The full
// 88-group list stays in #roles. Re-running overwrites the onboarding config.
//
//   npm run onboarding

import 'dotenv/config';
import { once } from 'node:events';
import {
  Client, GatewayIntentBits, Events,
  GuildOnboardingMode as Mode,
  GuildOnboardingPromptType as PromptType,
} from 'discord.js';
import { GROUP_EMOJI } from './config.js';
import { load } from './store.js';

// A starter set of popular groups for the quick onboarding prompt (≤25).
const FEATURED = [
  'BTS', 'BLACKPINK', 'Stray Kids', 'SEVENTEEN', 'TWICE', 'EXO', 'NewJeans', 'aespa',
  'IVE', 'LE SSERAFIM', 'ENHYPEN', 'TXT', 'ATEEZ', 'ITZY', '(G)I-DLE', 'NMIXX',
  'Red Velvet', 'NCT', 'GOT7', 'MAMAMOO', 'ZEROBASEONE', 'RIIZE', 'ILLIT', 'BABYMONSTER',
];

let _oid = 1;
const optId = () => String(_oid++); // unique placeholder ids for new options

async function main() {
  const ids = load();
  const ch = (n) => ids.channels[n];
  const role = (n) => ids.roles[n];

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(process.env.DISCORD_TOKEN);
  if (!client.isReady()) await once(client, Events.ClientReady);
  const guild = await client.guilds.fetch(process.env.GUILD_ID);

  const defaultChannels = ['welcome', 'rules', 'roles', 'announcements', 'general',
    'introduce-yourself', 'daily-quiz', 'share-your-quiz', 'feedback'].map(ch).filter(Boolean);

  const intentOptions = [
    { id: optId(), title: 'Daily K-pop quizzes', emoji: '🧠', channels: [ch('daily-quiz')].filter(Boolean), roles: [] },
    { id: optId(), title: 'Blindtests with friends', emoji: '🎧', channels: [ch('blindtest-vc')].filter(Boolean), roles: [] },
    { id: optId(), title: 'Meet other stans', emoji: '💬', channels: [ch('general')].filter(Boolean), roles: [] },
    { id: optId(), title: 'Making & sharing quizzes', emoji: '🎲', channels: [ch('share-your-quiz')].filter(Boolean), roles: [] },
  ].filter((o) => o.channels.length);

  const groupOptions = FEATURED
    .map((g) => ({ id: optId(), title: g, emoji: GROUP_EMOJI[g], roles: [role(g)].filter(Boolean), channels: [] }))
    .filter((o) => o.roles.length);

  await guild.editOnboarding({
    enabled: true,
    mode: Mode.OnboardingDefault,
    defaultChannels,
    prompts: [
      {
        type: PromptType.MultipleChoice,
        title: 'What brings you to kpopquiz?',
        singleSelect: false, required: false, inOnboarding: true,
        options: intentOptions,
      },
      {
        type: PromptType.Dropdown,
        title: 'Tap your bias groups  (full list later in #roles!)',
        singleSelect: false, required: false, inOnboarding: true,
        options: groupOptions,
      },
    ],
    reason: 'kpopquiz onboarding',
  });

  console.log(`✓ Onboarding enabled: ${defaultChannels.length} default channels, ` +
    `${intentOptions.length} intent options, ${groupOptions.length} group options.`);
  await client.destroy();
}

main().catch((e) => { console.error('x onboarding:', e.message); process.exit(1); });
