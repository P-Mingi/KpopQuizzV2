// Routes a verified Discord interaction to the right handler and returns the
// raw interaction-response JSON.

import {
  managedRoles, roleMap, addRole, removeRole, ephemeral, interactionUser, type Interaction,
} from './discord';
import { quizStart, quizAnswer, quizNext, quizShare, quizLeaderboard } from './quiz';

async function handleRoleMenu(i: Interaction, managed: string[]) {
  const guildId = i.guild_id ?? '';
  const userId = interactionUser(i).id;
  const has = new Set(i.member?.roles ?? []);
  const selected = new Set(i.data?.values ?? []);
  const map = await roleMap(guildId);

  let failed = false;
  for (const name of managed) {
    const roleId = map.get(name);
    if (!roleId) continue;
    try {
      if (selected.has(name) && !has.has(roleId)) await addRole(guildId, userId, roleId);
      if (!selected.has(name) && has.has(roleId)) await removeRole(guildId, userId, roleId);
    } catch { failed = true; }
  }

  if (failed) return ephemeral("I couldn't update some of your roles. My role may be too low in the list. Please ping a mod.");
  return ephemeral(selected.size ? `Updated: you now have ${[...selected].join(', ')}.` : 'Cleared those roles for this menu.');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleInteraction(i: Interaction): Promise<any> {
  // Slash commands
  if (i.type === 2) {
    const name = i.data?.name;
    if (name === 'dailyquiz') return quizStart();
    if (name === 'quizleaderboard') return quizLeaderboard();
    return ephemeral('Unknown command.');
  }

  // Message components (buttons + select menus)
  if (i.type === 3) {
    const cid = i.data?.custom_id ?? '';
    if (cid === 'kq_quiz_start') return quizStart();
    if (cid.startsWith('kq_quiz_a:')) { const [, q, s, c] = cid.split(':'); return quizAnswer(Number(q), Number(s), Number(c)); }
    if (cid.startsWith('kq_quiz_n:')) { const [, q, s] = cid.split(':'); return quizNext(i, Number(q), Number(s)); }
    if (cid.startsWith('kq_quiz_sh:')) { const [, s, t] = cid.split(':'); return quizShare(i, Number(s), Number(t)); }
    const managed = managedRoles(cid);
    if (managed) return handleRoleMenu(i, managed);
  }

  return ephemeral('Sorry, I could not handle that.');
}
