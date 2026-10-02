// Capture what POST /api/blind-test/generate answers on a running dev server, in a form two runs
// can be compared in (generate shuffles, so the questions themselves differ on every call).
// generate only reads: no request here writes anything.
//   npx tsx scripts/v12/catalogue/flag-diff.mts http://localhost:3062 <out.json>
//
// Normalisation (COMMON.md rule 12): per case we keep the status, the echo fields, the number of
// questions and the POOL the game was drawn from (all_artists / all_titles, sorted): the pool is
// what a filter decides. Every question must come from that pool. The random pick, the order of
// questions, the choices and the Deezer preview links are not compared.
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';

const [base, out] = process.argv.slice(2);
if (!base || !out) { console.error('usage: flag-diff.mts <base url> <out.json>'); process.exit(2); }

const LEGACY = ['all', 'gg', 'bg', 'solo', '1st-gen', '2nd-gen', '3rd-gen', '4th-gen', '5th-gen', 'title-tracks', 'hits', 'deep'];
const V12 = ['kpop-hits-2026', 'kpop-hits-2025', 'tiktok-viral', 'kpop-demon-hunters', 'recent-hits', 'kpop-legends', '4th-gen-gg', '4th-gen-bg'];
const cases: { name: string; body: Record<string, unknown> }[] = [
  ...LEGACY.map((p) => ({ name: `legacy ${p}`, body: { playlist: p, count: 10, mode: 'challenge' } })),
  { name: 'legacy all, 5 songs', body: { playlist: 'all', count: 5, mode: 'challenge' } },
  { name: 'legacy all, 15 songs, quick', body: { playlist: 'all', count: 15 } },
  { name: 'legacy no body', body: {} },
  { name: 'group bts', body: { playlist: 'bts', count: 10, mode: 'challenge' } },
  { name: 'group twice', body: { playlist: 'twice', count: 10, mode: 'challenge' } },
  { name: 'group stray-kids, 15', body: { playlist: 'stray-kids', count: 15, mode: 'challenge' } },
  { name: 'multi bts + twice', body: { groups: ['bts', 'twice'], count: 10, mode: 'challenge' } },
  { name: 'unknown id', body: { playlist: 'zzz-not-a-playlist', count: 10 } },
  ...V12.map((p) => ({ name: `v12 ${p}`, body: { playlist: p, count: 10, mode: 'challenge' } })),
];

// Wait for the dev server (first compile included).
for (let i = 0; ; i++) {
  try { const r = await fetch(`${base}/api/blind-test/generate`, { method: 'POST', body: '{"playlist":"all","count":5}' }); if (r.status === 200) break; } catch { /* not up yet */ }
  if (i > 90) { console.error('dev server did not answer'); process.exit(1); }
  await new Promise((r) => setTimeout(r, 2000));
}

const hash = (xs: string[]): string => createHash('sha256').update(JSON.stringify([...xs].sort())).digest('hex').slice(0, 16);
const result: Record<string, unknown> = {};
for (const c of cases) {
  const res = await fetch(`${base}/api/blind-test/generate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(c.body) });
  const j = (await res.json()) as Record<string, unknown>;
  if (res.status !== 200) { result[c.name] = { status: res.status, body: j }; continue; }
  const questions = j.questions as { question_type: string; reveal: { title: string; artist: string } }[];
  const titles = j.all_titles as string[];
  const artists = j.all_artists as string[];
  result[c.name] = {
    status: res.status, playlist: j.playlist, mode: j.mode, difficulty: j.difficulty, timer_duration: j.timer_duration, songs_count: j.songs_count,
    questions: questions.length,
    pool_titles: titles.length, pool_titles_hash: hash(titles), pool_artists: artists.length, pool_artists_hash: hash(artists),
    every_question_from_pool: questions.every((q) => titles.includes(q.reveal.title) && artists.includes(q.reveal.artist)),
    only_title_questions: questions.every((q) => q.question_type === 'title'),
    keys: Object.keys(j).sort().join(','),
  };
}
writeFileSync(out, JSON.stringify(result, null, 1) + '\n');
console.log(`${cases.length} cases written to ${out}`);
