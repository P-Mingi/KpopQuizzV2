// Lot K2: parsing of English Wikipedia wikitext (group member lists, person pages). Pure functions, no network.
import { norm } from './lib.mjs';

const MONTHS = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };

export function stripNoise(t) {
  return String(t ?? '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<ref[^>]*\/>/gi, '')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '')
    .replace(/\{\{\s*(?:efn|nowrap|sfn|citation needed|cn)\b[^{}]*(?:\{\{[^{}]*\}\}[^{}]*)*\}\}/gi, (m) => (/^\{\{\s*nowrap/i.test(m) ? m.replace(/^\{\{\s*nowrap\s*\|/i, '').replace(/\}\}$/, '') : ''));
}

// Field of the infobox, up to the next "| name =" parameter or the closing braces.
export function infoboxField(wikitext, key) {
  const re = new RegExp(`\\n\\s*\\|\\s*${key}\\s*=([\\s\\S]*?)(?=\\n\\s*\\|\\s*[a-z_0-9]+\\s*=|\\n\\}\\}|\\n\\{\\{[^{}]*\\}\\}\\s*\\n'''|$)`, 'i');
  const m = wikitext.match(re);
  return m ? m[1] : null;
}

const HANGUL = /[가-힯]+(?:\s[가-힯]+)*/;

// One entry of a member list: { display, target, hangul, text }
function entryFromLine(line) {
  const l0 = line.replace(/^[\s*#:;]+/, '').trim();
  if (!l0) return null;
  const hangul = (l0.match(HANGUL) || [null])[0];
  const natives = [...new Set((l0.match(/[\uac00-\ud7af\u3040-\u30ff\u4e00-\u9fff]+/g) || []))];
  let display = null, target = null;
  const lm = l0.match(/^\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]/);
  if (lm) { target = lm[1].trim().replace(/_/g, ' '); display = (lm[2] ?? lm[1]).trim(); }
  else {
    display = l0.split(/\s*[({<\u2013\u2014]|\s+-\s+|,\s|\s*\{\{/)[0].replace(/'''?/g, '').trim();
  }
  display = display.replace(/\s*\(.*$/, '').trim();
  if (!display || /^(current|former|past|members?)$/i.test(display)) return null;
  return { display, target, hangul, natives, text: l0 };
}

// Turn a list field (bullets, {{hlist}}, {{plainlist}}, {{unbulleted list}}) into lines.
function fieldLines(field) {
  let t = stripNoise(field);
  t = t.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '[[$1\u0001$2]]');
  t = t.replace(/\{\{\s*(?:hlist|flatlist|plainlist|unbulleted list|ubl|bulleted list|ublist)\s*\|?/gi, '\n').replace(/\}\}/g, '\n');
  t = t.replace(/\|/g, '\n');
  t = t.replace(/\u0001/g, '|');
  return t.split('\n').map((s) => s.replace(/^\s*\*+\s*/, '').trim()).filter(Boolean);
}

export function rosterFromInfobox(wikitext) {
  const out = { current: [], past: [] };
  for (const [key, bucket] of [['current_members', 'current'], ['members', 'current'], ['past_members', 'past'], ['former_members', 'past']]) {
    const f = infoboxField(wikitext, key);
    if (!f) continue;
    for (const line of fieldLines(f)) {
      const e = entryFromLine(line);
      if (e && !out[bucket].some((x) => norm(x.display) === norm(e.display))) out[bucket].push(e);
    }
  }
  return out;
}

// The "Members" section: bullets and wikitables, with the sub-heading (Current / Former) the entry sits under.
export function sectionEntries(wikitext) {
  const m = wikitext.match(/\n==\s*(?:Members|Current members|Line-?up)[^=\n]*==\s*\n([\s\S]*?)(?=\n==[^=]|$)/i);
  if (!m) return [];
  const body = stripNoise(m[1]);
  const out = [];
  let status = 'current';
  // wikitable rows
  if (/\{\|/.test(body)) {
    const rows = body.split(/\n\|-/).slice(1);
    for (const row of rows) {
      const cells = row.split(/\n[|!]/).map((c) => c.replace(/^[^|]*\|(?!\|)/, (x) => (x.includes('=') ? '' : x)).trim()).filter((c) => c !== '');
      if (!cells.length) continue;
      const first = cells[0].replace(/^scope="row"\s*\|\s*/, '').replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, '$1').trim();
      if (!first || /^(name|latin|hangul)$/i.test(first)) continue;
      out.push({ display: first.replace(/\s*\(.*$/, ''), target: (cells[0].match(/\[\[([^\]|#]+)/) || [null, null])[1], hangul: (row.match(HANGUL) || [null])[0], text: row.replace(/\n/g, ' '), status, table: true });
    }
  }
  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim();
    const h = line.match(/^(?:={2,}\s*(.+?)\s*={2,}|;\s*(.+))$/);
    if (h) { const w = (h[1] ?? h[2]).toLowerCase(); if (/former|past|ex-/.test(w)) status = 'past'; else if (/current|active|member/.test(w)) status = 'current'; continue; }
    if (!/^\*/.test(line)) continue;
    const e = entryFromLine(line);
    if (e) out.push({ ...e, status });
  }
  return out;
}

// "leader" in the text that follows a member's name, not "sub-leader", "co-leader", "deputy leader", "former leader" or "performance leader".
export function isLeaderText(text) {
  const t = String(text ?? '').replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, '$1').replace(/\{\{[^{}]*\}\}/g, ' ');
  for (const m of t.matchAll(/(?:(\b[\w]+)[\s-])?leader\b/gi)) {
    const prev = (m[1] || '').toLowerCase();
    if (/^(sub|co|deputy|former|performance|vocal|dance|rap|team)$/.test(prev)) continue;
    return true;
  }
  return false;
}

// Birth date from a person's wikitext: {{birth date and age|1996|1|1}} and its variants.
export function birthFromWikitext(wikitext) {
  const m = wikitext.match(/\{\{\s*(?:birth[ _]date(?:[ _]and[ _]age2?)?|bda|b-da)\s*\|([^}]*)\}\}/i);
  if (!m) return null;
  const nums = m[1].split('|').map((x) => x.trim()).filter((x) => /^\d{1,4}$/.test(x)).map(Number);
  if (nums.length < 3) return null;
  const [y, mo, d] = nums;
  if (y < 1900 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
// "January 21, 2006" or "21 January 2006" (wikitable cell or plain text)
export function birthFromText(text) {
  let m = String(text).match(/\b([A-Z][a-z]+)\s+(\d{1,2}),\s+(\d{4})\b/);
  if (m && MONTHS[m[1].toLowerCase()]) return `${m[3]}-${String(MONTHS[m[1].toLowerCase()]).padStart(2, '0')}-${String(m[2]).padStart(2, '0')}`;
  m = String(text).match(/\b(\d{1,2})\s+([A-Z][a-z]+)\s+(\d{4})\b/);
  if (m && MONTHS[m[2].toLowerCase()]) return `${m[3]}-${String(MONTHS[m[2].toLowerCase()]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  return null;
}

// Gender from the plain intro: pronoun counts. Returns 'female', 'male' or null when unclear.
export function genderFromIntro(intro) {
  const t = ` ${String(intro ?? '').slice(0, 1800).toLowerCase()} `;
  const f = (t.match(/\b(she|her|hers|herself)\b/g) || []).length;
  const m = (t.match(/\b(he|his|him|himself)\b/g) || []).length;
  if (f >= 2 && m === 0) return 'female';
  if (m >= 2 && f === 0) return 'male';
  if (f >= 3 && f >= 3 * m) return 'female';
  if (m >= 3 && m >= 3 * f) return 'male';
  return null;
}

// Nationality words of the opening sentence ("is a South Korean singer", "Japanese-American").
const DEMONYMS = [
  ['South Korean', 'South Korea'], ['Korean', 'South Korea'], ['Japanese', 'Japan'], ['Chinese', 'China'], ['Taiwanese', 'Taiwan'], ['Thai', 'Thailand'],
  ['American', 'United States'], ['Australian', 'Australia'], ['Canadian', 'Canada'], ['Hong Kong', 'Hong Kong'], ['Filipino', 'Philippines'],
  ['Indonesian', 'Indonesia'], ['Vietnamese', 'Vietnam'], ['Malaysian', 'Malaysia'], ['Singaporean', 'Singapore'], ['British', 'United Kingdom'],
  ['English', 'United Kingdom'], ['German', 'Germany'], ['French', 'France'], ['New Zealand', 'New Zealand'], ['Brazilian', 'Brazil'], ['Mongolian', 'Mongolia'],
  ['Russian', 'Russia'], ['Indian', 'India'], ['Cambodian', 'Cambodia'], ['Chilean', 'Chile'], ['Mexican', 'Mexico'], ['Swiss', 'Switzerland'], ['Dutch', 'Netherlands'],
];
export function nationalityFromIntro(intro) {
  const first = String(intro ?? '').split(/(?<=[.!?])\s/)[0].slice(0, 400);
  const out = new Set();
  for (const [word, country] of DEMONYMS) {
    if (new RegExp(`\\b${word}\\b`).test(first)) {
      if (word === 'Korean' && /South Korean|North Korean/.test(first)) continue;
      out.add(country);
    }
  }
  return [...out];
}

export const CODE_TO_COUNTRY = { KR: 'South Korea', JP: 'Japan', CN: 'China', TW: 'Taiwan', TH: 'Thailand', US: 'United States', AU: 'Australia', CA: 'Canada', HK: 'Hong Kong',
  PH: 'Philippines', ID: 'Indonesia', VN: 'Vietnam', MY: 'Malaysia', SG: 'Singapore', GB: 'United Kingdom', DE: 'Germany', FR: 'France', NZ: 'New Zealand', BR: 'Brazil', MN: 'Mongolia',
  RU: 'Russia', IN: 'India', KH: 'Cambodia', CL: 'Chile', MX: 'Mexico', CH: 'Switzerland', NL: 'Netherlands' };
// Wikidata country labels as the site writes them.
export function countryName(label) {
  const map = { "People's Republic of China": 'China', 'United States of America': 'United States', 'Republic of China': 'Taiwan', 'Kingdom of Thailand': 'Thailand', 'Korea': 'South Korea', 'Republic of Korea': 'South Korea' };
  return map[label] ?? label;
}
