// Run O1, lane E1a: checks C1, C2 and C3 (schema, fact sourcing, fact existence and status).

import { basename } from 'node:path';
import { validate } from './schema.mjs';
import { hostIs, hostOf, normalize } from './text.mjs';
import { SOURCE_HOSTS } from './thresholds.mjs';
import { Result, citedFacts, factsOfItem, factsOfSlug, isMixSlug, isObj, optionTexts, questionsOf, shapeOfQuestion } from './checks-base.mjs';

// Lane quotas of the K1 brief by series tier (characters, facts): reported as warnings, never as failures.
const QUOTA = { A: { characters: 30, facts: 30 }, B: { characters: 20, facts: 20 }, C: { characters: 12, facts: 15 } };

/** Aggregates schema "unknown property" warnings by path pattern. */
function unknownSummary(list) {
  const m = new Map();
  for (const w of list) {
    const key = w.path.replace(/\/[0-9]+(?=\/|$)/g, '/*');
    m.set(key, (m.get(key) ?? 0) + 1);
  }
  return [...m].map(([k, n]) => ({ path: k, message: `unknown property outside the contract shape${n > 1 ? ` (${n} times)` : ''}` }));
}

function questionIntegrity(item, r) {
  questionsOf(item).forEach((q, i) => {
    const base = `/questions/${i}`;
    if (!isObj(q)) return;
    const shape = shapeOfQuestion(q);
    if (shape === 'tf') return;
    const opts = optionTexts(q);
    if (opts.length !== 4) { r.fail(`${base}/options`, `needs 4 options, has ${opts.length}`); return; }
    const norm = opts.map((o) => normalize(o));
    if (new Set(norm).size !== 4) r.fail(`${base}/options`, 'the 4 options are not distinct once case, accents and punctuation are ignored');
    if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct > 3) r.fail(`${base}/correct`, 'correct must be one option index from 0 to 3');
    else if (norm.filter((o) => o === norm[q.correct]).length !== 1) r.fail(`${base}/correct`, 'more than one option equals the right answer');
  });
}

export function c1(item, ctx) {
  const r = new Result('C1');
  const reg = ctx.registry;
  const push = (errs, prefix = '') => errs.forEach((e) => r.fail(`${prefix}${e.path}`, e.message));
  if (item.kind === 'quiz' || item.kind === 'daily') {
    const doc = item.kind === 'quiz' ? 'quiz-draft.schema.json' : 'daily-bank-row.schema.json';
    push(validate(doc, item.data, reg).errors);
    questionIntegrity(item, r);
  } else if (item.kind === 'series') {
    const v = validate('series-fixture.schema.json', item.data, reg, { dropRequired: ['quizzes', '$comment'], unknownAsWarning: true });
    // A series with no aired anime (no anime_start_year) has no openings or endings: the fixture's two-theme minimum does not apply
    // (D-075). It stays a warning so a missing list is still visible.
    const noAnime = isObj(item.data?.series) && item.data.series.anime_start_year == null;
    const themesMin = (e) => noAnime && e.path === '/themes' && /fewer than/.test(e.message);
    v.errors.filter(themesMin).forEach((e) => r.warn(e.path, `${e.message} (no aired anime)`));
    push(v.errors.filter((e) => !themesMin(e)));
    unknownSummary(v.warnings).forEach((w) => r.warn(w.path, w.message));
    const d = item.data;
    if (isObj(d?.group) && 'site' in d.group && d.group.site !== 'anime') r.fail('/group/site', 'site must be anime');
    if (Array.isArray(d?.arcs)) {
      const ords = d.arcs.map((a) => a?.ord);
      if (!ords.every((o, i) => o === i + 1)) r.fail('/arcs', 'arc ord must run 1, 2, 3 ... in story order, once each');
    }
    const quota = QUOTA[d?.series?.tier];
    if (quota && Array.isArray(d.characters) && d.characters.length < quota.characters) {
      r.warn('/characters', `tier ${d.series.tier} asks ${quota.characters} characters, has ${d.characters.length}`);
    }
  } else if (item.kind === 'facts') {
    const nf = factsOfItem(item);
    nf.problems.forEach((p) => r.fail('', p));
    if (nf.problems.length === 0 && nf.facts.length === 0) r.fail('', 'the facts file holds no fact');
    const seen = new Set();
    for (const x of nf.facts) {
      const base = `/facts/${x.index}`;
      const f = x.fact;
      const v = validate('fact.schema.json', f, reg);
      const twoSource = isObj(f) && f.status === 'verified' && f.load_bearing === true;
      push(v.errors.filter((e) => !(twoSource && e.path === '/sources' && /fewer than 2|contains rule/.test(e.message))), base);
      if (isObj(f) && f.site !== undefined && f.site !== 'anime') r.fail(`${base}/site`, 'a fact of OtakuQuiz must have site anime');
      for (const a of x.aliases) if (!seen.has(a)) { seen.add(a); r.warn('', `layout accepted: ${a}`); }
    }
    const tier = ctx.series.get(nf.slug)?.data?.series?.tier;
    const quota = QUOTA[tier];
    if (quota && nf.facts.length < quota.facts) r.warn('', `tier ${tier} asks ${quota.facts} facts, has ${nf.facts.length}`);
  }
  return r;
}

/** The sourcing problems of one fact (S 2.8): { fails, warns } as message lists. */
export function sourcingProblems(fact, ctx) {
  const fails = []; const warns = [];
  const sources = Array.isArray(fact?.sources) ? fact.sources : [];
  const now = Date.parse(ctx.now);
  const urls = new Set();
  sources.forEach((s, i) => {
    if (!isObj(s)) return;
    const host = hostOf(s.url ?? '');
    const domains = SOURCE_HOSTS[s.source];
    if (domains && !domains.some((d) => hostIs(host, d))) fails.push(`source ${i + 1} says ${s.source} but its host is ${host || 'unreadable'}`);
    if (s.source === 'official' && Object.values(SOURCE_HOSTS).flat().some((d) => hostIs(host, d))) fails.push(`source ${i + 1} says official but its host is ${host}`);
    if (s.source === 'wikipedia' && !/^[0-9]{1,12}$/.test(String(s.ref ?? ''))) fails.push(`source ${i + 1} is Wikipedia without the revision id read`);
    const t = Date.parse(s.fetched_at ?? '');
    if (Number.isNaN(t)) fails.push(`source ${i + 1} has no valid fetched_at`);
    else if (t > now + 86400000) fails.push(`source ${i + 1} fetched_at is in the future`);
    if (urls.has(s.url)) fails.push(`source ${i + 1} repeats a URL: two sources must be two pages`);
    urls.add(s.url);
  });
  if (fact?.load_bearing === true) {
    const strong = sources.some((s) => s?.source === 'wikidata' || s?.source === 'official');
    const ok = sources.length >= 2 && strong;
    if (!ok) {
      const msg = 'a load bearing fact needs 2 sources, one of them Wikidata or official';
      if (fact.status === 'verified') fails.push(msg); else warns.push(`${msg} before it can be verified`);
    }
  }
  return { fails, warns };
}

export function c2(item, ctx) {
  const r = new Result('C2');
  if (item.kind === 'series') return r.notApplicable();
  if (item.kind === 'facts') {
    for (const x of factsOfItem(item).facts) {
      const p = sourcingProblems(x.fact, ctx);
      p.fails.forEach((m) => r.fail(`/facts/${x.index}/sources`, `${x.fact?.id ?? 'fact'}: ${m}`));
      p.warns.forEach((m) => r.warn(`/facts/${x.index}/sources`, `${x.fact?.id ?? 'fact'}: ${m}`));
    }
    return r;
  }
  questionsOf(item).forEach((q, i) => {
    for (const hit of citedFacts(q, ctx).found) {
      const p = sourcingProblems(hit.fact, ctx);
      const soft = ctx.allowDraftFacts && hit.fact.status !== 'verified';
      p.fails.forEach((m) => (soft ? r.warn : r.fail).call(r, `/questions/${i}/fact_ids`, `${hit.fact.id}: ${m}`));
      p.warns.forEach((m) => r.warn(`/questions/${i}/fact_ids`, `${hit.fact.id}: ${m}`));
    }
  });
  return r;
}

export function c3(item, ctx) {
  const r = new Result('C3');
  if (item.kind === 'series') {
    const slug = item.data?.group?.slug;
    if (item.file.includes('/series/') && slug && basename(item.file, '.json') !== slug) r.fail('/group/slug', `the file is named ${basename(item.file)} but the series slug is ${slug}`);
    return r;
  }
  if (item.kind === 'facts') {
    const nf = factsOfItem(item);
    const s = ctx.series.get(nf.slug)?.data;
    if (!s) r.warn('', `no series file for ${nf.slug}: entity references were not resolved`);
    for (const x of nf.facts) {
      const f = x.fact; const base = `/facts/${x.index}`;
      if (!isObj(f)) continue;
      const hits = ctx.factIndex.get(f.id) ?? [];
      if (hits.length > 1) r.fail(`${base}/id`, `${f.id} is also used in ${hits.filter((h) => h.file !== item.file || h.index !== x.index).map((h) => h.file).join(', ')}: fact ids are unique across the site`);
      if (f.entity?.group_slug !== undefined && f.entity.group_slug !== nf.slug) r.fail(`${base}/entity/group_slug`, `${f.id}: group_slug ${f.entity.group_slug} differs from the file's series ${nf.slug}`);
      if (f.status === 'verified' && !f.verified_at) r.fail(`${base}/verified_at`, `${f.id}: verified without a verified_at date`);
      if (f.status === 'rejected') r.warn(`${base}/status`, `${f.id} is rejected and must not be cited`);
      if (s && isObj(f.entity)) {
        const e = f.entity;
        if (e.kind === 'character' && !(s.characters ?? []).some((c) => c.slug === e.ref)) r.fail(`${base}/entity/ref`, `${f.id}: no character ${e.ref} in the series file`);
        if (e.kind === 'arc' && !(s.arcs ?? []).some((a) => String(a.ord) === String(e.ref))) r.fail(`${base}/entity/ref`, `${f.id}: no arc ${e.ref} in the series file`);
        if (e.kind === 'theme') {
          const m = /^(op|ed|insert)-([0-9]+)$/.exec(e.ref ?? '');
          if (!m || !(s.themes ?? []).some((t) => t.kind === m[1] && String(t.number) === m[2])) r.fail(`${base}/entity/ref`, `${f.id}: no theme ${e.ref} in the series file`);
        }
      }
    }
    return r;
  }
  const slug = item.data?.group_slug ?? null;
  if (!isMixSlug(slug) && !factsOfSlug(slug, ctx)) r.fail('/group_slug', `no facts file for the series ${slug}`);
  questionsOf(item).forEach((q, i) => {
    const { found, missing } = citedFacts(q, ctx);
    const base = `/questions/${i}/fact_ids`;
    for (const id of missing) r.fail(base, `${id} is in no facts file`);
    for (const { fact, file } of found) {
      if (fact.site !== item.data.site) r.fail(base, `${fact.id} belongs to the site ${fact.site}`);
      if (!isMixSlug(slug) && fact.entity?.group_slug !== slug) r.fail(base, `${fact.id} belongs to the series ${fact.entity?.group_slug}, not ${slug} (${file})`);
      if (fact.status === 'rejected') r.fail(base, `${fact.id} is rejected`);
      else if (fact.status !== 'verified') (ctx.allowDraftFacts ? r.warn : r.fail).call(r, base, `${fact.id} is ${fact.status}: only verified facts may be cited`);
      else if (!fact.verified_at) r.fail(base, `${fact.id} is verified without a verified_at date`);
      else {
        const latest = Math.max(...(fact.sources ?? []).map((s) => Date.parse(s.fetched_at ?? '')).filter((t) => !Number.isNaN(t)), 0);
        if (latest && Date.parse(fact.verified_at) < latest) r.warn(base, `${fact.id} was verified before its last source was fetched`);
      }
    }
  });
  return r;
}
