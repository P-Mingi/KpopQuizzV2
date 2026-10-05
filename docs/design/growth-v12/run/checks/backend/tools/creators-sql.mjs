// C2 C02: recompute the creators board from the database (read only, paginated past
// the 1000-row cap) with the rules the page prints, independently of lib/creators.
// Usage: node creators-sql.mjs > ../creators-sql.txt
import { rows } from './c2-read.mjs';

async function all(pathBase, order) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const r = await rows(`${pathBase}&order=${order}&offset=${from}&limit=1000`);
    if (!Array.isArray(r.body)) throw new Error(`read ${pathBase}: ${r.status}`);
    out.push(...r.body);
    if (r.body.length < 1000) return out;
  }
}

const quizzes = await all('quizzes?select=id,creator_id&status=eq.published', 'id.asc');
const banned = new Set((await all('profiles?select=id&banned_at=not.is.null', 'id.asc')).map((p) => p.id));
const plays = await all('plays?select=id,quiz_id,player_id,anon_id,created_at', 'created_at.asc,id.asc');
const creatorOf = new Map(quizzes.map((q) => [q.id, q.creator_id]));
const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();

function board(since) {
  const seen = new Set();
  const per = new Map();
  for (const p of plays) {
    if (since && p.created_at < since) continue;
    const c = creatorOf.get(p.quiz_id);
    if (!c || banned.has(c)) continue;
    if (p.player_id && p.player_id === c) continue;
    const who = p.player_id ? `u:${p.player_id}` : p.anon_id ? `a:${p.anon_id}` : `p:${p.id}`;
    const k = `${who}|${p.quiz_id}|${p.created_at.slice(0, 10)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    per.set(c, (per.get(c) ?? 0) + 1);
  }
  return [...per.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
}

const ids = new Set([...board(monthStart), ...board(null)].map(([c]) => c));
const names = new Map();
const pr = await rows(`profiles?select=id,username&id=in.(${[...ids].join(',')})`);
for (const p of pr.body) names.set(p.id, p.username);
console.log(`C2 creators recompute at ${new Date().toISOString()}: ${plays.length} plays, ${quizzes.length} published quizzes, ${banned.size} banned profiles`);
console.log(`This month (since ${monthStart}):`);
for (const [c, n] of board(monthStart)) console.log(`  ${names.get(c)}\t${n}`);
console.log('All time:');
for (const [c, n] of board(null)) console.log(`  ${names.get(c)}\t${n}`);
