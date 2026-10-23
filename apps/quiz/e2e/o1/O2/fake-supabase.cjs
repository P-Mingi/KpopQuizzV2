// Run O1, lane O2: minimal PostgREST stand-in for the render comparison (kpop-render-count.sh): quizzes and one group, everything else empty.
const http = require('http');
const PORT = Number(process.env.FAKE_PORT || 4199);
const now = Date.now();
const GROUPS = [
  { slug: 'bts', name: 'BTS', display_color: '#7c3aed', text_color: '#ffffff', fandom_name: 'ARMY', logo_url: null },
  { slug: 'blackpink', name: 'BLACKPINK', display_color: '#ec4899', text_color: '#ffffff', fandom_name: 'BLINK', logo_url: null },
  { slug: 'stray-kids', name: 'Stray Kids', display_color: '#111111', text_color: '#ffffff', fandom_name: 'STAY', logo_url: null },
  { slug: 'an-unknown-group', name: 'An Unknown Group', display_color: '#0ea5e9', text_color: '#ffffff', fandom_name: 'FANS', logo_url: null },
];
const TYPES = ['multiple_choice', 'true_false', 'guess_from_clues', 'image', 'intruder'];
function quiz(i) {
  const g = GROUPS[i % GROUPS.length];
  return {
    id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`, title: `${g.name} quiz number ${i}`, slug: `${g.slug}-quiz-${i}`,
    quiz_type: TYPES[i % TYPES.length], difficulty: ['easy', 'medium', 'hard'][i % 3], language: 'en', play_count: 1000 - i * 7,
    total_score_sum: 400, total_completions: 40, like_count: 12, question_count: 10, created_at: new Date(now - i * 3600e3).toISOString(),
    cover_image_url: null, first_question: 'Which member debuted first?', group_id: GROUPS.indexOf(g) + 1, status: 'published', creator_id: 'u-1',
    groups: { name: g.name, slug: g.slug, display_color: g.display_color, text_color: g.text_color, fandom_name: g.fandom_name, logo_url: g.logo_url },
    profiles: { username: 'fan', avatar_url: null, avatar_bg: '#222222', avatar_text: '#ffffff', xp: 10 },
  };
}
const QUIZZES = Array.from({ length: 24 }, (_, i) => quiz(i + 1));
function groupRow(g) {
  return { id: GROUPS.findIndex((x) => x.slug === g.slug) + 1, name: g.name, slug: g.slug, display_color: g.display_color, text_color: g.text_color, fandom_name: g.fandom_name, logo_url: g.logo_url,
    quiz_count: 24, total_plays: 5000, is_custom: false, needs_review: false, created_by_user: false, generation: '4th Gen', member_count: 7, debut_year: 2013, company: 'HYBE', description: `${g.name} is a group.`, seo_intro: null, is_active: true, created_at: '2020-01-01T00:00:00Z', site: 'kpop', genre: 'kpop' };
}
const SONGS = GROUPS.flatMap((g, gi) => Array.from({ length: 12 }, (_, k) => ({ id: gi * 100 + k, group_id: gi + 1, title: `${g.name} song ${k}`, status: 'active' })));
const seen = new Map();
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const m = /^\/rest\/v1\/([^/]+)/.exec(u.pathname);
  const table = m ? m[1] : u.pathname;
  seen.set(table, (seen.get(table) || 0) + 1);
  const single = /pgrst\.object/.test(req.headers.accept || '');
  const head = req.method === 'HEAD';
  const eqSlug = u.searchParams.get('slug');
  let rows = [];
  if (table === 'quizzes') rows = QUIZZES;
  else if (table === 'songs') rows = SONGS;
  else if (table === 'groups') rows = (eqSlug ? GROUPS.filter((g) => 'eq.' + g.slug === eqSlug) : GROUPS).map(groupRow);
  const range = /^(\d+)-(\d+)$/.exec(req.headers.range || '');
  const sliced = range ? rows.slice(Number(range[1]), Number(range[2]) + 1) : rows;
  const out = { 'content-type': 'application/json', 'content-range': `0-${Math.max(0, sliced.length - 1)}/${rows.length}` };
  if (single) {
    if (sliced.length !== 1) { res.writeHead(406, out); res.end(JSON.stringify({ code: 'PGRST116', details: 'The result contains 0 rows', hint: null, message: 'JSON object requested, multiple (or no) rows returned' })); return; }
    res.writeHead(200, out); res.end(JSON.stringify(sliced[0])); return;
  }
  res.writeHead(200, out); res.end(head ? '' : JSON.stringify(sliced));
}).listen(PORT, '127.0.0.1', () => console.log('fake supabase on ' + PORT));
process.on('SIGTERM', () => { console.log('tables', JSON.stringify([...seen])); process.exit(0); });
