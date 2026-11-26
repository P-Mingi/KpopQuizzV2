// Otakudle in two steps (lane OTK-E, owner request of 2026-11-26): a local stand-in for the Supabase REST endpoint, for the screenshots only. dle_day, dle_pool, dle_guess and dle_give_up of
// Otakudle with a small fixture pool shaped like the real play state of L42 (step fields, step2 cells, step2_columns). Every other call answers an empty list. The target is Kakashi Hatake.
//   STUB_PORT=4599 node e2e/o1/L1/otk2-stub.mjs
import http from 'node:http';

const PORT = Number(process.env.STUB_PORT || 4599);
const PLAYERS = Number(process.env.STUB_PLAYERS || 37);
const today = new Date().toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

const NARUTO = { genres: ['Action', 'Adventure'], year: 1999, studio: ['Pierrot'] };
const E = (id, name, series, w, s2) => ({
  id, name, thumb: null, search: [name.toLowerCase()], s2,
  attrs: { series: { v: series }, genres: { v: w.genres }, year: { v: w.year }, studio: { v: w.studio } },
});
const BLEACH = { genres: ['Action', 'Supernatural'], year: 2001, studio: ['Pierrot'] };
const SPY = { genres: ['Action', 'Comedy'], year: 2019, studio: ['Wit Studio', 'CloverWorks'] };
const POOL = [
  E('naruto', 'Naruto Uzumaki', 'Naruto', NARUTO, { gender: 'male', village: 'Konoha', rank: [1, 'Academy student'], clans: ['Uzumaki'], arc: [1, 'Introduction'] }),
  E('sasuke', 'Sasuke Uchiha', 'Naruto', NARUTO, { gender: 'male', village: 'Konoha', rank: [1, 'Academy student'], clans: ['Uchiha'], arc: [1, 'Introduction'] }),
  E('sakura', 'Sakura Haruno', 'Naruto', NARUTO, { gender: 'female', village: 'Konoha', rank: [1, 'Academy student'], clans: ['None'], arc: [1, 'Introduction'] }),
  E('kakashi', 'Kakashi Hatake', 'Naruto', NARUTO, { gender: 'male', village: 'Konoha', rank: [3, 'Jonin'], clans: ['Hatake'], arc: [1, 'Introduction'] }),
  E('gaara', 'Gaara', 'Naruto', NARUTO, { gender: 'male', village: 'Suna', rank: [2, 'Genin'], clans: ['None'], arc: [4, 'Chunin Exams'] }),
  E('itachi', 'Itachi Uchiha', 'Naruto', NARUTO, { gender: 'male', village: 'Konoha', rank: [4, 'Missing-nin'], clans: ['Uchiha'], arc: [6, 'Retrieve Sasuke'] }),
  E('ichigo', 'Ichigo Kurosaki', 'Bleach', BLEACH, { gender: 'male' }),
  E('rukia', 'Rukia Kuchiki', 'Bleach', BLEACH, { gender: 'female' }),
  E('loid', 'Loid Forger', 'Spy x Family', SPY, { gender: 'male' }),
  E('anya', 'Anya Forger', 'Spy x Family', SPY, { gender: 'female' }),
  E('luffy', 'Monkey D. Luffy', 'One Piece', { genres: ['Action', 'Adventure', 'Fantasy'], year: 1997, studio: ['Toei Animation'] }, { gender: 'male' }),
  E('light', 'Light Yagami', 'Death Note', { genres: ['Mystery'], year: 2003, studio: ['Madhouse'] }, { gender: 'male' }),
  E('edward', 'Edward Elric', 'Fullmetal Alchemist', { genres: ['Action', 'Adventure', 'Fantasy'], year: 2001, studio: ['Bones'] }, { gender: 'male' }),
];
const ATTRS = [['series', 'single', null], ['genres', 'multi', null], ['year', 'number', 2], ['studio', 'multi', null]].map(([key, kind, near]) => ({ key, kind, near }));
const STEP2 = [
  { key: 'gender', kind: 'single' },
  { key: 'village', kind: 'single', label: { en: 'Village', fr: 'Village' }, help: { en: 'Home village at the first appearance', fr: 'Village d’origine à la première apparition' } },
  { key: 'rank', kind: 'ordinal', label: { en: 'Rank', fr: 'Rang' }, help: { en: 'Ninja rank at the first appearance, arrows', fr: 'Rang ninja à la première apparition, flèches' } },
  { key: 'clans', kind: 'multi', label: { en: 'Clan', fr: 'Clan' }, help: { en: 'Clan of the character', fr: 'Clan du personnage' } },
  { key: 'arc', kind: 'ordinal', label: { en: 'First arc', fr: 'Premier arc' }, help: { en: 'Arc of the first appearance, arrows', fr: 'Arc de la première apparition, flèches' } },
];
const TARGET = POOL.find((e) => e.id === (process.env.STUB_TARGET || 'kakashi'));
const plays = new Map();

const arr = (v) => (Array.isArray(v) ? v : [v]);
function compare(kind, near, a, b) {
  if (kind === 'number' || kind === 'ordinal') {
    if (a === b) return { status: 'correct', arrow: null };
    return { status: kind === 'number' && Math.abs(a - b) <= near ? 'near' : 'wrong', arrow: b > a ? 'up' : 'down' };
  }
  const x = arr(a), y = arr(b);
  if (x.length === y.length && x.every((i) => y.includes(i))) return { status: 'correct', arrow: null };
  return { status: x.some((i) => y.includes(i)) && kind === 'multi' ? 'near' : 'wrong', arrow: null };
}
const raw = (e, key) => { const v = e.s2[key]; return Array.isArray(v) && typeof v[0] === 'number' ? v[0] : v; };
const value = (e, key) => { const v = e.s2[key]; return Array.isArray(v) && typeof v[0] === 'number' ? { v: v[0], l: v[1] } : { v }; };
function state(p) {
  const over = p.status !== 'playing';
  const errors = p.guesses.length - (p.status === 'won' ? 1 : 0);
  const sameSeries = (id) => POOL.find((e) => e.id === id).attrs.series.v === TARGET.attrs.series.v;
  const guesses = p.guesses.map((id) => {
    const g = POOL.find((e) => e.id === id);
    const out = { id, result: ATTRS.map((a) => ({ key: a.key, ...compare(a.kind, a.near, g.attrs[a.key].v, TARGET.attrs[a.key].v) })) };
    if (sameSeries(id)) out.step2 = STEP2.map((c) => ({ key: c.key, ...compare(c.kind, null, raw(g, c.key === 'arc' || c.key === 'rank' ? c.key : c.key), raw(TARGET, c.key)), value: value(g, c.key) }));
    return out;
  });
  const first = p.guesses.findIndex(sameSeries) + 1;
  const base = {
    date: today, game_no: 19, status: p.status, guesses, hints: errors >= 5 ? [{ key: 'voice_actor_ja', value: 'Kazuhiko Inoue' }] : [],
    target: over ? { id: TARGET.id, name: TARGET.name, attrs: TARGET.attrs, thumb: null } : null, stats: null, solve_rank: p.rank ?? null, players_today: PLAYERS,
  };
  if (!first) return { ...base, step: 1 };
  return {
    ...base, step: 2, series: 'naruto', series_label: 'Naruto', step1_guesses: first, step2_guesses: p.guesses.filter(sameSeries).length,
    step2_total: POOL.filter((e) => e.attrs.series.v === 'Naruto').length, step2_columns: STEP2,
  };
}
const send = (res, code, body) => {
  res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' });
  res.end(JSON.stringify(body));
};
http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    const url = new URL(req.url, 'http://x');
    const m = /\/rest\/v1\/rpc\/(\w+)/.exec(url.pathname);
    if (!m) return send(res, 200, url.pathname.includes('/auth/') ? {} : []);
    const a = body ? JSON.parse(body) : {};
    const key = a.p_token ?? 'anon';
    if (m[1] === 'dle_pool') return send(res, 200, { game: 'otakudle', universe: 'anime', attributes: ATTRS, entities: POOL.map(({ id, name, search, attrs, thumb }) => ({ id, name, search, attrs, thumb })) });
    if (m[1] === 'dle_day') {
      const p = plays.get(key);
      return send(res, 200, {
        game: 'otakudle', now: new Date().toISOString(), date: today, game_no: 19, seconds_left: 39000,
        yesterday: { date: yesterday, game_no: 18, answer: { id: 'luffy', name: 'Monkey D. Luffy', attrs: POOL[10].attrs, thumb: null } },
        stats: null, players_today: PLAYERS, play: p ? state(p) : null,
      });
    }
    if (m[1] === 'dle_guess') {
      const p = plays.get(key) ?? { guesses: [], status: 'playing', rank: null };
      if (p.status === 'playing' && !p.guesses.includes(a.p_entity)) {
        p.guesses.push(a.p_entity);
        if (a.p_entity === TARGET.id) { p.status = 'won'; p.rank = 5; }
      }
      plays.set(key, p);
      return send(res, 200, state(p));
    }
    if (m[1] === 'dle_give_up') { const p = plays.get(key); p.status = 'given_up'; return send(res, 200, state(p)); }
    return send(res, 200, null);
  });
}).listen(PORT, '127.0.0.1', () => console.log('stub on', PORT));
