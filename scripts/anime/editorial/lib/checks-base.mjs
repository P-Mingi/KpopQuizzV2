// Run O1, lane E1a: shared helpers of the checks (results, questions, cited facts, evidence words).

import { CODES } from './thresholds.mjs';
import { contentWords, words } from './text.mjs';
import { normalizeFactsFile } from './load.mjs';

export const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

/** One check on one item: failures (the check fails) and warnings (it passes, the reviewer should look). */
export class Result {
  constructor(code) { this.code = code; this.name = CODES[code]; this.fails = []; this.warns = []; this.na = false; }
  fail(path, message) { push(this.fails, finding(path, message)); return this; }
  warn(path, message) { push(this.warns, finding(path, message)); return this; }
  notApplicable() { this.na = true; return this; }
  toJSON() { return { code: this.code, name: this.name, pass: this.fails.length === 0, na: this.na, notes: this.fails, warnings: this.warns }; }
}

const push = (list, f) => { if (!list.some((x) => x.path === f.path && x.message === f.message)) list.push(f); };

/** A finding with the question number it concerns (1 based) or the fact number when the path says so. */
export function finding(path, message) {
  const f = { path, message };
  let m = /^\/questions\/([0-9]+)(?:\/|$)/.exec(path);
  if (m) f.q = Number(m[1]) + 1;
  m = /^\/facts\/([0-9]+)(?:\/|$)/.exec(path);
  if (m) f.fact = Number(m[1]) + 1;
  return f;
}

export const questionsOf = (item) => (Array.isArray(item.data?.questions) ? item.data.questions : []);

/** The shape of a question: tf, clues, intruder or mc. */
export function shapeOfQuestion(q) {
  if (!isObj(q)) return 'mc';
  if (typeof q.correct === 'boolean') return 'tf';
  if (Array.isArray(q.clues)) return 'clues';
  if (Array.isArray(q.options) && q.options.some((o) => isObj(o))) return 'intruder';
  return 'mc';
}

export const optionText = (o) => (isObj(o) ? o.label : o);
export function optionTexts(q) { return Array.isArray(q?.options) ? q.options.map(optionText) : []; }
export function correctText(q) {
  const opts = optionTexts(q);
  return Number.isInteger(q?.correct) && typeof opts[q.correct] === 'string' ? opts[q.correct] : null;
}

/** The text fields a visitor reads in a question, with their path. */
export function questionTexts(q, base) {
  const out = [];
  if (typeof q?.question === 'string') out.push({ path: `${base}/question`, text: q.question, role: 'question' });
  (Array.isArray(q?.clues) ? q.clues : []).forEach((c, i) => typeof c === 'string' && out.push({ path: `${base}/clues/${i}`, text: c, role: 'clue' }));
  optionTexts(q).forEach((o, i) => typeof o === 'string' && out.push({ path: `${base}/options/${i}`, text: o, role: 'option' }));
  if (typeof q?.fun_fact === 'string') out.push({ path: `${base}/fun_fact`, text: q.fun_fact, role: 'fun_fact' });
  return out;
}

/** Cited facts of a question: { found: [index entries], missing: [ids] }. */
export function citedFacts(q, ctx) {
  const found = []; const missing = [];
  for (const id of Array.isArray(q?.fact_ids) ? q.fact_ids : []) {
    const hits = ctx.factIndex.get(id);
    if (hits && hits.length > 0) found.push(hits[0]); else missing.push(id);
  }
  return { found, missing };
}

/** The names the series data gives to the entity of a fact (series, character, arc, theme). */
export function entityNames(fact, ctx) {
  const out = [];
  const e = fact?.entity;
  if (!isObj(e)) return out;
  const s = ctx.series.get(e.group_slug)?.data;
  if (s) {
    out.push(s.group?.name, s.series?.title_en, s.series?.title_romaji, ...(s.series?.aliases ?? []));
    if (e.kind === 'character') {
      const c = (s.characters ?? []).find((x) => x.slug === e.ref);
      if (c) out.push(c.name, c.name_native, ...(c.aliases ?? []));
    } else if (e.kind === 'arc') {
      const a = (s.arcs ?? []).find((x) => String(x.ord) === String(e.ref));
      if (a) out.push(a.name);
    } else if (e.kind === 'theme') {
      const m = /^(op|ed|insert)-([0-9]+)$/.exec(e.ref ?? '');
      const t = m && (s.themes ?? []).find((x) => x.kind === m[1] && String(x.number) === m[2]);
      if (t) out.push(t.title, t.artist);
    }
  }
  if (typeof e.ref === 'string' && e.kind === 'character') out.push(e.ref.replace(/-/g, ' '));
  if (typeof e.group_slug === 'string') out.push(e.group_slug.replace(/-/g, ' '));
  return out.filter((x) => typeof x === 'string');
}

const valueStrings = (v) => (typeof v === 'string' ? [v] : typeof v === 'number' ? [String(v)] : Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);

/** Every normalized word a cited fact offers as evidence. */
export function evidenceWords(entries, ctx) {
  const set = new Set();
  for (const { fact } of entries) {
    const parts = [...valueStrings(fact.value), fact.text, fact.field ? String(fact.field).replace(/_/g, ' ') : '', ...entityNames(fact, ctx)];
    for (const p of parts) for (const w of words(p ?? '')) set.add(w);
  }
  return set;
}

/** Words of an answer used for coverage: content words, or every word when it has none ("L", "No"). */
export function answerWords(text) {
  const c = contentWords(text);
  return c.length > 0 ? c : words(text);
}

/** The facts file of the series of an item, normalized, or null. */
export function factsOfSlug(slug, ctx) { return slug ? ctx.facts.get(slug) ?? null : null; }

/** All excerpts of the facts of one series, or of every series when slug is null or a mix. */
export function excerptsFor(slug, ctx) {
  const out = [];
  const pick = (entry) => { for (const x of entry.facts) for (const e of x.excerpts) out.push({ text: e, factId: x.fact?.id }); };
  if (slug && ctx.facts.has(slug)) pick(ctx.facts.get(slug));
  else for (const entry of ctx.facts.values()) pick(entry);
  return out;
}

export const isMixSlug = (slug) => slug === null || slug === undefined || slug === 'anime-mix';

/** Facts of a facts item, normalized: [{ fact, excerpts, aliases, index }]. */
export function factsOfItem(item) { return normalizeFactsFile(item.data, item.abs ?? item.file); }
