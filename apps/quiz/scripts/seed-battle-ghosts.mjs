// E3 - seed the ghost pool so the first real battlers face real-feeling
// opponents. For the top ~20 published multiple-choice quizzes, insert a handful
// of plausible battle_results (varied scores/times, anon "seed_" hashes). Run:
//   node scripts/seed-battle-ghosts.mjs        (from apps/quiz)
// Idempotent: removes prior seed rows (hash like 'seed_%') before re-seeding.
import fs from 'node:fs';
import crypto from 'node:crypto';

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split('\n')
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]),
);
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: SVC, Authorization: 'Bearer ' + SVC, 'Content-Type': 'application/json' };

const COUNT = 7;
const PER_QUIZ = 4; // ghosts per quiz
const seedHash = () => 'seed_' + crypto.randomBytes(6).toString('hex');
const uuid = () => crypto.randomUUID();
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function perQuestion(score) {
  const a = Array.from({ length: COUNT }, (_, i) => i < score);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
// score distribution by difficulty (out of 7)
const DIST = {
  easy: [7, 6, 6, 5, 5, 4],
  medium: [7, 6, 5, 5, 4, 3],
  hard: [6, 5, 4, 4, 3, 2],
};

async function main() {
  // remove prior seeds (idempotent)
  await fetch(`${URL}/rest/v1/battle_results?player_hash=like.seed_*`, { method: 'DELETE', headers: H });
  await fetch(`${URL}/rest/v1/battles?challenger_hash=like.seed_*`, { method: 'DELETE', headers: H });

  const quizzes = await (await fetch(
    `${URL}/rest/v1/quizzes?status=eq.published&quiz_type=eq.multiple_choice&select=id,difficulty,play_count&order=play_count.desc&limit=20`,
    { headers: H },
  )).json();

  // groups for group-level battles (the /battle topic picker uses group_slug)
  const groups = await (await fetch(
    `${URL}/rest/v1/groups?select=slug,quiz_count&order=quiz_count.desc&limit=15`,
    { headers: H },
  )).json();

  let battlesMade = 0;
  let resultsMade = 0;

  async function seedOne(target /* {quiz_id, group_slug, difficulty} */) {
    const dist = DIST[target.difficulty] ?? DIST.medium;
    for (let n = 0; n < PER_QUIZ; n++) {
      const score = pick(dist);
      const b = await (await fetch(`${URL}/rest/v1/battles`, {
        method: 'POST', headers: { ...H, Prefer: 'return=representation' },
        body: JSON.stringify({
          quiz_id: target.quiz_id ?? null, group_slug: target.group_slug ?? null,
          question_ids: Array.from({ length: COUNT }, uuid),
          questions: null,
          challenger_hash: seedHash(), challenger_score: score,
        }),
      })).json();
      const battleId = Array.isArray(b) ? b[0].id : null;
      if (!battleId) continue;
      battlesMade++;
      const r = await fetch(`${URL}/rest/v1/battle_results`, {
        method: 'POST', headers: { ...H, Prefer: 'return=minimal' },
        body: JSON.stringify({
          battle_id: battleId, player_hash: seedHash(), score,
          per_question: perQuestion(score),
          time_ms: 25000 + Math.floor(Math.random() * 35000),
        }),
      });
      if (r.ok) resultsMade++;
    }
  }

  // quiz-anchored ghosts (direct quiz battles / challenge links)
  for (const q of quizzes) await seedOne({ quiz_id: q.id, difficulty: q.difficulty });
  // group-level ghosts (the /battle topic picker creates group battles)
  for (const g of groups) await seedOne({ group_slug: g.slug, difficulty: 'medium' });

  console.log(`Seeded ${resultsMade} ghost results (${battlesMade} seed battles) across ${quizzes.length} quizzes + ${groups.length} groups.`);
}
main();
