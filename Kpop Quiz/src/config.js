// config.js — single source of truth for the kpopquiz Discord server.
// Encodes Section 2 (roles), Section 3 (categories/channels/overwrites),
// Section 4 (role menu), and Section 6 (launch set) of the build spec.
//
// Everything here is declarative. setup.js reads this and makes the server
// match it. Editing this file + re-running `npm run setup` is the supported
// way to change the server — the script is idempotent (check-if-exists).

import { PermissionFlagsBits as P } from 'discord.js';

// ---------------------------------------------------------------------------
// Permission overwrite recipes (referenced by channels below).
// Each recipe is a function of the resolved role-id map -> array of overwrites
// in discord.js form: { id, allow: [...], deny: [...] }.
// `everyone` is the @everyone role id (== guild id).
// ---------------------------------------------------------------------------

const VIEW = P.ViewChannel;
const SEND = P.SendMessages;
const REACT = P.AddReactions;

// Read-only: everyone can see but not post; staff + bot can post.
const readOnly = (r) => [
  { id: r.everyone, deny: [SEND] },
  { id: r.Admin, allow: [SEND] },
  { id: r.Mod, allow: [SEND] },
  { id: r.Bot, allow: [SEND] },
];

// Roles channel: visible, can react (for legacy reaction fallback) but not post.
const rolesChannel = (r) => [
  { id: r.everyone, allow: [VIEW, REACT], deny: [SEND] },
  { id: r.Admin, allow: [SEND] },
  { id: r.Mod, allow: [SEND] },
  { id: r.Bot, allow: [SEND] },
];

// Staff only: hidden from everyone, visible to Admin/Mod (+ Bot for logging).
const staffOnly = (r) => [
  { id: r.everyone, deny: [VIEW] },
  { id: r.Admin, allow: [VIEW, SEND] },
  { id: r.Mod, allow: [VIEW, SEND] },
  { id: r.Bot, allow: [VIEW, SEND] },
];

// Creators only: hidden from everyone, visible to creator roles + staff.
const creatorsOnly = (r) => [
  { id: r.everyone, deny: [VIEW] },
  { id: r['Founding Creator'], allow: [VIEW, SEND] },
  { id: r.Creator, allow: [VIEW, SEND] },
  { id: r.Admin, allow: [VIEW, SEND] },
  { id: r.Mod, allow: [VIEW, SEND] },
];

// Creator announcements: same visibility as creatorsOnly but read-only for members.
const creatorReadOnly = (r) => [
  { id: r.everyone, deny: [VIEW] },
  { id: r['Founding Creator'], allow: [VIEW], deny: [SEND] },
  { id: r.Creator, allow: [VIEW], deny: [SEND] },
  { id: r.Admin, allow: [VIEW, SEND] },
  { id: r.Mod, allow: [VIEW, SEND] },
];

// Read-only that is ALSO hidden at launch (sneak-peeks): combine on demand.
const readOnlyHidden = (r) => [
  { id: r.everyone, deny: [VIEW, SEND] },
  { id: r.Admin, allow: [VIEW, SEND] },
  { id: r.Mod, allow: [VIEW, SEND] },
  { id: r.Bot, allow: [VIEW, SEND] },
];

// Group-gated: hidden from everyone; visible to the matching group role only.
// roleName is the group role that unlocks this channel.
const groupGated = (roleName) => (r) => [
  { id: r.everyone, deny: [VIEW] },
  { id: r[roleName], allow: [VIEW, SEND] },
  { id: r.Admin, allow: [VIEW, SEND] },
  { id: r.Mod, allow: [VIEW, SEND] },
];

// Hidden (created but not launched): deny ViewChannel for everyone. Staff keep
// access so they can prep the channel before reveal. Reveal = flip everyone's
// ViewChannel deny (see reveal.js).
const hidden = (r) => [
  { id: r.everyone, deny: [VIEW] },
  { id: r.Admin, allow: [VIEW, SEND] },
  { id: r.Mod, allow: [VIEW, SEND] },
];

// ---------------------------------------------------------------------------
// Roles — created first, top-down (higher = higher priority). Section 2.
// `key` is the stable lookup name used by overwrite recipes.
// ---------------------------------------------------------------------------

export const CORE_ROLES = [
  { name: 'Admin', color: 0xe8457a, hoist: true, mentionable: false, permissions: [P.Administrator] },
  { name: 'Mod', color: 0x3aa6b9, hoist: true, mentionable: false,
    permissions: [P.ManageMessages, P.KickMembers, P.ModerateMembers, P.ManageThreads, P.MuteMembers, P.MoveMembers] },
  { name: 'Bot', color: 0x95a5a6, hoist: false, mentionable: false, permissions: [] },
  { name: 'Founding Creator', color: 0xb45309, hoist: true, mentionable: true, permissions: [] },
  { name: 'Creator', color: 0xa78bfa, hoist: true, mentionable: true, permissions: [] },
  { name: 'Verified', color: 0x000000, hoist: false, mentionable: false, permissions: [] },
];

// Group roles (self-assigned via the role menu), organised by generation so the
// menu can show one ≤25-option select per gen. No hoist, mentionable for
// comeback pings. Section 2.
//
// IMPORTANT: keep the spelling of already-created roles EXACT (e.g. 'BLACKPINK',
// 'NewJeans') so re-running setup stays idempotent instead of making duplicates.
export const GROUPS_BY_GEN = {
  '1st Gen': [
    'H.O.T.', 'Sechskies', 'S.E.S.', 'Fin.K.L', 'Shinhwa', 'g.o.d', 'Baby V.O.X',
  ],
  '2nd Gen': [
    'TVXQ', 'Super Junior', 'BIGBANG', 'Wonder Girls', "Girls' Generation", 'KARA',
    'SHINee', '2NE1', '2PM', '2AM', 'BEAST', '4Minute', 'f(x)', 'SISTAR', 'Apink',
    'INFINITE', 'B1A4', 'Block B', 'EXID', "Girl's Day", 'AOA', 'B.A.P', 'VIXX', 'Teen Top',
  ],
  '3rd Gen': [
    'EXO', 'BTS', 'Red Velvet', 'GOT7', 'SEVENTEEN', 'TWICE', 'BLACKPINK', 'MAMAMOO',
    'GFRIEND', 'MONSTA X', 'NCT', 'iKON', 'WINNER', 'Oh My Girl', 'WJSN', 'ASTRO',
    'PENTAGON', 'The Boyz', 'Dreamcatcher', "NU'EST", 'DAY6', 'Lovelyz', 'MOMOLAND',
  ],
  '4th Gen': [
    'Stray Kids', '(G)I-DLE', 'ITZY', 'ATEEZ', 'TXT', 'aespa', 'ENHYPEN', 'IVE',
    'LE SSERAFIM', 'NewJeans', 'NMIXX', 'STAYC', 'Kep1er', 'TREASURE', 'CRAVITY',
    'P1Harmony', 'Billlie', 'Weeekly', 'Purple Kiss', 'FIFTY FIFTY',
  ],
  '5th Gen': [
    'ZEROBASEONE', 'RIIZE', 'BABYMONSTER', 'KISS OF LIFE', 'BOYNEXTDOOR', 'ILLIT',
    'NCT WISH', 'tripleS', 'MEOVV', 'Hearts2Hearts', '&TEAM', 'TWS', 'izna', 'ARTMS',
  ],
};

// Flat, de-duplicated list — used to create the roles and by the menu handler.
export const GROUP_ROLES = [...new Set(Object.values(GROUPS_BY_GEN).flat())];

// Only these groups get a dedicated gated channel (lean by design). Every other
// group still gets a ROLE for flair + comeback pings via the menu.
export const GROUP_CHANNELS = [
  'BTS', 'BLACKPINK', 'Stray Kids', 'TWICE', 'aespa', 'SEVENTEEN',
  'NewJeans', 'IVE', 'ENHYPEN', 'TXT', 'LE SSERAFIM', 'EXO',
];

// Utility roles. Section 2 / 4.
export const UTILITY_ROLES = ['Event Pings'];

// ---------------------------------------------------------------------------
// Categories + channels. Section 3 + Section 6 launch flags.
// type: 'text' | 'announcement' | 'voice' | 'forum'
// overwrites: recipe function (resolved at runtime) — omit for default perms.
// launchAtStart: false => forced hidden regardless of recipe (Section 6).
// ---------------------------------------------------------------------------

export const STRUCTURE = [
  {
    category: 'Welcome',
    channels: [
      { name: 'welcome', type: 'text', overwrites: readOnly, launchAtStart: true,
        topic: 'What kpopquiz is + link to the site → https://kpopquiz.org' },
      { name: 'rules', type: 'text', overwrites: readOnly, launchAtStart: true,
        topic: 'Be kind, no leaks/pirated content, chosen languages.' },
      { name: 'roles', type: 'text', overwrites: rolesChannel, launchAtStart: true,
        topic: 'Pick your groups and notification pings.', isRoleMenu: true },
      { name: 'announcements', type: 'announcement', overwrites: readOnly, launchAtStart: true,
        topic: 'Features, daily quiz, comebacks, events.' },
    ],
  },
  {
    category: 'Community',
    channels: [
      { name: 'general', type: 'text', launchAtStart: true,
        topic: 'The main hangout.' },
      { name: 'introduce-yourself', type: 'text', launchAtStart: true, slowmode: 10,
        topic: "Who you stan, where you're from." },
      { name: 'kpop-chat', type: 'text', overwrites: hidden, launchAtStart: false,
        topic: 'General fandom talk.' },
      { name: 'off-topic', type: 'text', overwrites: hidden, launchAtStart: false,
        topic: 'Non-K-pop.' },
      { name: 'hangout', type: 'voice', launchAtStart: true },
    ],
  },
  {
    category: 'Play',
    channels: [
      { name: 'daily-quiz', type: 'text', launchAtStart: true,
        topic: 'Today\'s quiz. Post your score, keep your streak.' },
      { name: 'share-your-quiz', type: 'text', launchAtStart: true,
        topic: 'Made a quiz? Drop it here for fans to play.' },
      { name: 'score-flex', type: 'text', overwrites: hidden, launchAtStart: false,
        topic: 'Brag about scores / perfect runs / stumped %.' },
      { name: '1v1-battles', type: 'text', overwrites: hidden, launchAtStart: false,
        topic: 'Drop battle challenge links, find opponents.' },
      { name: 'blindtest', type: 'text', overwrites: hidden, launchAtStart: false,
        topic: 'Share blindtest scores.' },
      { name: 'quiz-requests', type: 'text', overwrites: hidden, launchAtStart: false,
        topic: '"Someone make a NewJeans quiz." Feeds creators demand signals.' },
      { name: 'blindtest-vc', type: 'voice', launchAtStart: true },
    ],
  },
  {
    category: 'Build',
    channels: [
      { name: 'feedback', type: 'text', launchAtStart: true,
        topic: "Bugs, what's broken." },
      { name: 'suggestions', type: 'text', overwrites: hidden, launchAtStart: false, autoVote: true,
        topic: 'Feature ideas; bot adds up/down reactions automatically.' },
      { name: 'sneak-peeks', type: 'text', overwrites: readOnlyHidden, launchAtStart: false,
        topic: 'We tease upcoming features. Admin/Mod post only.' },
    ],
  },
  {
    category: 'Events',
    channels: [
      { name: 'events', type: 'text', overwrites: hidden, launchAtStart: false,
        topic: 'Scheduled quiz nights, tournaments, comeback challenges. Pings @Event Pings.' },
    ],
  },
  {
    category: 'Founding Creators',
    channels: [
      { name: 'creator-corner', type: 'text', overwrites: creatorsOnly, launchAtStart: true,
        topic: 'For the fans building kpopquiz with us.' },
      { name: 'creator-announcements', type: 'text', overwrites: creatorReadOnly, launchAtStart: false,
        topic: 'Creator-specific news.' },
    ],
  },
  {
    category: 'Groups',
    // Per-group gated channels for the biggest fandoms only. Most hidden at
    // start; open the 2–3 biggest first. (All groups still get a role.)
    channels: GROUP_CHANNELS.map((role, i) => ({
      name: role.toLowerCase().replace(/\s+/g, '-'),
      type: 'text',
      overwrites: groupGated(role),
      // Open BTS, BLACKPINK, Stray Kids at launch; rest gated+hidden.
      launchAtStart: i < 3,
      groupRole: role,
      topic: `${role} fan channel. Opt into the ${role} role in #roles to see this.`,
    })),
  },
  {
    category: 'Staff',
    channels: [
      { name: 'mod-chat', type: 'text', overwrites: staffOnly, launchAtStart: true,
        topic: 'Mods only.' },
      { name: 'mod-log', type: 'text', overwrites: staffOnly, launchAtStart: true,
        topic: 'Bot posts moderation logs (joins, deletes, timeouts).' },
      { name: 'bot-commands', type: 'text', overwrites: staffOnly, launchAtStart: false,
        topic: 'Where admins run bot commands.' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Role menu (Section 4). Select-menu approach — see roleMenu.js.
// Emojis are best-effort; swap for custom group emojis once uploaded.
// ---------------------------------------------------------------------------

export const GROUP_EMOJI = {
  // Headliners
  'BTS': '💜', 'BLACKPINK': '🖤', 'Stray Kids': '🐺', 'TWICE': '🍭',
  'aespa': '🦋', 'SEVENTEEN': '💎', 'NewJeans': '🐰', 'IVE': '💙',
  'ENHYPEN': '🌙', 'TXT': '✨', 'LE SSERAFIM': '🔵', 'EXO': '⭐',
  // 1st gen
  'H.O.T.': '⚪', 'Sechskies': '💛', 'S.E.S.': '🧚', 'Fin.K.L': '🌸',
  'Shinhwa': '🔶', 'g.o.d': '🍼', 'Baby V.O.X': '💋',
  // 2nd gen
  'TVXQ': '🔴', 'Super Junior': '🌊', 'BIGBANG': '👑', 'Wonder Girls': '🎀',
  "Girls' Generation": '💗', 'KARA': '🐞', 'SHINee': '💚', '2NE1': '⚫',
  '2PM': '🐾', '2AM': '😴', 'BEAST': '⬛', '4Minute': '🟣', 'f(x)': '🔻',
  'SISTAR': '💖', 'Apink': '🌷', 'INFINITE': '💛', 'B1A4': '🍀',
  'Block B': '🐝', 'EXID': '🌟', "Girl's Day": '🌼', 'AOA': '🤍',
  'B.A.P': '🐇', 'VIXX': '🌹', 'Teen Top': '⚡',
  // 3rd gen
  'Red Velvet': '🍰', 'GOT7': '🟢', 'MAMAMOO': '🌈', 'GFRIEND': '💠',
  'MONSTA X': '🌑', 'NCT': '🟩', 'iKON': '🎈', 'WINNER': '🌀',
  'Oh My Girl': '🍃', 'WJSN': '🌌', 'ASTRO': '💫', 'PENTAGON': '🔷',
  'The Boyz': '🎯', 'Dreamcatcher': '🐉', "NU'EST": '🔆', 'DAY6': '🎸',
  'Lovelyz': '🌺', 'MOMOLAND': '🍬',
  // 4th gen
  '(G)I-DLE': '🔥', 'ITZY': '🪩', 'ATEEZ': '⚓', 'NMIXX': '🧩',
  'STAYC': '🫧', 'Kep1er': '🌠', 'TREASURE': '🔱', 'CRAVITY': '🌙',
  'P1Harmony': '🎭', 'Billlie': '🐦', 'Weeekly': '🌻', 'Purple Kiss': '🔮',
  'FIFTY FIFTY': '🎰',
  // 5th gen
  'ZEROBASEONE': '🟦', 'RIIZE': '🌅', 'BABYMONSTER': '👾', 'KISS OF LIFE': '💄',
  'BOYNEXTDOOR': '🚪', 'ILLIT': '🍒', 'NCT WISH': '🌟', 'tripleS': '🔹',
  'MEOVV': '🐱', 'Hearts2Hearts': '💞', '&TEAM': '🌋', 'TWS': '🩵',
  'izna': '🌩', 'ARTMS': '🪐',
};

// Group menus are built per-generation in roleMenu.js; each menu's customId is
// `${GROUP_MENU_PREFIX}${genKey}` so the handler knows which roles it manages.
export const GROUP_MENU_PREFIX = 'kq_group::';

export const ROLE_MENU = {
  channel: 'roles',
  eventSelect: {
    customId: 'kq_event_select',
    placeholder: 'Notifications…',
    options: [
      { label: 'Event Pings', value: 'Event Pings', emoji: '🔔',
        description: 'Get pinged for quiz nights & events.' },
    ],
  },
};

// ---------------------------------------------------------------------------
// Server-level defaults (Section 5). Applied where the API allows.
// ---------------------------------------------------------------------------

export const SERVER_DEFAULTS = {
  // Medium: members must be registered on Discord > 5 min.
  verificationLevel: 'Medium',
  // Server-wide default: only @mentions, so the server isn't noisy.
  defaultMessageNotifications: 'OnlyMentions',
};

export const CATEGORY_ORDER = STRUCTURE.map((s) => s.category);

// ---------------------------------------------------------------------------
// Visual theme (cosmetic). Applied by `npm run personalize` — purely display
// names + role colors, so it never touches IDs, permissions, or gating.
// Tweak freely and re-run; it's idempotent (names are rebuilt from the slug).
// ---------------------------------------------------------------------------

// Brand pink — used for embeds and accents. Matches the Admin role.
export const BRAND_COLOR = 0xe8457a;

// Channel display = `${emoji}・${slug}`. Group channels fall back to GROUP_EMOJI.
export const CHANNEL_EMOJI = {
  welcome: '👋', rules: '📜', roles: '🎀', announcements: '📢',
  general: '💬', 'introduce-yourself': '🌟', 'kpop-chat': '🎵', 'off-topic': '🌙',
  hangout: '🔊', 'blindtest-vc': '🎧',
  'daily-quiz': '🧠', 'share-your-quiz': '🎲', 'score-flex': '🏆',
  '1v1-battles': '⚔️', blindtest: '🎧', 'quiz-requests': '📝',
  feedback: '🐛', suggestions: '💡', 'sneak-peeks': '👀',
  events: '🎉', 'creator-corner': '✨', 'creator-announcements': '📣',
  'mod-chat': '🛡️', 'mod-log': '📋', 'bot-commands': '🤖',
};

// Category display = `『${emoji}』 ${NAME}` — the corner brackets give a clean
// K-pop / East-Asian aesthetic touch.
export const CATEGORY_EMOJI = {
  Welcome: '🌸', Community: '💬', Play: '🎮', Build: '🛠️',
  Events: '🎉', 'Founding Creators': '⭐', Groups: '🩷', Staff: '🔒',
};

// Signature-ish colors so each group role shows up colored in the member list.
// Approximate fandom palettes — adjust to taste.
export const GROUP_COLOR = {
  'BTS': 0x9b59b6, 'BLACKPINK': 0xf15a9c, 'Stray Kids': 0xe4002b, 'TWICE': 0xf98fb3,
  'aespa': 0x6ec1e4, 'SEVENTEEN': 0xf4a7c0, 'NewJeans': 0x6e8bff, 'IVE': 0xc0397e,
  'ENHYPEN': 0xb22234, 'TXT': 0x4fc3d2, 'LE SSERAFIM': 0x2e5eaa, 'EXO': 0xc9a227,
};

// Per-channel info cards, posted + pinned by `npm run guides`. welcome/rules/
// roles are skipped (they carry their own embeds/menu). Group channels get a
// generated card. Idempotent: edits the pinned card on re-run.
export const CHANNEL_INFO = {
  announcements: 'Official kpopquiz news: new features on the site, the daily quiz drop, idol comebacks, and server events. Keep notifications on so you never miss a thing.',
  general: 'The main hangout. Talk K-pop, your day, your biases. Anything goes within #rules. New here? Drop a hello! 👋',
  'introduce-yourself': "Tell us who you stan, where you're from, and how you found kpopquiz. We read every intro. 💗",
  'kpop-chat': 'All things K-pop: comebacks, MVs, charts, concerts, hot takes. Keep fanwars out (see #rules).',
  'off-topic': "Everything that isn't K-pop: games, food, memes, life. The cozy corner.",
  'daily-quiz': 'A fresh K-pop quiz drops here every day. Play it on kpopquiz.org, post your score, and keep your streak alive. See who survives the hardest questions.',
  'share-your-quiz': 'Made your own quiz on kpopquiz.org? Drop the link here for the community to play. Tell us the theme and difficulty!',
  'score-flex': 'Brag zone. Perfect runs, insane streaks, stumped-% screenshots. Show off your best.',
  '1v1-battles': 'Challenge someone head-to-head. Drop your battle link, find an opponent, and settle who really knows K-pop.',
  blindtest: 'Share your blindtest scores and brag about how few seconds you needed. For live games, hop into 🎧・blindtest-vc with KMQ.',
  'quiz-requests': '"Someone make a NewJeans quiz!" Request quiz topics here. Creators watch this channel for what to build next.',
  feedback: 'Found a bug or something broken on kpopquiz.org? Tell us here with as much detail as you can. It goes straight to the team.',
  suggestions: 'Got a feature idea? Post it and the bot adds 👍/👎 so the community can vote. Top ideas get built.',
  'sneak-peeks': 'Where we tease upcoming features before anyone else. Admin/Mod post only. Lurk and get hyped.',
  events: 'Quiz nights, tournaments, comeback challenges. Opt into Event Pings in #roles so you never miss one.',
  'creator-corner': 'A space for the fans building kpopquiz with us. Collaborate, share WIPs, and shape what comes next.',
  'creator-announcements': 'Creator-specific news and updates. Read-only. Important stuff for our founding creators.',
  'mod-chat': 'Staff coordination. Members can\'t see this.',
  'mod-log': 'Automated moderation log. AutoMod blocks, deletes, timeouts and joins land here for the team.',
  'bot-commands': 'Run bot commands here to keep the rest of the server clean.',
  hangout: 'General voice channel. Drop in and vibe with the community. 🔊',
  'blindtest-vc': 'The blindtest voice channel. Invite KMQ, type /play, and guess K-pop songs live. Use /options to customize and /locale Français to switch language.',
};
