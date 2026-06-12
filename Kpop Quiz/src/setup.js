// setup.js — idempotent server builder (Section 7).
//
// Order (per spec): roles top-down -> categories -> channels w/ overwrites ->
// role-menu message -> server defaults. Safe to re-run: every create is guarded
// by a check-if-exists (by name, then by stored ID). Nothing is deleted.
//
//   npm run setup        # apply
//   npm run setup:dry    # preview, no writes (DRY_RUN=true)
//
// Requires DISCORD_TOKEN and GUILD_ID in .env.

import 'dotenv/config';
import { once } from 'node:events';
import {
  Client, GatewayIntentBits, ChannelType, PermissionFlagsBits,
  GuildVerificationLevel, GuildDefaultMessageNotifications, Events,
} from 'discord.js';
import {
  CORE_ROLES, GROUP_ROLES, UTILITY_ROLES, STRUCTURE,
  SERVER_DEFAULTS, GROUP_EMOJI,
} from './config.js';
import { postRoleMenu } from './roleMenu.js';
import { load, save, STORE_FILE } from './store.js';

const DRY = String(process.env.DRY_RUN).toLowerCase() === 'true';
const log = (...a) => console.log(...a);
const plan = (...a) => console.log(DRY ? '  [dry]' : '  [run]', ...a);

const CHANNEL_TYPE = {
  text: ChannelType.GuildText,
  voice: ChannelType.GuildVoice,
  announcement: ChannelType.GuildAnnouncement,
  forum: ChannelType.GuildForum,
  category: ChannelType.GuildCategory,
};

function requireEnv() {
  const missing = ['DISCORD_TOKEN', 'GUILD_ID'].filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`Missing env: ${missing.join(', ')}. Copy .env.example to .env and fill it in.`);
    process.exit(1);
  }
}

async function main() {
  requireEnv();
  const ids = load();

  // Only the Guilds intent is needed: setup touches the bot's own member
  // (always available) but never reads the member list, so it avoids the
  // privileged Server Members intent. Enable that intent + re-add GuildMembers
  // only if you later add member-join logging / onboarding sync.
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(process.env.DISCORD_TOKEN);
  // login() resolves on the gateway READY token — before the GUILD_CREATE event
  // that populates the role/channel caches our ensure* existence checks rely on.
  // Wait for clientReady, then fetch explicitly so every check below is
  // deterministic (otherwise a re-run can race the cache and create duplicates).
  if (!client.isReady()) await once(client, Events.ClientReady);
  const guild = await client.guilds.fetch(process.env.GUILD_ID);
  await Promise.all([guild.roles.fetch(), guild.channels.fetch()]);
  log(`\n✦ kpopquiz setup — guild "${guild.name}"${DRY ? '  (DRY RUN — no changes)' : ''}\n`);

  await client.application?.fetch();

  // -- 1. Roles (top-down) ---------------------------------------------------
  log('Roles');
  const roleDefs = [
    ...CORE_ROLES,
    ...GROUP_ROLES.map((name) => ({ name, color: 0x99aab5, hoist: false, mentionable: true, permissions: [] })),
    ...UTILITY_ROLES.map((name) => ({ name, color: 0x99aab5, hoist: false, mentionable: true, permissions: [] })),
  ];

  const roleMap = { everyone: guild.roles.everyone.id };
  // Create from the top of the list down so Discord ordering matches the spec.
  for (const def of roleDefs) {
    const role = await ensureRole(guild, def, ids);
    roleMap[def.name] = role.id;
    plan(`role: ${def.name}`);
  }
  // Re-order: list order = descending priority. Place just under the bot's top role.
  if (!DRY) await reorderRoles(guild, roleDefs).catch((e) => log('  (role reorder skipped:', e.message + ')'));
  // Tag the bot itself with the Bot role so the `r.Bot` channel overwrites apply.
  if (!DRY && roleMap.Bot && guild.members.me) {
    await guild.members.me.roles.add(roleMap.Bot, 'kpopquiz: assign Bot role to the bot')
      .catch((e) => log('  (bot self-role skipped:', e.message + ')'));
  }
  save(ids);

  // -- 2 & 3. Categories + channels w/ overwrites ----------------------------
  for (const group of STRUCTURE) {
    log(`\nCategory: ${group.category}`);
    const cat = await ensureCategory(guild, group.category, roleMap, ids);
    plan(`category: ${group.category}`);

    for (const ch of group.channels) {
      const overwrites = buildOverwrites(ch, roleMap);
      const channel = await ensureChannel(guild, ch, cat, overwrites, ids);
      plan(`channel: #${ch.name}${ch.launchAtStart === false ? '  (hidden at launch)' : ''}`);

      if (channel && !DRY) {
        if (typeof ch.slowmode === 'number') await channel.setRateLimitPerUser(ch.slowmode).catch(() => {});
        if (ch.topic && channel.topic !== ch.topic && 'setTopic' in channel) await channel.setTopic(ch.topic).catch(() => {});
      }
    }
  }
  save(ids);

  // -- 4. Role menu in the channel flagged isRoleMenu ------------------------
  log('\nRole menu');
  const roleMenuMeta = STRUCTURE.flatMap((s) => s.channels).find((c) => c.isRoleMenu);
  const rolesChannelId = roleMenuMeta && ids.channels[roleMenuMeta.name];
  if (rolesChannelId && !DRY) {
    await postRoleMenu(guild, rolesChannelId, roleMap, ids, GROUP_EMOJI);
    save(ids);
    plan('posted select-menu to #roles');
  } else {
    plan('would post select-menu to #roles');
  }

  // -- 5. Server defaults ----------------------------------------------------
  log('\nServer defaults');
  if (!DRY) {
    await guild.setVerificationLevel(GuildVerificationLevel[SERVER_DEFAULTS.verificationLevel]).catch((e) => log('  (verification skipped:', e.message + ')'));
    await guild.setDefaultMessageNotifications(GuildDefaultMessageNotifications[SERVER_DEFAULTS.defaultMessageNotifications]).catch((e) => log('  (notifications skipped:', e.message + ')'));
  }
  plan(`verification=${SERVER_DEFAULTS.verificationLevel}, notifications=${SERVER_DEFAULTS.defaultMessageNotifications}`);

  log(`\n✓ Done. IDs saved to ${STORE_FILE}`);
  log('  Next: see MANUAL_PUNCHLIST.md for the steps the bot can\'t do.');
  log('  To reveal a hidden channel later: npm run reveal <channel-name>\n');
  await client.destroy();
}

// --- helpers ---------------------------------------------------------------

function findRole(guild, name) {
  return guild.roles.cache.find((r) => r.name === name);
}

async function ensureRole(guild, def, ids) {
  let role = (ids.roles[def.name] && guild.roles.cache.get(ids.roles[def.name])) || findRole(guild, def.name);
  const permissions = def.permissions?.length ? def.permissions : [];
  if (role) {
    ids.roles[def.name] = role.id;
    return role;
  }
  if (DRY) { ids.roles[def.name] = ids.roles[def.name] || `dry:${def.name}`; return { id: ids.roles[def.name] }; }
  role = await guild.roles.create({
    name: def.name,
    color: def.color,
    hoist: !!def.hoist,
    mentionable: !!def.mentionable,
    permissions,
    reason: 'kpopquiz setup',
  });
  ids.roles[def.name] = role.id;
  return role;
}

async function reorderRoles(guild, roleDefs) {
  // Build a descending position list. Bot's own highest role stays on top.
  // Assign unique descending positions; stop once we run out of room under the
  // bot's top role rather than collapsing several roles onto position 1.
  const positions = [];
  let pos = guild.members.me ? guild.members.me.roles.highest.position - 1 : guild.roles.cache.size - 1;
  for (const def of roleDefs) {
    if (pos < 1) break;
    const role = findRole(guild, def.name);
    if (role && role.editable) positions.push({ role: role.id, position: pos-- });
  }
  if (positions.length) await guild.roles.setPositions(positions);
}

async function ensureCategory(guild, name, roleMap, ids) {
  let cat = (ids.categories[name] && guild.channels.cache.get(ids.categories[name]))
    || guild.channels.cache.find((c) => c.type === ChannelType.GuildCategory && c.name === name);
  if (cat) { ids.categories[name] = cat.id; return cat; }
  if (DRY) { ids.categories[name] = ids.categories[name] || `dry:cat:${name}`; return { id: ids.categories[name] }; }
  cat = await guild.channels.create({ name, type: ChannelType.GuildCategory, reason: 'kpopquiz setup' });
  ids.categories[name] = cat.id;
  return cat;
}

function buildOverwrites(ch, roleMap) {
  let ow = typeof ch.overwrites === 'function' ? ch.overwrites(roleMap) : [];
  // Section 6: launchAtStart:false channels are force-hidden from @everyone,
  // regardless of recipe (unless the recipe already hides them).
  if (ch.launchAtStart === false) {
    const e = roleMap.everyone;
    const existing = ow.find((o) => o.id === e);
    if (existing) {
      existing.deny = Array.from(new Set([...(existing.deny || []), PermissionFlagsBits.ViewChannel]));
    } else {
      ow = [{ id: e, deny: [PermissionFlagsBits.ViewChannel] }, ...ow];
    }
  }
  return ow;
}

async function ensureChannel(guild, ch, cat, overwrites, ids) {
  let channel = (ids.channels[ch.name] && guild.channels.cache.get(ids.channels[ch.name]))
    || guild.channels.cache.find((c) => c.name === ch.name && c.parentId === cat.id);
  const type = CHANNEL_TYPE[ch.type] ?? ChannelType.GuildText;

  if (channel) {
    ids.channels[ch.name] = channel.id;
    if (!DRY) {
      await channel.permissionOverwrites.set(overwrites, 'kpopquiz setup sync').catch(() => {});
      if (channel.parentId !== cat.id) await channel.setParent(cat.id, { lockPermissions: false }).catch(() => {});
    }
    return channel;
  }
  if (DRY) { ids.channels[ch.name] = ids.channels[ch.name] || `dry:ch:${ch.name}`; return null; }

  channel = await createChannelWithFallback(guild, ch, {
    name: ch.name,
    type,
    parent: cat.id,
    topic: ch.topic,
    permissionOverwrites: overwrites,
    reason: 'kpopquiz setup',
  });
  ids.channels[ch.name] = channel.id;
  return channel;
}

// Announcement channels require the Community feature; without it the API
// rejects the create. Fall back to a normal text channel so the rest of the
// build still completes (MANUAL_PUNCHLIST documents this behaviour).
async function createChannelWithFallback(guild, ch, payload) {
  try {
    return await guild.channels.create(payload);
  } catch (err) {
    if (ch.type === 'announcement') {
      log(`  (announcement #${ch.name} failed — Community not enabled? Falling back to a text channel.)`);
      return await guild.channels.create({ ...payload, type: ChannelType.GuildText });
    }
    throw err;
  }
}

main().catch((err) => { console.error('\n✗ Setup failed:', err); process.exit(1); });
