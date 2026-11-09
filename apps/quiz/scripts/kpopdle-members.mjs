// Audit 05 Part C4 (rule R9): pool idols that English Wikipedia no longer lists as current members. Read only: it reads a file and Wikipedia, writes nothing, never touches a database.
//   psql -At -f docs/launch/o1/checks/V-kpopdle-members.sql | grep '^{"group"' > pool.jsonl      (the owner or ORCH runs it read-only)
//   node apps/quiz/scripts/kpopdle-members.mjs pool.jsonl [titles.json]
// titles.json: optional {"<group name>": "<Wikipedia page title>"} for the groups whose page is not the group name (for example "Girls' Generation" works as is, "TXT" needs "Tomorrow X Together").
// One request at a time, generic User-Agent, 2 s between requests, a pause that doubles on HTTP 429 (up to 5 tries). Prints "former | group | idol id | name" and "unlisted | ...".
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const UA = 'Mozilla/5.0 (compatible; kpq-members-check/1.0)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The text between the start of `param` in the infobox and the next infobox parameter. */
export function infoboxParam(wikitext, param) {
  const m = new RegExp(`\\n\\|\\s*${param}\\s*=([\\s\\S]*?)(?=\\n\\|\\s*[a-z_0-9]+\\s*=|\\n\\}\\})`, 'i').exec(wikitext);
  return m ? m[1] : '';
}

/** The text of every section whose heading matches `pattern`, up to the next heading of the same or a higher level (`ownOnly`: up to the next heading of any level). */
export function sectionList(wikitext, pattern, ownOnly = false) {
  const out = [];
  const re = /^(={2,6})\s*([^=\n]+?)\s*\1\s*$/gm;
  const heads = [...wikitext.matchAll(re)].map((m) => ({ level: m[1].length, title: m[2], start: m.index, end: m.index + m[0].length }));
  heads.forEach((h, i) => {
    if (!pattern.test(h.title)) return;
    const next = ownOnly ? heads[i + 1] : heads.slice(i + 1).find((x) => x.level <= h.level);
    out.push(wikitext.slice(h.end, next ? next.start : wikitext.length));
  });
  return out;
}

export const formerSections = (wikitext) => sectionList(wikitext, /former|past members|departed|ex-members/i).join('\n');
/** The current-members sections: "Current" / "Current members"; only when a page has none, the own text of its "Members" section (prose there may name people who left). */
export const currentSections = (wikitext) => {
  const own = sectionList(wikitext, /^(current|present)( members)?$/i);
  return (own.length ? own : sectionList(wikitext, /^members$/i, true)).join('\n');
};

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const mentions = (text, name) => !!name && new RegExp(`(^|[^A-Za-z0-9])${esc(name)}([^A-Za-z0-9]|$)`, 'i').test(text);

/** 'current' when the infobox current_members names the idol, 'former' when only a former-members place does, 'unlisted' when neither. */
export function classify(wikitext, idol) {
  const names = [idol.name, idol.romanized].filter(Boolean);
  const current = infoboxParam(wikitext, 'current_members') + '\n' + currentSections(wikitext);
  if (names.some((n) => mentions(current, n))) return 'current';
  const former = infoboxParam(wikitext, 'past_members') + '\n' + formerSections(wikitext);
  return names.some((n) => mentions(former, n)) ? 'former' : 'unlisted';
}

async function fetchWikitext(title) {
  let wait = 4000;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(`https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(title)}&action=raw`, { headers: { 'User-Agent': UA }, redirect: 'follow' });
    if (res.status === 429) { await sleep(wait); wait *= 2; continue; }
    if (!res.ok) return null;
    return await res.text();
  }
  return null;
}

async function main(argv) {
  const [poolFile, titlesFile] = argv;
  if (!poolFile) { console.error('usage: node kpopdle-members.mjs pool.jsonl [titles.json]'); process.exit(2); }
  const titles = titlesFile ? JSON.parse(readFileSync(titlesFile, 'utf8')) : {};
  const groups = readFileSync(poolFile, 'utf8').split('\n').filter((l) => l.startsWith('{')).map((l) => JSON.parse(l));
  for (const g of groups) {
    const title = (titles[g.group] ?? g.group).replace(/ /g, '_');
    const text = await fetchWikitext(title);
    await sleep(2000);
    if (!text) { console.log(`no page | ${g.group} | - | ${title}`); continue; }
    if (/^#REDIRECT/i.test(text.trim())) { console.log(`redirect, give a title | ${g.group} | - | ${title}`); continue; }
    for (const idol of g.idols) {
      const c = classify(text, idol);
      if (c !== 'current') console.log(`${c} | ${g.group} | ${idol.id} | ${idol.name}`);
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main(process.argv.slice(2));
