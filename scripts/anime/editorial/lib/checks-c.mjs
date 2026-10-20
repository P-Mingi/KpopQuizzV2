// Run O1, lane E1a: checks C7 (copy guard), C8 (lyrics and quotes) and C9 (dedupe against the corpus).

import { contentWords, longestRun, ngrams, normalize, quotedSegments, words } from './text.mjs';
import { Result, correctText, excerptsFor, factsOfItem, isMixSlug, isObj, questionTexts, questionsOf } from './checks-base.mjs';

const wordCache = new Map();
const cachedWords = (s) => { let w = wordCache.get(s); if (!w) { w = words(s); wordCache.set(s, w); } return w; };

/** The excerpts of one series (or of all when slug is null) with their n-grams, indexed by n-gram: built once per run. */
function excerptIndex(slug, ctx) {
  ctx._exIdx ??= new Map();
  const key = slug ?? '*';
  if (ctx._exIdx.has(key)) return ctx._exIdx.get(key);
  const list = excerptsFor(slug, ctx).map((e) => ({ ...e, words: cachedWords(e.text) }));
  const inv = new Map();
  list.forEach((e, i) => {
    for (const g of ngrams(e.words, ctx.thresholds.c7_ngram)) { let l = inv.get(g); if (!l) { l = []; inv.set(g, l); } l.push(i); }
  });
  const idx = { list, inv };
  ctx._exIdx.set(key, idx);
  return idx;
}

/** The first stored excerpt a text copies, or null: { factId, cont, run }. */
export function copiedFrom(text, idx, T) {
  const tw = cachedWords(text);
  if (tw.length < T.c7_min_words || idx.list.length === 0) return null;
  const grams = ngrams(tw, T.c7_ngram);
  const hits = new Map();
  for (const g of grams) for (const i of idx.inv.get(g) ?? []) hits.set(i, (hits.get(i) ?? 0) + 1);
  const needGrams = Math.min(T.c7_run_words - T.c7_ngram + 1, tw.length - T.c7_ngram + 1);
  let best = null;
  for (const [i, count] of [...hits].sort((x, y) => x[0] - y[0])) {
    const cont = count / grams.size;
    const ex = idx.list[i];
    let run = 0;
    if (count >= needGrams) run = longestRun(tw, ex.words);
    if (cont >= T.c7_containment || run >= T.c7_run_words || (run > 0 && run === tw.length)) {
      if (!best || cont > best.cont) best = { factId: ex.factId, cont, run: run || 0 };
    }
  }
  return best;
}

const describe = (h) => `copies the stored source text${h.factId ? ` of ${h.factId}` : ''} (${Math.round(h.cont * 100)}% of its word groups are found there, ${h.run} words in a row)`;

export function c7(item, ctx) {
  const r = new Result('C7');
  const T = ctx.thresholds;
  const run = (texts, idx, label) => {
    if (idx.list.length === 0) { r.warn('', `copy guard not run: no stored source text for ${label}`); return; }
    for (const { path, text } of texts) {
      const h = copiedFrom(text, idx, T);
      if (h) r.fail(path, describe(h));
    }
  };
  if (item.kind === 'series') {
    const slug = item.data?.group?.slug;
    const texts = (item.data?.characters ?? []).map((c, i) => ({ path: `/characters/${i}/description`, text: c?.description })).filter((t) => typeof t.text === 'string');
    run(texts, excerptIndex(slug ?? null, ctx), slug ?? 'the series');
    return r;
  }
  if (item.kind === 'facts') {
    const nf = factsOfItem(item);
    const all = excerptIndex(nf.slug, ctx);
    for (const x of nf.facts) {
      const f = x.fact;
      if (!isObj(f)) continue;
      const texts = [];
      if (typeof f.text === 'string') texts.push({ path: `/facts/${x.index}/text`, text: f.text });
      for (const v of Array.isArray(f.value) ? f.value : [f.value]) if (typeof v === 'string' && words(v).length >= T.c7_min_words) texts.push({ path: `/facts/${x.index}/value`, text: v });
      if (texts.length === 0) continue;
      if (all.list.length === 0 || (x.excerpts.length === 0 && typeof f.text === 'string')) {
        r.fail(`/facts/${x.index}`, `${f.id}: no stored source excerpt, so the copy guard cannot check ${typeof f.text === 'string' ? 'its text' : 'its value'}`);
        continue;
      }
      for (const { path, text } of texts) {
        const h = copiedFrom(text, all, T);
        if (h) r.fail(path, `${f.id} ${describe(h)}`);
      }
    }
    return r;
  }
  const slug = item.data?.group_slug ?? null;
  const texts = [];
  if (typeof item.data?.title === 'string') texts.push({ path: '/title', text: item.data.title });
  if (typeof item.data?.description === 'string') texts.push({ path: '/description', text: item.data.description });
  questionsOf(item).forEach((q, i) => texts.push(...questionTexts(q, `/questions/${i}`)));
  run(texts, excerptIndex(isMixSlug(slug) ? null : slug, ctx), isMixSlug(slug) ? 'any series' : slug);
  return r;
}

function knownNames(slug, ctx) {
  const out = new Set();
  const list = slug && !isMixSlug(slug) ? [ctx.series.get(slug)] : [...ctx.series.values()];
  for (const s of list.filter(Boolean)) {
    const d = s.data;
    const add = (v) => { if (typeof v === 'string' && normalize(v)) out.add(normalize(v)); };
    add(d.group?.name); add(d.series?.title_en); add(d.series?.title_romaji); add(d.series?.title_native); (d.series?.aliases ?? []).forEach(add);
    (d.arcs ?? []).forEach((a) => add(a.name));
    (d.characters ?? []).forEach((c) => { add(c.name); add(c.name_native); (c.aliases ?? []).forEach(add); });
    (d.themes ?? []).forEach((t) => { add(t.title); add(t.artist); });
    for (const x of ctx.facts.get(s.slug)?.facts ?? []) {
      for (const v of Array.isArray(x.fact?.value) ? x.fact.value : [x.fact?.value]) if (typeof v === 'string' && words(v).length <= 8) add(v);
    }
  }
  return out;
}

export function c8(item, ctx) {
  const r = new Result('C8');
  const T = ctx.thresholds;
  const slug = item.kind === 'series' ? item.data?.group?.slug : item.kind === 'facts' ? factsOfItem(item).slug : (item.data?.group_slug ?? null);
  const known = knownNames(slug, ctx);
  const units = []; // { path, text, music }
  if (item.kind === 'series') (item.data?.characters ?? []).forEach((c, i) => typeof c?.description === 'string' && units.push({ path: `/characters/${i}/description`, text: c.description, music: false }));
  else if (item.kind === 'facts') {
    for (const x of factsOfItem(item).facts) {
      const f = x.fact;
      if (!isObj(f)) continue;
      const music = f.category === 'music';
      if (typeof f.text === 'string') units.push({ path: `/facts/${x.index}/text`, text: f.text, music });
      for (const v of Array.isArray(f.value) ? f.value : [f.value]) if (typeof v === 'string') units.push({ path: `/facts/${x.index}/value`, text: v, music, isValue: true });
    }
  } else {
    for (const k of ['title', 'description']) if (typeof item.data?.[k] === 'string') units.push({ path: `/${k}`, text: item.data[k], music: false });
    questionsOf(item).forEach((q, i) => {
      const music = q?.kind === 'music';
      for (const t of questionTexts(q, `/questions/${i}`)) units.push({ ...t, music });
    });
  }
  let lines = 0;
  for (const u of units) {
    if (/[\u{266a}\u{266b}\u{266c}]/u.test(u.text)) r.fail(u.path, 'a music note sign: lyrics are not allowed');
    if (u.music && u.role === 'option' && words(u.text).length > T.c8_quote_max_words) r.fail(u.path, `an option of ${words(u.text).length} words in a music question looks like a lyric`);
    for (const seg of quotedSegments(u.text)) {
      if (known.has(normalize(seg))) continue;
      const w = words(seg).length;
      lines += 1;
      if (w > T.c8_quote_max_words) r.fail(u.path, `a quoted line of ${w} words, at most ${T.c8_quote_max_words}`);
      if (u.music) r.fail(u.path, 'a quoted line in a music question: no lyrics');
    }
  }
  if (lines > T.c8_quotes_per_quiz && (item.kind === 'quiz' || item.kind === 'daily')) r.fail('', `${lines} quoted lines in one quiz, at most ${T.c8_quotes_per_quiz}`);
  return r;
}

/** Jaccard overlap of two word sets, with a quick size test (a ratio under the line cannot reach it). */
function overlap(a, b) {
  const small = Math.min(a.size, b.size); const big = Math.max(a.size, b.size);
  if (big === 0) return 1;
  if (small / big < 0.5) return 0;
  let inter = 0;
  for (const x of a.size < b.size ? a : b) if ((a.size < b.size ? b : a).has(x)) inter += 1;
  return inter / (a.size + b.size - inter);
}

function buildDedupe(ctx) {
  if (ctx._dedupe) return ctx._dedupe;
  const entries = [];
  for (const it of ctx.corpus) {
    const qs = questionsOf(it).map((q, i) => {
      const clues = Array.isArray(q?.clues) ? q.clues.join(' ') : '';
      return {
        ref: it.ref, i, key: normalize(`${q?.question ?? ''} ${clues}`),
        w: new Set(contentWords(`${q?.question ?? ''} ${clues}`)),
        ans: typeof q?.correct === 'boolean' ? String(q.correct) : normalize(correctText(q) ?? ''),
      };
    });
    entries.push({ ref: it.ref, kind: it.kind, slug: it.data?.slug ?? null, title: normalize(it.data?.title ?? ''), qs });
  }
  const byKey = new Map();
  const byAns = new Map();
  for (const e of entries) for (const q of e.qs) {
    if (!byKey.has(q.key)) byKey.set(q.key, []);
    byKey.get(q.key).push(q);
    if (!byAns.has(q.ans)) byAns.set(q.ans, []);
    byAns.get(q.ans).push(q);
  }
  ctx._dedupe = { entries, byKey, byAns };
  return ctx._dedupe;
}

function buildFactDedupe(ctx) {
  if (ctx._factDedupe) return ctx._factDedupe;
  const m = new Map();
  for (const hits of ctx.factIndex.values()) for (const h of hits) {
    const f = h.fact;
    if (!isObj(f) || !isObj(f.entity)) continue;
    const v = Array.isArray(f.value) ? [...f.value].sort().join('|') : String(f.value);
    const key = [f.entity.group_slug, f.entity.kind, f.entity.ref ?? '', f.field ?? '', normalize(v)].join('#');
    if (!m.has(key)) m.set(key, []);
    m.get(key).push(h);
  }
  ctx._factDedupe = m;
  return m;
}

export function c9(item, ctx) {
  const r = new Result('C9');
  const T = ctx.thresholds;
  if (item.kind === 'series') {
    const d = item.data;
    const dupes = (list, keyFn, path, what) => {
      const seen = new Map();
      (Array.isArray(list) ? list : []).forEach((x, i) => { const k = keyFn(x); if (k === '' || k === undefined) return; if (seen.has(k)) r.fail(`${path}/${i}`, `${what} ${JSON.stringify(k)} repeats row ${seen.get(k) + 1}`); else seen.set(k, i); });
    };
    dupes(d?.characters, (c) => c?.slug, '/characters', 'character slug');
    dupes(d?.characters, (c) => normalize(c?.name ?? ''), '/characters', 'character name');
    dupes(d?.arcs, (a) => normalize(a?.name ?? ''), '/arcs', 'arc name');
    dupes(d?.themes, (t) => `${t?.kind} ${t?.number}`, '/themes', 'theme');
    const same = [...ctx.files.values()].filter((f) => f.kind === 'series' && isObj(f.data?.group) && f.data.group.slug === d?.group?.slug);
    if (same.length > 1) r.fail('/group/slug', `the series ${d.group.slug} is defined in ${same.length} files`);
    return r;
  }
  if (item.kind === 'facts') {
    const nf = factsOfItem(item);
    const m = buildFactDedupe(ctx);
    for (const x of nf.facts) {
      const f = x.fact;
      if (!isObj(f) || !isObj(f.entity)) continue;
      const v = Array.isArray(f.value) ? [...f.value].sort().join('|') : String(f.value);
      const key = [f.entity.group_slug, f.entity.kind, f.entity.ref ?? '', f.field ?? '', normalize(v)].join('#');
      const others = (m.get(key) ?? []).filter((h) => !(h.file === item.file && h.index === x.index));
      if (others.length > 0) r.fail(`/facts/${x.index}`, `${f.id} repeats ${others.map((h) => h.fact.id).join(', ')}: same entity, field and value`);
    }
    return r;
  }
  const { entries, byKey, byAns } = buildDedupe(ctx);
  const me = entries.find((e) => e.ref === item.ref);
  if (!me) return r;
  for (const e of entries) {
    if (e.ref === me.ref) continue;
    if (item.kind === 'quiz' && e.kind === 'quiz' && me.slug && e.slug === me.slug) r.fail('/slug', `the slug ${me.slug} is also used by ${e.ref}`);
    if (me.title && e.title === me.title) r.fail('/title', `the title is also the title of ${e.ref}`);
  }
  me.qs.forEach((q) => {
    const reported = new Set();
    const report = (o, why) => { const k = `${o.ref}#${o.i}`; if (!reported.has(k)) { reported.add(k); r.fail(`/questions/${q.i}`, `${why} ${o.ref === me.ref ? 'question' : `question ${o.i + 1} of ${o.ref}`}${o.ref === me.ref ? ` ${o.i + 1}` : ''}`); } };
    for (const o of byKey.get(q.key) ?? []) {
      if (o === q || (o.ref === q.ref && o.i === q.i)) continue;
      if (o.ref === me.ref && o.i > q.i) continue;
      report(o, 'asks the same thing as');
    }
    for (const o of byAns.get(q.ans) ?? []) {
      if (o.ref === q.ref && o.i === q.i) continue;
      if (o.ref === me.ref && o.i > q.i) continue;
      if (o.key === q.key) continue;
      if (overlap(q.w, o.w) >= T.c9_question_jaccard) report(o, 'is nearly the same as');
    }
  });
  return r;
}
