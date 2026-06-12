// roleMenu.js — Section 4, select-menu approach (recommended over reactions).
//
// Two responsibilities:
//   1. postRoleMenu(...)  — called by setup.js to publish the menus into #roles.
//   2. A standalone listener (`npm run menu`) that handles the select-menu
//      interactions and assigns/removes roles. Run this as a long-lived
//      process (pm2/systemd) so members can self-assign at any time.
//
// Groups are split into one ≤25-option select menu PER GENERATION (Discord caps
// select menus at 25 options). Each group menu's customId encodes its generation
// so the handler manages ONLY that generation's roles — selecting in one gen
// never wipes your picks in another.

import 'dotenv/config';
import {
  Client, GatewayIntentBits, ActionRowBuilder, StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import {
  GROUPS_BY_GEN, ROLE_MENU, GROUP_EMOJI, GROUP_MENU_PREFIX, STRUCTURE,
} from './config.js';
import { handleQuizInteraction, handleQuizCommand } from './quizBot.js';
import { load } from './store.js';

// --- build the select-menu rows ---------------------------------------------

// One menu per generation. Returns [{ genKey, groups, row }].
function genMenus(emojiMap) {
  const em = emojiMap || GROUP_EMOJI;
  return Object.entries(GROUPS_BY_GEN).map(([genKey, groups]) => {
    const menu = new StringSelectMenuBuilder()
      .setCustomId(GROUP_MENU_PREFIX + genKey)
      .setPlaceholder(`Pick your ${genKey} groups…`)
      .setMinValues(0)
      .setMaxValues(groups.length)
      .addOptions(groups.map((g) => {
        const opt = new StringSelectMenuOptionBuilder().setLabel(g).setValue(g);
        if (em[g]) opt.setEmoji(em[g]);
        return opt;
      }));
    return { genKey, groups, row: new ActionRowBuilder().addComponents(menu) };
  });
}

function eventRow() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(ROLE_MENU.eventSelect.customId)
    .setPlaceholder(ROLE_MENU.eventSelect.placeholder)
    .setMinValues(0)
    .setMaxValues(1)
    .addOptions(ROLE_MENU.eventSelect.options.map((o) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(o.label).setValue(o.value).setEmoji(o.emoji).setDescription(o.description)));
  return new ActionRowBuilder().addComponents(menu);
}

// Which role names does a given customId manage? null if not one of ours.
function managedRoles(customId) {
  if (customId === ROLE_MENU.eventSelect.customId) return ROLE_MENU.eventSelect.options.map((o) => o.value);
  if (customId.startsWith(GROUP_MENU_PREFIX)) return GROUPS_BY_GEN[customId.slice(GROUP_MENU_PREFIX.length)] || null;
  return null;
}

// --- post into #roles (idempotent: reuse stored messages if present) ---------

export async function postRoleMenu(guild, rolesChannelId, roleMap, ids, emojiMap) {
  const channel = await guild.channels.fetch(rolesChannelId);
  ids.roleMenu.groupMessages = ids.roleMenu.groupMessages || {};

  // One-time migration from the old single-group-menu layout: wipe the old
  // messages so the new per-gen messages post fresh and in order.
  if (ids.roleMenu.groupMessageId) {
    await channel.messages.delete(ids.roleMenu.groupMessageId).catch(() => {});
    if (ids.roleMenu.eventMessageId) await channel.messages.delete(ids.roleMenu.eventMessageId).catch(() => {});
    delete ids.roleMenu.groupMessageId;
    ids.roleMenu.groupMessages = {};
    ids.roleMenu.eventMessageId = null;
  }

  const intro =
    '**Pick your groups** 🎧\n' +
    'Select every group you stan across the generations below. This lets you get comeback pings ' +
    "(and unlocks that group's channel where one exists). Re-open a menu and deselect to remove.\n\n";

  const menus = genMenus(emojiMap);
  for (let i = 0; i < menus.length; i++) {
    const { genKey, row } = menus[i];
    const content = (i === 0 ? intro : '') + `**${genKey}**`;
    let msg = ids.roleMenu.groupMessages[genKey]
      ? await channel.messages.fetch(ids.roleMenu.groupMessages[genKey]).catch(() => null)
      : null;
    if (msg) await msg.edit({ content, components: [row] });
    else msg = await channel.send({ content, components: [row] });
    ids.roleMenu.groupMessages[genKey] = msg.id;
  }

  const eventContent = '**Notifications** 🔔\nOpt in to be pinged for quiz nights & events. Totally optional.';
  let eventMsg = ids.roleMenu.eventMessageId
    ? await channel.messages.fetch(ids.roleMenu.eventMessageId).catch(() => null)
    : null;
  if (eventMsg) await eventMsg.edit({ content: eventContent, components: [eventRow()] });
  else eventMsg = await channel.send({ content: eventContent, components: [eventRow()] });
  ids.roleMenu.eventMessageId = eventMsg.id;

  return ids;
}

// --- interaction handling ---------------------------------------------------

async function handleSelect(interaction, ids) {
  const managed = managedRoles(interaction.customId);
  if (!managed) return; // not one of our menus

  const member = interaction.member;
  const selected = new Set(interaction.values); // role NAMES (scoped to this menu)

  const toAdd = [];
  const toRemove = [];
  for (const name of managed) {
    const roleId = ids.roles[name];
    if (!roleId) continue;
    const has = member.roles.cache.has(roleId);
    if (selected.has(name) && !has) toAdd.push(roleId);
    if (!selected.has(name) && has) toRemove.push(roleId);
  }

  // Don't swallow the result: if the bot's role sits below these roles the API
  // rejects with Missing Permissions, and we must not then claim success.
  let failed = false;
  try {
    if (toAdd.length) await member.roles.add(toAdd, 'role menu self-assign');
    if (toRemove.length) await member.roles.remove(toRemove, 'role menu self-deselect');
  } catch (e) {
    failed = true;
    console.error('role assign failed:', e.message);
  }

  let summary;
  if (failed) {
    summary = "I couldn't update your roles. My role may be too low in the server list. Please ping a mod.";
  } else if (selected.size) {
    summary = `Updated: you now have ${[...selected].join(', ')}.`;
  } else {
    summary = 'Cleared those roles for this menu.';
  }
  await interaction.reply({ content: summary, ephemeral: true });
}

// --- autoVote: react 👍/👎 to new messages in flagged channels ---------------

const autoVoteChannelIds = (ids) =>
  STRUCTURE.flatMap((s) => s.channels)
    .filter((c) => c.autoVote)
    .map((c) => ids.channels[c.name])
    .filter(Boolean);

// --- standalone listener ----------------------------------------------------

async function runListener() {
  const ids = load();
  const voteChannels = new Set(autoVoteChannelIds(ids));
  // Guilds + GuildMessages only (both non-privileged). Select-menu interactions
  // carry the member with their roles, so we don't need the privileged Server
  // Members intent to read/assign roles. GuildMessages (for autoVote) is not
  // privileged either, so no portal toggle is required.
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
    ],
  });

  client.once('clientReady', (c) => console.log(`Worker online as ${c.user.tag} (role menu + quiz + autoVote). Ctrl-C to stop.`));
  client.on('interactionCreate', async (interaction) => {
    try {
      if (interaction.isStringSelectMenu()) await handleSelect(interaction, ids);
      else if (interaction.isButton()) await handleQuizInteraction(interaction);
      else if (interaction.isChatInputCommand()) await handleQuizCommand(interaction);
    } catch (e) { console.error('interaction error:', e.message); }
  });

  // autoVote: react to new suggestions so members can up/down them.
  client.on('messageCreate', async (message) => {
    if (message.author.bot || !voteChannels.has(message.channelId)) return;
    try {
      await message.react('👍');
      await message.react('👎');
    } catch (e) { console.error('autoVote react error:', e.message); }
  });

  await client.login(process.env.DISCORD_TOKEN);
}

// Run as a process only when invoked directly (not when imported by setup.js).
import { fileURLToPath } from 'node:url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runListener().catch((e) => { console.error(e); process.exit(1); });
}
