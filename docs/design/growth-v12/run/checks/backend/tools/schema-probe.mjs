// C2: which v12 tables / views exist in production right now (read only, limit 0).
// Also the two G6 columns on name_all_member_results. Writes ../schema-probe.txt.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exists, rows } from './c2-read.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const objects = [
  ['bt_runs', 'v12-g1-bt-runs.sql'], ['bt_song_stats', 'v12-g1-bt-runs.sql'], ['quiz_score_stats', 'v12-g1-quiz-score-stats.sql'],
  ['live_rooms', 'v12-g4-live.sql'], ['live_players', 'v12-g4-live.sql'], ['live_answers', 'v12-g4-live.sql'],
  ['duel_vote_guard', 'v12-g7-this-or-that.sql'], ['duel_song_rankings', 'v12-g7-this-or-that.sql'],
  ['share_link_plays', 'v12-g8-share-link-plays.sql'],
  ['editorial_accounts', 'v12-g9-editorial.sql'], ['editorial_drafts', 'v12-g9-editorial.sql'], ['editorial_posts', 'v12-g9-editorial.sql'],
  ['duel_questions', 'existing'], ['duel_votes', 'existing'], ['personality_results', 'existing'], ['name_all_member_results', 'existing'],
];
const out = [`C2 schema probe at ${new Date().toISOString()} (GET ?limit=0, service role)`, ''];
for (const [t, file] of objects) {
  const e = await exists(t);
  out.push(`${t}\t${e.exists ? 'EXISTS' : 'absent'}\thttp ${e.status}${e.code ? ` ${e.code}` : ''}\t${file}`);
}
const cols = await rows('name_all_member_results?select=found_order,round_seconds&limit=0');
out.push(`name_all_member_results.found_order,round_seconds\t${cols.status === 200 ? 'EXISTS' : 'absent'}\thttp ${cols.status}\tv12-g6-name-all.sql`);
const songs = await rows('songs?select=id&year=eq.2026&limit=1');
out.push(`songs with year 2026\t${Array.isArray(songs.body) ? songs.body.length : '?'} (limit 1)\tv12-g2-03-releases-2026.sql`);
const grp = await rows('groups?select=slug&slug=in.(rescene,nct-wish)');
out.push(`groups rescene / nct-wish\t${Array.isArray(grp.body) ? grp.body.map((g) => g.slug).join(',') || 'none' : grp.status}\tv12-g2-01-groups.sql`);
fs.writeFileSync(path.join(here, '..', 'schema-probe.txt'), out.join('\n') + '\n');
console.log(out.join('\n'));
