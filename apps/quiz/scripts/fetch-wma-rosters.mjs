// SEO Mission 2, part D: the sourced line-ups of the Which member are you pages.
//
// Read only. Nothing here writes to the database: two SELECTs with the anon key (the
// groups of the pages with their Wikidata ID, and the quiz profiles), then public reads
// of Wikidata and Wikipedia. Output: src/lib/personality/rosters.json, versioned, read
// by src/lib/personality/rosters.ts.
//
// The rule (docs/seo/KPOP-SOURCES.md, golden rule): a member is listed only when two
// sources agree, Wikidata (P527 "has part", no end time) and the Members section of the
// group's English Wikipedia article. A member both sources list as former is recorded as
// former. The count is printed on a page only when both current lists are the same and
// no line carries a Wikipedia note. Roles (leader, vocalist, rapper, dancer) come from the
// same Wikipedia lines, which cite their own sources; a member without one gets none.
// Birth dates are read only to flag a group with a member under 18; none is stored.
//
// The Wikidata ID is the groups.wikidata_qid column, checked here against the enwiki
// sitelink of that item and against the Wikipedia article's own wikibase_item, so no
// QID is typed by hand.
//
// Run from apps/quiz: node scripts/fetch-wma-rosters.mjs [--dry]

import fs from 'node:fs';

import { createClient } from '@supabase/supabase-js';

const DRY = process.argv.includes('--dry');
const OUT = new URL('../src/lib/personality/rosters.json', import.meta.url);
const UA = { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' };
const today = new Date().toISOString().slice(0, 10);

const env = Object.fromEntries(
  fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').filter((l) => l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Polite, throttled JSON reads with a generic User-Agent (Wikimedia throttles bursts). */
async function getJson(url) {
  for (let i = 0; i < 8; i += 1) {
    await sleep(3000 + i * 4000);
    const res = await fetch(url, { headers: UA });
    const text = await res.text();
    try { return JSON.parse(text); } catch { console.error(`  retry ${i + 1}: ${res.status}`); }
  }
  throw new Error(`could not read ${url}`);
}

/** Lowercase letters and digits only, accents dropped: "Jung Kook" = "Jungkook", "Rosé" = "Rose". */
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

// ---- the pages: groups with an active profile set -------------------------------------
const { data: profRows, error: pErr } = await db.from('personality_profiles').select('member_slug, member_name, ord, groups!inner(slug, name, wikidata_qid)').eq('active', true).order('ord');
if (pErr) throw new Error(pErr.message);
const pages = new Map();
for (const r of profRows) {
  const g = Array.isArray(r.groups) ? r.groups[0] : r.groups;
  if (!g || g.slug === 'general-kpop') continue;
  if (!pages.has(g.slug)) pages.set(g.slug, { slug: g.slug, name: g.name, qid: g.wikidata_qid, profiles: [] });
  pages.get(g.slug).profiles.push({ slug: r.member_slug, name: r.member_name });
}

// ---- Wikipedia: the Members section ---------------------------------------------------
function membersSection(wikitext) {
  const lines = wikitext.split('\n');
  const start = lines.findIndex((l) => /^==\s*Members\s*==\s*$/i.test(l.trim()));
  if (start < 0) return null;
  const end = lines.findIndex((l, i) => i > start && /^==[^=].*[^=]==\s*$/.test(l.trim()));
  return lines.slice(start + 1, end < 0 ? undefined : end).join('\n');
}

function stripRefs(t) {
  return t.replace(/<!--[\s\S]*?-->/g, '').replace(/<ref[^>]*\/>/g, '').replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '');
}

/** One member line: "* [[Target|Name]] (...) <en dash> role, role". */
function parseLine(raw, state) {
  const uncertain = /\{\{\s*efn/i.test(raw);
  let t = raw.replace(/\{\{\s*efn[\s\S]*?\}\}/gi, '').replace(/^\*\s*/, '').trim();
  let target = null;
  let name = null;
  const link = /^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/.exec(t);
  if (link) { target = link[1].trim().replace(/_/g, ' '); name = (link[2] ?? link[1]).trim(); t = t.slice(link[0].length); }
  else { const m = /^([^({[\u2013]+)/.exec(t); name = m ? m[1].trim() : null; t = m ? t.slice(m[0].length) : t; }
  if (!name) return null;
  name = name.replace(/\s*\(.*\)$/, '').trim();
  // A year range on the line ("(2017 to 2019)" written with an en dash, or "(2022)") marks a former member.
  const ranged = /\((?:[^()]*;\s*)?\d{4}(?:\s*[\u2013-]\s*\d{4})?\)/.test(t.replace(/\{\{[^}]*\}\}/g, ''));
  const dash = t.split(/\{\{\s*spaced en dash\s*\}\}|\s\u2013\s|^\s*\u2013\s|\)\s*\u2013\s?/);
  let role = dash.length > 1 ? dash[dash.length - 1] : '';
  role = role.replace(/\{\{[^}]*\}\}/g, '').replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, '$1').replace(/\(\d{4}[^)]*\)/g, '').replace(/[()]/g, '').replace(/\s+/g, ' ').trim().replace(/[.,;]$/, '');
  const former = state.former || ranged;
  return { name, target, role: role || null, uncertain, former, team: state.team };
}

function parseMembers(section) {
  const out = [];
  const state = { former: false, team: null };
  for (const raw0 of stripRefs(section).split('\n')) {
    const raw = raw0.trim();
    if (/^===\s*Timeline|^===\s*Sub-?unit/i.test(raw)) break;
    const head = /^===\s*([^=]+?)\s*===$/.exec(raw) ?? /^;\s*(.+)$/.exec(raw);
    if (head) {
      const h = head[1].trim();
      if (/^former/i.test(h)) state.former = true;
      else if (/^current/i.test(h)) state.former = false;
      else if (/team$/i.test(h)) { state.team = h; state.former = false; }
      // "Active members" / "Inactive members" under a team: still members.
      continue;
    }
    if (raw.startsWith('*')) {
      const m = parseLine(raw, state);
      if (m) out.push(m);
    }
  }
  return out;
}

// ---- Wikidata -------------------------------------------------------------------------
async function entity(qid) {
  const j = await getJson(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`);
  return j.entities[qid] ?? Object.values(j.entities)[0];
}

async function people(ids) {
  const out = {};
  for (let i = 0; i < ids.length; i += 40) {
    const chunk = ids.slice(i, i + 40);
    const j = await getJson(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${chunk.join('|')}&props=labels|aliases|claims|sitelinks&sitefilter=enwiki&languages=en|mul&format=json`);
    for (const [id, e] of Object.entries(j.entities)) {
      const claim = (p) => (e.claims?.[p] ?? []).map((c) => c.mainsnak.datavalue?.value);
      out[id] = {
        human: claim('P31').some((v) => v?.id === 'Q5'),
        enwiki: e.sitelinks?.enwiki?.title ?? null,
        names: [e.labels?.en?.value, e.labels?.mul?.value, ...(e.aliases?.en ?? []).map((a) => a.value), ...claim('P742'), ...claim('P1449').map((v) => v?.text)].filter(Boolean),
        born: claim('P569').map((v) => v?.time).filter(Boolean)[0] ?? null,
      };
    }
  }
  return out;
}

function isMinorOn(born, day) {
  if (!born) return true; // unknown: treated as a minor (fail closed)
  const m = /^\+?(\d{4})-(\d{2})-(\d{2})/.exec(born);
  if (!m || m[2] === '00' || m[3] === '00') return true;
  const adult = `${Number(m[1]) + 18}-${m[2]}-${m[3]}`;
  return day < adult;
}

async function liveUrl(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'follow', signal: AbortSignal.timeout(15000) });
    return res.status < 400;
  } catch { return false; }
}

// ---- build ----------------------------------------------------------------------------
const result = {
  _about: 'Sourced line-ups of the Which member are you pages. Generated by scripts/fetch-wma-rosters.mjs (read only). A member is listed when Wikidata and Wikipedia both list them as current. Do not edit by hand: rerun the script.',
  checkedOn: today,
  groups: {},
};
const report = [];

for (const page of [...pages.values()].sort((a, b) => a.slug.localeCompare(b.slug))) {
  if (!page.qid) { report.push(`${page.slug}: no wikidata_qid, skipped`); continue; }
  const g = await entity(page.qid);
  const title = g.sitelinks?.enwiki?.title;
  if (!title) { report.push(`${page.slug}: no enwiki sitelink, skipped`); continue; }
  const wp = await getJson(`https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=wikitext|revid|properties&format=json&redirects=1`);
  const wpQid = (wp.parse?.properties ?? []).find((p) => p.name === 'wikibase_item')?.['*'];
  if (wpQid !== g.id) { report.push(`${page.slug}: Wikipedia item ${wpQid} differs from ${g.id}, skipped`); continue; }
  const section = membersSection(wp.parse.wikitext['*']);
  if (!section) { report.push(`${page.slug}: no Members section, skipped`); continue; }
  const wpMembers = parseMembers(section);

  const parts = (g.claims.P527 ?? []).map((c) => ({ id: c.mainsnak.datavalue?.value?.id, ended: Boolean(c.qualifiers?.P582) })).filter((p) => p.id);
  const who = await people(parts.map((p) => p.id));
  const wdCurrent = parts.filter((p) => !p.ended && who[p.id]?.human);
  const wdFormer = parts.filter((p) => p.ended && who[p.id]?.human);

  // Strongest evidence first, and an item is never matched twice: the enwiki article the
  // line links to, then an exact name or alias, then one whole word of a name ("Jake" in
  // "Jake Sim", never "san" inside "Kang Yeo-sang").
  const taken = new Set();
  const words = (x) => String(x).split(/\s+/).map(norm).filter(Boolean);
  const matchWd = (m, pool) => {
    const free = pool.filter((p) => !taken.has(p.id));
    const n = norm(m.name);
    const hit = free.find((p) => m.target && who[p.id].enwiki && norm(who[p.id].enwiki) === norm(m.target))
      ?? free.find((p) => who[p.id].names.some((x) => norm(x) === n))
      ?? free.find((p) => who[p.id].names.some((x) => words(x).includes(n)))
      ?? null;
    if (hit) taken.add(hit.id);
    return hit;
  };
  // A profile matches a Wikipedia line by name, or by the end of a full-name title
  // ("Yujin" for [[An Yu-jin]], "Chaewon" for [[Kim Chaewon]]).
  const sameName = (x, y) => { const a = norm(x); const b = norm(y); return a === b || (a.length >= 4 && b.endsWith(a)); };
  const matchProfile = (m) => page.profiles.find((p) => [p.name, p.slug].some((x) => sameName(x, m.name) || (m.target && sameName(x, m.target.replace(/\s*\(.*\)$/, ''))))) ?? null;

  const members = [];
  const former = [];
  for (const m of wpMembers) {
    const wd = matchWd(m, m.former ? wdFormer : wdCurrent);
    if (!wd) { report.push(`${page.slug}: ${m.name} (${m.former ? 'former' : 'current'} on Wikipedia) not confirmed by Wikidata, left out`); continue; }
    const prof = matchProfile(m);
    // Shown under the quiz's own spelling of the stage name, so the page says one name per member.
    const row = { profile: prof?.slug ?? null, name: prof?.name ?? m.name, wikipediaName: m.name, wikidata: wd.id };
    if (m.former) { former.push(row); continue; }
    members.push({ ...row, role: m.role ? m.role[0].toUpperCase() + m.role.slice(1) : null, team: m.team, ...(m.uncertain ? { note: true } : {}) });
  }
  const confirmedIds = new Set(members.map((m) => m.wikidata));
  const wdOnly = wdCurrent.filter((p) => !confirmedIds.has(p.id));
  for (const p of wdOnly) report.push(`${page.slug}: ${who[p.id].names[0] ?? p.id} is current on Wikidata only, left out`);
  const countAgreed = wdOnly.length === 0 && members.length === wpMembers.filter((m) => !m.former).length && !members.some((m) => m.note);
  const minors = members.some((m) => isMinorOn(who[m.wikidata].born, today));
  const unmatched = page.profiles.filter((p) => !members.some((m) => m.profile === p.slug) && !former.some((m) => m.profile === p.slug)).map((p) => p.slug);
  for (const s of unmatched) report.push(`${page.slug}: profile ${s} matches no sourced member`);

  const sites = (g.claims.P856 ?? []).map((c) => c.mainsnak.datavalue?.value).filter(Boolean);
  // The group's own site first, a regional (.jp) site last.
  const rank = (u) => (norm(u).includes(norm(page.slug)) ? 0 : 2) + (/\.jp(\/|$)/.test(new URL(u).hostname + '/') ? 1 : 0);
  const ordered = [...sites].sort((a, b) => rank(a) - rank(b));
  let official = null;
  for (const u of ordered) { if (await liveUrl(u)) { official = u; break; } }

  result.groups[page.slug] = {
    wikidata: g.id,
    wikipedia: { title: wp.parse.title, revid: wp.parse.revid },
    official,
    countAgreed,
    minors,
    members,
    former,
  };
  report.push(`${page.slug}: ${members.length} members${countAgreed ? ' (count agreed)' : ''}, ${former.length} former matched, minors ${minors}, official ${official ?? 'none live'}`);
}

console.log(report.join('\n'));
if (!DRY) fs.writeFileSync(OUT, `${JSON.stringify(result, null, 2)}\n`);
console.log(DRY ? 'dry run, nothing written' : `wrote ${OUT.pathname}`);
