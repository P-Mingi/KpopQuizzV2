// Shared constants, REST helpers and response builders for the serverless
// Discord interactions endpoint. Mirrors the role/menu config from the bot
// project (Kpop Quiz/src/config.js) so the menus that are already posted keep
// working after the cutover.

const API = 'https://discord.com/api/v10';
export const BRAND_COLOR = 0xe8457a;
export const GROUP_MENU_PREFIX = 'kq_group::';
export const COLOR_MENU = 'kq_color_select';
export const EVENT_MENU = 'kq_event_select';
export const EVENT_ROLES = ['Event Pings'];
export const COLOR_ROLES = ['Pink', 'Purple', 'Sky', 'Mint', 'Peach', 'Rose', 'Pearl', 'Onyx'];

// Group roles per generation — must match Kpop Quiz/src/config.js GROUPS_BY_GEN.
export const GROUPS_BY_GEN: Record<string, string[]> = {
  '1st Gen': ['H.O.T.', 'Sechskies', 'S.E.S.', 'Fin.K.L', 'Shinhwa', 'g.o.d', 'Baby V.O.X'],
  '2nd Gen': ['TVXQ', 'Super Junior', 'BIGBANG', 'Wonder Girls', "Girls' Generation", 'KARA',
    'SHINee', '2NE1', '2PM', '2AM', 'BEAST', '4Minute', 'f(x)', 'SISTAR', 'Apink', 'INFINITE',
    'B1A4', 'Block B', 'EXID', "Girl's Day", 'AOA', 'B.A.P', 'VIXX', 'Teen Top'],
  '3rd Gen': ['EXO', 'BTS', 'Red Velvet', 'GOT7', 'SEVENTEEN', 'TWICE', 'BLACKPINK', 'MAMAMOO',
    'GFRIEND', 'MONSTA X', 'NCT', 'iKON', 'WINNER', 'Oh My Girl', 'WJSN', 'ASTRO', 'PENTAGON',
    'The Boyz', 'Dreamcatcher', "NU'EST", 'DAY6', 'Lovelyz', 'MOMOLAND'],
  '4th Gen': ['Stray Kids', '(G)I-DLE', 'ITZY', 'ATEEZ', 'TXT', 'aespa', 'ENHYPEN', 'IVE',
    'LE SSERAFIM', 'NewJeans', 'NMIXX', 'STAYC', 'Kep1er', 'TREASURE', 'CRAVITY', 'P1Harmony',
    'Billlie', 'Weeekly', 'Purple Kiss', 'FIFTY FIFTY'],
  '5th Gen': ['ZEROBASEONE', 'RIIZE', 'BABYMONSTER', 'KISS OF LIFE', 'BOYNEXTDOOR', 'ILLIT',
    'NCT WISH', 'tripleS', 'MEOVV', 'Hearts2Hearts', '&TEAM', 'TWS', 'izna', 'ARTMS'],
};

// --- minimal interaction types (only the fields we read) --------------------

export interface Interaction {
  type: number;
  guild_id?: string;
  channel_id?: string;
  member?: { user: { id: string; global_name?: string | null; username: string }; roles: string[] };
  user?: { id: string; global_name?: string | null; username: string };
  data?: { name?: string; custom_id?: string; values?: string[] };
}

export function interactionUser(i: Interaction) {
  const u = i.member?.user ?? i.user;
  return { id: u?.id ?? '', name: u?.global_name || u?.username || 'someone' };
}

// --- which role names does a menu custom_id manage? -------------------------

export function managedRoles(customId: string): string[] | null {
  if (customId === EVENT_MENU) return EVENT_ROLES;
  if (customId === COLOR_MENU) return COLOR_ROLES;
  if (customId.startsWith(GROUP_MENU_PREFIX)) return GROUPS_BY_GEN[customId.slice(GROUP_MENU_PREFIX.length)] ?? null;
  return null;
}

// --- Discord REST (bot token) ------------------------------------------------

function botHeaders(): Record<string, string> {
  return { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' };
}

let roleMapCache: Map<string, string> | null = null;
export async function roleMap(guildId: string): Promise<Map<string, string>> {
  if (roleMapCache) return roleMapCache;
  const res = await fetch(`${API}/guilds/${guildId}/roles`, { headers: botHeaders() });
  const roles = (await res.json()) as Array<{ id: string; name: string }>;
  roleMapCache = new Map(roles.map((r) => [r.name, r.id]));
  return roleMapCache;
}

export async function addRole(guildId: string, userId: string, roleId: string): Promise<void> {
  await fetch(`${API}/guilds/${guildId}/members/${userId}/roles/${roleId}`, { method: 'PUT', headers: botHeaders() });
}
export async function removeRole(guildId: string, userId: string, roleId: string): Promise<void> {
  await fetch(`${API}/guilds/${guildId}/members/${userId}/roles/${roleId}`, { method: 'DELETE', headers: botHeaders() });
}
export async function postMessage(channelId: string, body: unknown): Promise<void> {
  await fetch(`${API}/channels/${channelId}/messages`, { method: 'POST', headers: botHeaders(), body: JSON.stringify(body) });
}

// --- interaction response builders (raw API shapes) -------------------------

export const EPHEMERAL = 1 << 6; // 64

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ephemeral(content: string): any {
  return { type: 4, data: { content, flags: EPHEMERAL } };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function reply(data: any, update = false): any {
  return { type: update ? 7 : 4, data: { flags: EPHEMERAL, ...data } };
}
