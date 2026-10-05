// C2 data guard: counts the brief lists, read only. Usage: node data-guard.mjs <label>
// Writes ../data-guard-<label>.txt. The test user's id is never written, only its XP.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { count, rows, env } from './c2-read.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const label = process.argv[2] || 'now';
const out = [`C2 data guard (${label}) at ${new Date().toISOString()}`, ''];

for (const t of ['plays', 'duel_votes', 'name_all_member_results', 'personality_results', 'daily_blindtest_scores']) {
  const c = await count(t);
  out.push(`${t}\t${c.count}\t(http ${c.status})`);
}
if (env.testUser) {
  const r = await rows(`profiles?select=xp,daily_streak,quizzes_played,blindtests_played,duels_voted,bias&id=eq.${env.testUser}`);
  const p = Array.isArray(r.body) ? r.body[0] : null;
  if (p) out.push(`profiles(test user)\txp=${p.xp}\tdaily_streak=${p.daily_streak}\tquizzes_played=${p.quizzes_played}\tblindtests_played=${p.blindtests_played}\tduels_voted=${p.duels_voted}\tbias=${p.bias ?? "null"}`);
  else {
    const r2 = await rows(`profiles?select=xp&id=eq.${env.testUser}`);
    out.push(`profiles(test user)\txp=${Array.isArray(r2.body) && r2.body[0] ? r2.body[0].xp : 'unreadable'}\t(http ${r2.status})`);
  }
  const tp = await count('plays', `player_id=eq.${env.testUser}`);
  out.push(`plays(test user)\t${tp.count}`);
} else out.push('profiles(test user)\tUX_V1_TEST_USER_ID not set');

const file = path.join(here, '..', `data-guard-${label}.txt`);
fs.writeFileSync(file, out.join('\n') + '\n');
console.log(out.join('\n'));
