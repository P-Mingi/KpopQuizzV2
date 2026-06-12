// automod.js — native Discord AutoMod rules (Community servers only).
// Covers: NSFW/sexual content, profanity & slurs (insults), spam, mention-raid,
// and invite-link advertising. Blocks the message and alerts #mod-log. Staff
// (Admin/Mod) are exempt. Idempotent: skips a rule whose name already exists.
//
//   npm run automod

import 'dotenv/config';
import { once } from 'node:events';
import {
  Client, GatewayIntentBits, Events,
  AutoModerationRuleTriggerType as Trigger,
  AutoModerationRuleEventType as EventType,
  AutoModerationActionType as Action,
  AutoModerationRuleKeywordPresetType as Preset,
} from 'discord.js';
import { load } from './store.js';

async function main() {
  const ids = load();
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(process.env.DISCORD_TOKEN);
  if (!client.isReady()) await once(client, Events.ClientReady);
  const guild = await client.guilds.fetch(process.env.GUILD_ID);

  const modLog = ids.channels['mod-log'];
  const exemptRoles = [ids.roles['Admin'], ids.roles['Mod']].filter(Boolean);
  const block = (msg) => ({ type: Action.BlockMessage, metadata: { customMessage: msg } });
  const alert = modLog ? [{ type: Action.SendAlertMessage, metadata: { channel: modLog } }] : [];
  const timeout = (s) => ({ type: Action.Timeout, metadata: { durationSeconds: s } });

  const rules = [
    {
      name: 'kq: NSFW, profanity & slurs',
      eventType: EventType.MessageSend,
      triggerType: Trigger.KeywordPreset,
      triggerMetadata: { presets: [Preset.Profanity, Preset.SexualContent, Preset.Slurs] },
      actions: [block("That message was blocked. Keep it kind and SFW. See #rules."), ...alert],
    },
    {
      name: 'kq: mention raid',
      eventType: EventType.MessageSend,
      triggerType: Trigger.MentionSpam,
      triggerMetadata: { mentionTotalLimit: 6, mentionRaidProtectionEnabled: true },
      actions: [block('Too many mentions.'), timeout(600), ...alert],
    },
    {
      name: 'kq: spam',
      eventType: EventType.MessageSend,
      triggerType: Trigger.Spam,
      triggerMetadata: {},
      actions: [block('That looked like spam.'), ...alert],
    },
    {
      name: 'kq: invite-link ads',
      eventType: EventType.MessageSend,
      triggerType: Trigger.Keyword,
      triggerMetadata: { regexPatterns: ['discord(?:app)?\\.com/invite/\\w+', 'discord\\.gg/\\w+', '\\.gg/[A-Za-z0-9]{2,}'] },
      actions: [block('No advertising other servers. Ask a mod if you think this is a mistake.'), ...alert],
    },
  ];

  const existing = await guild.autoModerationRules.fetch();
  const have = new Set(existing.map((r) => r.name));

  for (const rule of rules) {
    if (have.has(rule.name)) { console.log(`= ${rule.name} (exists)`); continue; }
    try {
      await guild.autoModerationRules.create({ ...rule, enabled: true, exemptRoles });
      console.log(`+ ${rule.name}`);
    } catch (e) {
      console.log(`x ${rule.name}: ${e.message}`);
    }
  }

  await client.destroy();
}

main().catch((e) => { console.error('x', e); process.exit(1); });
