// Run O1, lane E1a: checks C4 (answers backed by cited facts), C5 (spoiler tags) and C6 (title).

import { contentWords, mentions, normalize, shapeOf, words } from './text.mjs';
import { Result, answerWords, citedFacts, correctText, evidenceWords, factsOfItem, isMixSlug, isObj, optionTexts, questionTexts, questionsOf, shapeOfQuestion } from './checks-base.mjs';

const pct = (x) => `${Math.round(x * 100)}%`;
const padded = (s) => ` ${normalize(s)} `;

function seriesBacking(item, ctx, r) {
  const d = item.data;
  const slug = d?.group?.slug;
  const entry = ctx.facts.get(slug);
  if (!entry) { r.fail('', `no facts file for the series ${slug}: no fact backs its values`); return; }
  const phrases = []; const nums = new Set();
  const refs = { character: new Set(), arc: new Set(), theme: new Set() };
  for (const x of entry.facts) {
    const f = x.fact;
    if (!isObj(f)) continue;
    const vals = Array.isArray(f.value) ? f.value : [f.value];
    for (const v of vals) { if (typeof v === 'string') phrases.push(padded(v)); if (typeof v === 'number') nums.add(String(v)); }
    if (typeof f.text === 'string') phrases.push(padded(f.text));
    if (isObj(f.entity) && refs[f.entity.kind]) refs[f.entity.kind].add(String(f.entity.ref));
  }
  const backed = (v) => (typeof v === 'number' ? nums.has(String(v)) || phrases.some((p) => p.includes(` ${v} `)) : phrases.some((p) => p.includes(padded(v))));
  const s = d.series ?? {};
  const header = [['title_en', s.title_en], ['title_native', s.title_native], ['title_romaji', s.title_romaji], ['director', s.director], ['magazine', s.magazine], ['publisher', s.publisher],
    ['anime_start_year', s.anime_start_year], ['anime_end_year', s.anime_end_year], ['manga_start_year', s.manga_start_year], ['manga_end_year', s.manga_end_year],
    ['episodes', s.episodes], ['seasons', s.seasons], ['volumes', s.volumes], ['chapters', s.chapters],
    ...(s.studios ?? []).map((x, i) => [`studios/${i}/name`, x?.name]), ...(s.authors ?? []).map((x, i) => [`authors/${i}/name`, x?.name])];
  for (const [key, v] of header) {
    if (v === undefined || v === null) continue;
    if (!backed(v)) r.fail(`/series/${key}`, `${JSON.stringify(v)} is backed by no fact of ${entry.file}`);
  }
  (d.arcs ?? []).forEach((a, i) => { if (!(refs.arc.has(String(a?.ord)) || backed(a?.name ?? '') || a?.source_url)) r.fail(`/arcs/${i}`, `arc ${a?.ord} has neither a fact nor a source_url`); });
  (d.characters ?? []).forEach((c, i) => { if (!(refs.character.has(c?.slug) || backed(c?.name ?? '') || c?.source_url)) r.fail(`/characters/${i}`, `${c?.slug} has neither a fact nor a source_url`); });
  (d.themes ?? []).forEach((t, i) => { if (!(refs.theme.has(`${t?.kind}-${t?.number}`) || backed(t?.title ?? '') || t?.source_url)) r.fail(`/themes/${i}`, `${t?.kind} ${t?.number} has neither a fact nor a source_url`); });
}

export function c4(item, ctx) {
  const r = new Result('C4');
  const T = ctx.thresholds;
  if (item.kind === 'series') { seriesBacking(item, ctx, r); return r; }
  if (item.kind === 'facts') {
    for (const x of factsOfItem(item).facts) {
      const f = x.fact;
      if (!isObj(f) || x.excerpts.length === 0) continue;
      const exWords = new Set(x.excerpts.flatMap((e) => words(e)));
      const vals = (Array.isArray(f.value) ? f.value : [f.value]).filter((v) => typeof v === 'string' || typeof v === 'number');
      const miss = vals.filter((v) => { const w = answerWords(String(v)); return w.length > 0 && w.filter((x2) => exWords.has(x2)).length / w.length < 0.5; });
      if (miss.length > 0) r.warn(`/facts/${x.index}/value`, `${f.id}: ${miss.map((v) => JSON.stringify(v)).join(', ')} not found in the stored source excerpt`);
    }
    return r;
  }
  questionsOf(item).forEach((q, i) => {
    if (!isObj(q)) return;
    const base = `/questions/${i}`;
    const { found } = citedFacts(q, ctx);
    if (found.length === 0) { r.fail(`${base}/fact_ids`, 'no cited fact resolves, so the answer has no backing'); return; }
    const ev = evidenceWords(found, ctx);
    const shape = shapeOfQuestion(q);
    if (shape === 'tf') {
      const sal = contentWords(q.question ?? '');
      const shared = sal.filter((w) => ev.has(w));
      if (shared.length < Math.min(T.c4_tf_shared_words, sal.length)) r.fail(`${base}/question`, `the statement shares only ${shared.length} content word(s) with the cited facts`);
      else if (q.correct === true && sal.length > 0 && shared.length / sal.length < T.c4_tf_true_coverage) {
        r.fail(`${base}/question`, `a true statement needs ${pct(T.c4_tf_true_coverage)} of its content words in the cited facts, it has ${pct(shared.length / sal.length)}`);
      }
    } else {
      const ans = correctText(q);
      if (ans !== null) {
        const aw = answerWords(ans);
        const cov = aw.length === 0 ? 0 : aw.filter((w) => ev.has(w)).length / aw.length;
        if (cov < T.c4_answer_coverage) r.fail(`${base}/options/${q.correct}`, `the right answer ${JSON.stringify(ans)} is not found in the cited facts (${pct(cov)} of its words, ${pct(T.c4_answer_coverage)} needed)`);
        const na = normalize(ans);
        const stem = [padded(q.question ?? ''), ...(Array.isArray(q.clues) ? q.clues.map(padded) : [])];
        if (na.length >= 4 && !/^[0-9 ]+$/.test(na) && stem.some((t) => t.includes(` ${na} `))) r.fail(`${base}/question`, `the question or its clues contain the right answer ${JSON.stringify(ans)}`);
      }
      const opts = optionTexts(q).filter((o) => typeof o === 'string');
      if (opts.length === 4) {
        const classes = new Set(opts.map((o) => { const sh = shapeOf(o); return sh === 'name' || sh === 'phrase' ? 'text' : sh; }));
        if (classes.size > 1) r.fail(`${base}/options`, `the options are not of one type (${[...classes].join(' and ')})`);
        const lens = opts.map((o) => words(o).length).filter((n) => n > 0);
        if (lens.length === 4 && Math.max(...lens) / Math.min(...lens) > T.c4_option_word_ratio) r.fail(`${base}/options`, `the options differ too much in length (${Math.min(...lens)} to ${Math.max(...lens)} words)`);
      }
    }
    if (typeof q.fun_fact === 'string') {
      const fw = contentWords(q.fun_fact);
      const cov = fw.length === 0 ? 1 : fw.filter((w) => ev.has(w)).length / fw.length;
      if (cov < 0.5) r.warn(`${base}/fun_fact`, `only ${pct(cov)} of the fun fact is found in the cited facts`);
    }
  });
  return r;
}

const rank = (scope) => ({ anime: 1, manga: 2, both: 3 }[scope] ?? 0);
const mergeScope = (a, b) => (!a ? b : !b ? a : a === b ? a : 'both');
const covers = (tag, need) => tag === 'both' || tag === need || !need;

function maxArc(slug, ctx) {
  const list = slug && !isMixSlug(slug) ? [ctx.series.get(slug)] : [...ctx.series.values()];
  const ords = list.filter(Boolean).flatMap((s) => (s.data.arcs ?? []).map((a) => a.ord));
  return ords.length ? Math.max(...ords) : null;
}

/** Characters of the series (all series for a mix) whose name appears in a text, with their spoiler level. */
function namedCharacters(text, slug, ctx) {
  const list = slug && !isMixSlug(slug) ? [ctx.series.get(slug)] : [...ctx.series.values()];
  const out = [];
  for (const s of list.filter(Boolean)) {
    for (const c of s.data.characters ?? []) {
      for (const n of [c.name, ...(c.aliases ?? [])]) {
        if (mentions(text, n)) { out.push({ name: n, level: c.spoiler_level ?? 0, slug: c.slug }); break; }
      }
    }
  }
  return out;
}

export function c5(item, ctx) {
  const r = new Result('C5');
  if (item.kind === 'series') {
    const d = item.data;
    const top = Array.isArray(d?.arcs) ? Math.max(0, ...d.arcs.map((a) => a?.ord ?? 0)) : 0;
    const chars = Array.isArray(d?.characters) ? d.characters : [];
    const ords = new Set((d?.arcs ?? []).map((a) => a?.ord));
    chars.forEach((c, i) => {
      if (!isObj(c)) return;
      if (typeof c.spoiler_level === 'number' && c.spoiler_level > top) r.fail(`/characters/${i}/spoiler_level`, `${c.slug}: level ${c.spoiler_level} is beyond the last arc (${top})`);
      if (typeof c.debut_arc_ord === 'number' && !ords.has(c.debut_arc_ord)) r.fail(`/characters/${i}/debut_arc_ord`, `${c.slug}: debut arc ${c.debut_arc_ord} does not exist`);
      for (const other of chars) {
        if (!isObj(other) || other === c || other.identity_spoiler !== true) continue;
        if (mentions(c.description, other.name) && (other.spoiler_level ?? 0) > (c.spoiler_level ?? 0)) {
          r.fail(`/characters/${i}/description`, `${c.slug} (level ${c.spoiler_level ?? 0}) names ${other.name}, an identity spoiler of level ${other.spoiler_level ?? 0}`);
        }
      }
    });
    return r;
  }
  if (item.kind === 'facts') {
    const nf = factsOfItem(item);
    const top = maxArc(nf.slug, ctx);
    const chars = ctx.series.get(nf.slug)?.data?.characters ?? [];
    for (const x of nf.facts) {
      const f = x.fact; const base = `/facts/${x.index}`;
      if (!isObj(f) || !isObj(f.spoiler)) continue;
      if (top !== null && f.spoiler.arc > top) r.fail(`${base}/spoiler/arc`, `${f.id}: arc ${f.spoiler.arc} is beyond the last arc (${top})`);
      if (f.entity?.kind === 'character') {
        const c = chars.find((cc) => cc.slug === f.entity.ref);
        if (c && f.spoiler.arc < (c.spoiler_level ?? 0)) r.fail(`${base}/spoiler/arc`, `${f.id}: about ${c.slug} (level ${c.spoiler_level}) but tagged arc ${f.spoiler.arc}`);
      }
      for (const text of [f.text, ...(Array.isArray(f.value) ? f.value : [f.value])].filter((v) => typeof v === 'string')) {
        for (const c of namedCharacters(text, nf.slug, ctx)) {
          if (c.level > f.spoiler.arc) { r.fail(`${base}/spoiler/arc`, `${f.id}: names ${c.name} (spoiler level ${c.level}) but is tagged arc ${f.spoiler.arc}`); break; }
        }
      }
    }
    return r;
  }
  const slug = item.data?.group_slug ?? null;
  const top = maxArc(slug, ctx);
  questionsOf(item).forEach((q, i) => {
    if (!isObj(q)) return;
    const base = `/questions/${i}`;
    if (!isObj(q.spoiler)) { r.fail(`${base}/spoiler`, 'no spoiler tag: every question carries one'); return; }
    const tag = q.spoiler;
    if (top !== null && tag.arc > top) r.fail(`${base}/spoiler/arc`, `tag arc ${tag.arc} is beyond the last arc of the series (${top})`);
    const { found } = citedFacts(q, ctx);
    let needArc = 0; let needScope = null; let needId = null;
    for (const { fact } of found) {
      const sp = fact.spoiler;
      if (!isObj(sp)) continue;
      if (sp.arc > needArc) { needArc = sp.arc; needId = fact.id; }
      if (sp.arc > 0) needScope = mergeScope(needScope, sp.scope);
    }
    if (tag.arc < needArc) r.fail(`${base}/spoiler`, `tagged arc ${tag.arc} but the cited fact ${needId} spoils from arc ${needArc}`);
    else if (needArc > 0 && !covers(tag.scope, needScope)) r.fail(`${base}/spoiler/scope`, `scope ${tag.scope} does not cover the scope ${needScope} of the cited facts`);
    else if (tag.arc > needArc && found.length > 0) r.warn(`${base}/spoiler`, `tagged arc ${tag.arc}, the cited facts only need arc ${needArc}`);
    const seen = new Set();
    for (const { text } of questionTexts(q, base)) {
      for (const c of namedCharacters(text, slug, ctx)) {
        if (c.level > tag.arc && !seen.has(c.slug)) { seen.add(c.slug); r.fail(`${base}/spoiler`, `names ${c.name} (spoiler level ${c.level}) but is tagged arc ${tag.arc}`); }
      }
    }
  });
  return r;
}

// Words that make a title lazy once the series name is removed ("Death Note quiz", "The ultimate quiz").
const FILLER = new Set(['quiz', 'test', 'trivia', 'the', 'a', 'an', 'ultimate', 'official', 'anime', 'manga', 'series']);

export function c6(item, ctx) {
  const r = new Result('C6');
  if (item.kind === 'series' || item.kind === 'facts') return r.notApplicable();
  const title = item.data?.title;
  if (typeof title !== 'string') return r;
  const slug = item.data?.group_slug ?? null;
  const list = slug && !isMixSlug(slug) ? [ctx.series.get(slug)].filter(Boolean) : [...ctx.series.values()];
  const names = new Set();
  for (const s of list) {
    for (const n of [s.data.group?.name, s.data.series?.title_en, s.data.series?.title_romaji, ...(s.data.series?.aliases ?? [])]) if (typeof n === 'string' && normalize(n)) names.add(normalize(n));
    names.add(s.slug.replace(/-/g, ' '));
  }
  if (slug && !isMixSlug(slug)) names.add(slug.replace(/-/g, ' '));
  const t = padded(title);
  let lazy = false;
  for (const n of [...names].sort((a, b) => b.length - a.length)) {
    if (!t.includes(` ${n} `)) continue;
    const rest = t.replace(` ${n} `, ' ').trim().split(/\s+/).filter(Boolean);
    if (rest.every((w) => FILLER.has(w))) { lazy = true; break; }
  }
  if (!lazy && t.trim().split(/\s+/).filter(Boolean).every((w) => FILLER.has(w))) lazy = true;
  if (lazy) r.fail('/title', `the title ${JSON.stringify(title)} is only the series name with "quiz", "test" or "trivia"`);
  for (const s of list) {
    for (const c of s.data.characters ?? []) {
      if (c.identity_spoiler !== true) continue;
      for (const n of [c.name, ...(c.aliases ?? [])]) {
        if (mentions(title, n)) r.fail('/title', `the title names ${n}, a character whose identity is a spoiler`);
      }
    }
  }
  return r;
}
