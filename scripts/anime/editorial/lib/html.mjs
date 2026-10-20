// Run O1, lane E1a: renders a review packet as one self-contained HTML file (inline CSS, no script, no external
// asset, readable on a phone). Everything printed passes through clean() and esc(): dashes become hyphens,
// emoji are dropped, markup is escaped.

import { CODES } from './thresholds.mjs';
import { EMOJI_RE } from './text.mjs';
import { citedFacts, isObj, optionText, shapeOfQuestion } from './checks-base.mjs';

const ALL_EMOJI = new RegExp(EMOJI_RE.source, 'gu');
export const clean = (s) => String(s ?? '').replace(/[\u{2012}-\u{2015}\u{2212}]/gu, '-').replace(ALL_EMOJI, '');
export const esc = (s) => clean(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const link = (url) => (/^https:\/\//i.test(url) ? `<a href="${esc(url)}" rel="noopener noreferrer">${esc(url)}</a>` : esc(url));
const tag = (text, cls = '') => `<span class="tag ${cls}">${esc(text)}</span>`;
const LETTERS = ['A', 'B', 'C', 'D'];
const anchor = (ref) => `x-${String(ref).replace(/[^A-Za-z0-9_-]/g, '_')}`;

const CSS = `
:root{--bg:#fbfaf7;--fg:#1d1d1f;--mut:#5b5b63;--line:#d9d6cc;--card:#fff;--bad:#a4161a;--badbg:#fdecec;--warn:#8a5a00;--warnbg:#fff5dc;--ok:#1b6b3a;--okbg:#e8f6ee;--acc:#2d4a9a}
@media (prefers-color-scheme:dark){:root{--bg:#141416;--fg:#ececf0;--mut:#a0a0aa;--line:#34343c;--card:#1c1c20;--bad:#ff8a8d;--badbg:#3a1618;--warn:#f0c060;--warnbg:#33290f;--ok:#7fd9a0;--okbg:#14301f;--acc:#9db4ff}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:64rem;margin:0 auto;padding:12px 14px 48px}
h1{font-size:1.45rem;margin:.6em 0 .2em}h2{font-size:1.2rem;margin:1.8em 0 .4em;padding-top:.4em;border-top:2px solid var(--line)}h3{font-size:1.05rem;margin:.2em 0}h4{font-size:1rem;margin:.1em 0 .3em}h5{font-size:.85rem;margin:.6em 0 .2em;color:var(--mut);text-transform:uppercase;letter-spacing:.04em}
a{color:var(--acc);overflow-wrap:anywhere}code{font:.85em ui-monospace,Menlo,Consolas,monospace;overflow-wrap:anywhere}
p{margin:.35em 0}.mut{color:var(--mut)}.small{font-size:.88rem}
.sum{display:grid;grid-template-columns:repeat(auto-fit,minmax(8.5rem,1fr));gap:8px;margin:.6em 0}
.sum div{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:8px 10px}.sum b{display:block;font-size:1.35rem}
.nav a{display:inline-block;margin:0 10px 6px 0}
.card{background:var(--card);border:1px solid var(--line);border-left:6px solid var(--ok);border-radius:8px;padding:10px 12px;margin:12px 0}
.card.fail{border-left-color:var(--bad)}.card.warn{border-left-color:var(--warn)}
.tag{display:inline-block;font-size:.76rem;border:1px solid var(--line);border-radius:999px;padding:0 8px;margin:0 4px 2px 0;white-space:nowrap}
.tag.bad{color:var(--bad);border-color:var(--bad);background:var(--badbg)}.tag.ok{color:var(--ok);border-color:var(--ok);background:var(--okbg)}.tag.warn{color:var(--warn);border-color:var(--warn);background:var(--warnbg)}
.codes{margin:.4em 0}
.find{margin:.3em 0;padding:6px 10px 6px 26px;background:var(--badbg);border-radius:6px;color:var(--bad)}.find.w{background:var(--warnbg);color:var(--warn)}
.q{border-top:1px solid var(--line);padding:10px 0;display:grid;grid-template-columns:1fr;gap:6px 18px}
.q.bad{background:linear-gradient(var(--badbg),var(--badbg)) no-repeat left top/4px 100%;padding-left:10px}
.stem{font-weight:600;margin:.2em 0}
.opts{list-style:none;margin:.3em 0;padding:0}.opts li{padding:3px 8px;border-radius:6px;margin:2px 0;border:1px solid transparent}
.opts li.right{background:var(--okbg);border-color:var(--ok)}
.fun{color:var(--mut);font-size:.92rem}
.facts{font-size:.92rem}
.fact{border:1px solid var(--line);border-radius:6px;padding:6px 9px;margin:6px 0;background:var(--bg)}.fact.bad{border-color:var(--bad);background:var(--badbg)}
.fact p{margin:.2em 0}.exc{color:var(--mut);font-style:italic}
table{border-collapse:collapse;width:100%;font-size:.9rem}th,td{text-align:left;border-bottom:1px solid var(--line);padding:4px 6px;vertical-align:top;overflow-wrap:anywhere}
details{margin:.4em 0}summary{cursor:pointer;font-weight:600}
dl.kv{display:grid;grid-template-columns:max-content 1fr;gap:2px 12px;margin:.3em 0;font-size:.92rem}dl.kv dt{color:var(--mut)}dl.kv dd{margin:0;overflow-wrap:anywhere}
.guide{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:8px 12px}
@media (min-width:52rem){.q{grid-template-columns:minmax(0,1.1fr) minmax(0,1fr)}.q .full{grid-column:1/-1}}
@media print{.nav{display:none}.card{break-inside:avoid}}
`;

function factBlock(hit, id) {
  if (!hit || !isObj(hit.fact)) return `<div class="fact bad"><p><code>${esc(id)}</code> ${tag('not found', 'bad')} in no facts file</p></div>`;
  const f = hit.fact;
  const val = Array.isArray(f.value) ? f.value.join('; ') : String(f.value);
  const e = f.entity ?? {};
  const bad = f.status !== 'verified';
  const srcs = (f.sources ?? []).map((s) => `<li>${esc(s.source)}${s.ref ? `, ${s.source === 'wikipedia' ? 'revision' : 'id'} ${esc(s.ref)}` : ''}, fetched ${esc(String(s.fetched_at ?? '').slice(0, 10))}: ${link(s.url ?? '')}</li>`).join('');
  const ex = (hit.excerpts ?? []).map((t) => `<p class="exc">Stored source text: ${esc(t.length > 260 ? `${t.slice(0, 257)}...` : t)}</p>`).join('');
  return `<div class="fact${bad ? ' bad' : ''}"><p><code>${esc(f.id)}</code> ${tag(f.status, f.status === 'verified' ? 'ok' : 'warn')}${f.load_bearing ? tag('load bearing') : ''}${tag(`spoiler arc ${f.spoiler?.arc ?? '?'} ${f.spoiler?.scope ?? ''}`)}${tag(f.category ?? '')}</p>
<p class="mut small">${esc(e.kind ?? '')}${e.ref ? ` ${esc(e.ref)}` : ''} of ${esc(e.group_slug ?? '')}${f.field ? `, field ${esc(f.field)}` : ''}</p>
<p><b>Value:</b> ${esc(val)}</p>${f.text ? `<p><b>Text:</b> ${esc(f.text)}</p>` : ''}
<ul class="small">${srcs}</ul>${ex}</div>`;
}

function findingsBlock(list, cls = '') {
  if (!list.length) return '';
  return `<ul class="find ${cls}">${list.map((f) => `<li><b>${esc(f.code)}</b> ${esc(f.message)}</li>`).join('')}</ul>`;
}

/** Findings of a result grouped by question or fact number: Map(n -> [{code, message}]), plus the item level ones. */
export function findingsOf(result, field = 'q') {
  const byUnit = new Map(); const general = []; const warnUnit = new Map(); const warnGeneral = [];
  for (const c of result.checks) {
    for (const [list, mapU, gen] of [[c.notes, byUnit, general], [c.warnings, warnUnit, warnGeneral]]) {
      for (const n of list) {
        const rec = { code: c.code, message: n.message };
        const u = n[field];
        if (u) { if (!mapU.has(u)) mapU.set(u, []); mapU.get(u).push(rec); } else gen.push(rec);
      }
    }
  }
  return { byUnit, general, warnUnit, warnGeneral };
}

function questionBlock(q, n, item, ctx, fx) {
  if (!isObj(q)) return `<article class="q bad"><p>Question ${n} is not an object.</p></article>`;
  const shape = shapeOfQuestion(q);
  const bad = fx.byUnit.get(n) ?? []; const warn = fx.warnUnit.get(n) ?? [];
  let answer = '';
  if (shape === 'tf') answer = `<p><b>Answer:</b> ${q.correct ? 'True' : 'False'}</p>`;
  else {
    const opts = Array.isArray(q.options) ? q.options : [];
    answer = `<ul class="opts">${opts.map((o, i) => `<li class="${i === q.correct ? 'right' : ''}">${LETTERS[i] ?? i + 1}. ${esc(optionText(o))}${i === q.correct ? ` ${tag('right answer', 'ok')}` : ''}</li>`).join('')}</ul>`;
  }
  const clues = Array.isArray(q.clues) ? `<ol class="small">${q.clues.map((c) => `<li>${esc(c)}</li>`).join('')}</ol>` : '';
  const { found, missing } = citedFacts(q, ctx);
  const facts = [...found.map((h) => factBlock(h, h.fact.id)), ...missing.map((id) => factBlock(null, id))].join('');
  const sp = q.spoiler ? tag(`spoiler arc ${q.spoiler.arc} ${q.spoiler.scope}`, q.spoiler.arc > 0 ? 'warn' : '') : tag('no spoiler tag', 'bad');
  return `<article class="q${bad.length ? ' bad' : ''}" id="${anchor(`${item.ref}#${n}`)}">
<div><h4>Question ${n} ${tag(q.kind ?? '?')}${sp}${tag(shape === 'tf' ? 'true or false' : shape === 'clues' ? 'clues' : shape === 'intruder' ? 'intruder' : 'multiple choice')}</h4>
<p class="stem">${esc(q.question)}</p>${clues}${answer}${q.fun_fact ? `<p class="fun">Fun fact: ${esc(q.fun_fact)}</p>` : ''}
${findingsBlock(bad)}${findingsBlock(warn, 'w')}
<p class="small mut">Question source: ${q.source_url ? link(q.source_url) : 'none'}</p></div>
<div class="facts"><h5>Cited facts</h5>${facts || '<p class="mut">none</p>'}</div></article>`;
}

function checkRow(result) {
  return `<p class="codes">${result.checks.map((c) => tag(`${c.code} ${c.na ? 'n/a' : c.pass ? (c.warnings.length ? 'warn' : 'ok') : 'FAIL'}`, c.na ? '' : !c.pass ? 'bad' : c.warnings.length ? 'warn' : 'ok')).join('')}</p>`;
}

function itemHead(item, result) {
  const d = item.data ?? {};
  const rows = [];
  const kv = (k, v) => v !== undefined && v !== null && v !== '' && rows.push(`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`);
  kv('File', item.ref); kv('Kind', item.kind);
  if (item.kind === 'quiz' || item.kind === 'daily') {
    kv('Series', d.group_slug ?? 'mixed'); kv('Author', d.account); kv('Type', d.quiz_type); kv('Difficulty', d.difficulty); kv('Category', d.category); kv('Slug', d.slug);
    kv('Description', d.description); kv('Notes for the reviewer', d.notes);
  }
  const srcs = Array.isArray(d.sources) ? `<ul class="small">${d.sources.map((s) => `<li>${esc(s.id)} ${esc(s.title)}: ${link(s.url)}</li>`).join('')}</ul>` : '';
  return `<h3>${esc(result.title)} ${tag(result.pass ? 'PASS' : 'FAIL', result.pass ? 'ok' : 'bad')}${result.warnings ? tag(`${result.warnings} warnings`, 'warn') : ''}</h3>
<dl class="kv">${rows.join('')}</dl>${srcs}${checkRow(result)}`;
}

function failureList(result) {
  const out = [];
  for (const c of result.checks) for (const n of c.notes) out.push({ code: c.code, message: `${c.code}: ${n.q ? `question ${n.q}: ` : n.fact ? `fact ${n.fact}: ` : ''}${n.message}` });
  return out;
}

function quizCard(entry, ctx, only) {
  const { item, result } = entry;
  const fx = findingsOf(result, 'q');
  const qs = Array.isArray(item.data?.questions) ? item.data.questions : [];
  const shown = qs.map((q, i) => [q, i + 1]).filter(([, n]) => !only || only.has(n));
  return `<section class="card ${result.pass ? (result.warnings ? 'warn' : '') : 'fail'}" id="${anchor(item.ref)}">${itemHead(item, result)}
${findingsBlock(fx.general)}${findingsBlock(fx.warnGeneral, 'w')}
${only ? `<p class="mut small">Showing ${shown.length} of ${qs.length} questions (the sample).</p>` : ''}
${shown.map(([q, n]) => questionBlock(q, n, item, ctx, fx)).join('')}</section>`;
}

function factsList(slug, ctx, only) {
  const entry = ctx.facts.get(slug);
  if (!entry) return '<p class="mut">No facts file for this series.</p>';
  const rows = entry.facts.map((x, i) => [x, i + 1]).filter(([, n]) => !only || only.has(n));
  return rows.map(([x, n]) => `<div id="${anchor(`fact-${slug}-${n}`)}"><p class="mut small">Fact ${n}</p>${factBlock({ fact: x.fact, excerpts: x.excerpts }, x.fact?.id)}</div>`).join('');
}

function seriesCard(entry, ctx, packetSlugs) {
  const { item, result } = entry;
  const d = item.data ?? {}; const s = d.series ?? {};
  const kvs = Object.entries(s).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(typeof v === 'object' ? JSON.stringify(v) : v)}</dd>`).join('');
  const arcs = (d.arcs ?? []).map((a) => `<tr><td>${esc(a.ord)}</td><td>${esc(a.name)}</td><td>${esc(a.kind)}</td><td>${a.source_url ? link(a.source_url) : ''}</td></tr>`).join('');
  const chars = (d.characters ?? []).map((c) => `<tr><td>${esc(c.name)}</td><td>${esc(c.role)}</td><td>${esc(c.debut_arc_ord)}</td><td>${esc(c.spoiler_level)}${c.identity_spoiler ? ' identity' : ''}</td><td>${esc(c.description)}</td></tr>`).join('');
  const themes = (d.themes ?? []).map((t) => `<tr><td>${esc(t.kind)} ${esc(t.number)}</td><td>${esc(t.title)}</td><td>${esc(t.artist)}</td><td>${t.source_url ? link(t.source_url) : ''}</td></tr>`).join('');
  const slug = d.group?.slug;
  return `<section class="card ${result.pass ? (result.warnings ? 'warn' : '') : 'fail'}" id="${anchor(item.ref)}">${itemHead(item, result)}
${findingsBlock(failureList(result))}${findingsBlock(result.checks.flatMap((c) => c.warnings.map((w) => ({ code: c.code, message: w.message }))), 'w')}
<h5>Series</h5><dl class="kv"><dt>slug</dt><dd>${esc(slug)}</dd><dt>name</dt><dd>${esc(d.group?.name)}</dd>${kvs}</dl>
<details open><summary>Arcs (${(d.arcs ?? []).length})</summary><table><tr><th>ord</th><th>name</th><th>kind</th><th>source</th></tr>${arcs}</table></details>
<details open><summary>Characters (${(d.characters ?? []).length})</summary><table><tr><th>name</th><th>role</th><th>debut</th><th>spoiler</th><th>description</th></tr>${chars}</table></details>
<details open><summary>Themes (${(d.themes ?? []).length})</summary><table><tr><th>theme</th><th>title</th><th>artist</th><th>source</th></tr>${themes}</table></details>
<details open><summary>Facts with their sources (${ctx.facts.get(slug)?.facts.length ?? 0})</summary><div class="facts">${factsList(slug, ctx, null)}</div></details></section>`;
}

function factsCard(entry, ctx, packetSlugs, only) {
  const { item, result } = entry;
  const slug = result.slug ?? item.data?.slug;
  const fx = findingsOf(result, 'fact');
  const general = fx.general; const gw = fx.warnGeneral;
  const list = ctx.facts.get(slug);
  const shown = (list?.facts ?? []).map((x, i) => [x, i + 1]).filter(([, n]) => !only || only.has(n));
  const unitFind = (n) => `${findingsBlock(fx.byUnit.get(n) ?? [])}${findingsBlock(fx.warnUnit.get(n) ?? [], 'w')}`;
  const body = packetSlugs.has(slug) && !only
    ? `<p class="mut">The facts of this series are listed with the series card (${list?.facts.length ?? 0} facts).</p>${[...fx.byUnit].map(([n, f]) => `<p class="small">Fact ${n}:</p>${findingsBlock(f)}`).join('')}`
    : shown.map(([x, n]) => `<div id="${anchor(`${item.ref}#${n}`)}"><p class="mut small">Fact ${n}</p>${factBlock({ fact: x.fact, excerpts: x.excerpts }, x.fact?.id)}${unitFind(n)}</div>`).join('');
  return `<section class="card ${result.pass ? (result.warnings ? 'warn' : '') : 'fail'}" id="${anchor(item.ref)}">${itemHead(item, result)}${findingsBlock(general)}${findingsBlock(gw, 'w')}${only ? `<p class="mut small">Showing ${shown.length} of ${list?.facts.length ?? 0} facts (the sample).</p>` : ''}${body}</section>`;
}

function renderEntry(entry, ctx, packetSlugs, only) {
  try { return renderEntryUnsafe(entry, ctx, packetSlugs, only); } catch (e) {
    // A file with an odd shape must never stop the packet: show what the checks found and say it could not be drawn.
    const { item, result } = entry;
    return `<section class="card fail" id="${anchor(item.ref)}"><h3>${esc(item.file)}</h3><p>This item could not be drawn (${esc(e instanceof Error ? e.message : String(e))}).</p>${findingsBlock(failureList(result))}</section>`;
  }
}

function renderEntryUnsafe(entry, ctx, packetSlugs, only) {
  if (entry.item.kind === 'series') return seriesCard(entry, ctx, packetSlugs);
  if (entry.item.kind === 'facts') return factsCard(entry, ctx, packetSlugs, only);
  if (entry.item.kind === 'quiz' || entry.item.kind === 'daily') return quizCard(entry, ctx, only);
  const { item, result } = entry;
  return `<section class="card fail" id="${anchor(item.ref)}"><h3>${esc(item.file)}</h3>${findingsBlock(failureList(result))}</section>`;
}

function spoilerSummary(item) {
  const qs = Array.isArray(item.data?.questions) ? item.data.questions : [];
  const m = new Map();
  for (const q of qs) { const k = q?.spoiler ? `arc ${q.spoiler.arc} ${q.spoiler.scope}` : 'untagged'; m.set(k, (m.get(k) ?? 0) + 1); }
  return [...m].map(([k, n]) => `${k} x${n}`).join(', ');
}

/**
 * model: { batch, lane, seed, fraction, createdAt, entries, ctx, flagged, sample: { refs, byEntry: Map(ref -> Set(n)) },
 *          units, thresholds }
 */
export function renderPacket(model) {
  const { batch, lane, seed, fraction, createdAt, entries, ctx, thresholds } = model;
  const flagged = entries.filter((e) => !e.result.pass);
  const warnOnly = entries.filter((e) => e.result.pass && e.result.warnings > 0);
  const packetSlugs = new Set(entries.filter((e) => e.item.kind === 'series').map((e) => e.result.slug));
  const kinds = {};
  for (const e of entries) kinds[e.item.kind] = (kinds[e.item.kind] ?? 0) + 1;
  const nQ = entries.reduce((n, e) => n + (e.result.questions ?? 0), 0);
  const nF = entries.reduce((n, e) => n + (e.result.facts ?? 0), 0);
  const failedBy = {};
  for (const e of entries) for (const c of e.result.checks) if (!c.pass) failedBy[c.code] = (failedBy[c.code] ?? 0) + 1;
  const sampleEntries = entries.filter((e) => model.sample.byEntry.has(e.item.ref));
  // The sample repeats cards that also sit in the collapsed list of all items: its ids get their own prefix.
  const sampleCards = sampleEntries.map((e) => renderEntry(e, ctx, new Set(), model.sample.byEntry.get(e.item.ref))).join('').replace(/ id="x-/g, ' id="x-s-');
  const titles = entries.filter((e) => e.item.kind === 'quiz' || e.item.kind === 'daily')
    .map((e) => `<tr><td>${esc(e.result.title)}${e.result.pass ? '' : ` ${tag('FAIL', 'bad')}`}</td><td>${esc(e.item.data?.group_slug ?? 'mixed')}</td><td>${esc(e.item.data?.difficulty ?? '')}</td><td>${esc(spoilerSummary(e.item))}</td></tr>`).join('');
  const index = entries.map((e) => `<tr><td><a href="#${anchor(e.item.ref)}">${esc(e.result.title)}</a><br><span class="mut small">${esc(e.item.ref)}</span></td><td>${esc(e.item.kind)}</td><td>${e.result.pass ? tag('PASS', 'ok') : tag('FAIL', 'bad')}${e.result.warnings ? tag(`${e.result.warnings} warn`, 'warn') : ''}</td></tr>`).join('');
  const codes = Object.entries(CODES).map(([c, t]) => `<tr><td>${c}</td><td>${esc(t)}</td><td>${failedBy[c] ?? 0}</td></tr>`).join('');
  const th = Object.entries(thresholds).map(([k, v]) => `<code>${esc(k)}</code> ${esc(v)}`).join('<br>');
  const flaggedHtml = flagged.length
    ? flagged.map((e) => renderEntry(e, ctx, packetSlugs, null)).join('')
    : '<p class="mut">No item has a failing check.</p>';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review packet ${esc(batch)}</title><style>${CSS}</style></head><body><main>
<h1>Review packet: ${esc(batch)}</h1>
<p class="mut">Lane ${esc(lane)}, site anime, created ${esc(createdAt)}. Generated by scripts/anime/editorial/packet.mjs.</p>${model.note ? `\n<div class="guide">${esc(model.note)}</div>` : ''}
<p class="nav"><a href="#flagged">Flagged (${flagged.length})</a><a href="#sample">Sample (${model.sample.refs.length})</a><a href="#titles">Titles and spoiler labels</a><a href="#items">All items (${entries.length})</a><a href="#checks">Checks</a></p>
<section id="summary"><h2>Summary</h2>
<div class="sum"><div><b>${entries.length}</b>items</div><div><b>${flagged.length}</b>flagged (failing check)</div><div><b>${warnOnly.length}</b>with warnings only</div><div><b>${nQ}</b>questions</div><div><b>${nF}</b>facts</div><div><b>${model.sample.refs.length}</b>in the sample</div></div>
<p>Items by kind: ${Object.entries(kinds).map(([k, n]) => `${esc(k)} ${n}`).join(', ') || 'none'}. Failing checks: ${Object.entries(failedBy).map(([c, n]) => `${c} x${n}`).join(', ') || 'none'}.</p>
<div class="guide"><b>How to read this.</b> Read every flagged item below, then every title and spoiler label, then the sample in full. Two errors in the sample send the whole batch back. A green tag is a machine check, not a judgment: the sample is where you read the sources.</div>
<p><b>Sample seed: <code>${esc(seed)}</code></b>. ${model.sample.refs.length} of the ${esc(model.sample.population)} questions and facts of items with no failing check, for a target of ${esc(fraction)} of the ${esc(model.sample.total)} in the batch. The draw is seeded: rerun with <code>--seed ${esc(seed)}</code> to get the same one.</p>
</section>
<section id="flagged"><h2>Flagged items (${flagged.length})</h2>${flaggedHtml}</section>
<section id="sample"><h2>Sample (${model.sample.refs.length})</h2>
<p class="mut small">Drawn: ${model.sample.refs.map((r) => `<a href="#x-s-${anchor(r).slice(2)}"><code>${esc(r)}</code></a>`).join(' ') || 'nothing to draw'}</p>${sampleCards}</section>
<section id="titles"><h2>Titles and spoiler labels</h2><table><tr><th>title</th><th>series</th><th>level</th><th>spoiler tags</th></tr>${titles || '<tr><td colspan="4">No quiz in this batch.</td></tr>'}</table></section>
<section id="items"><h2>All items (${entries.length})</h2><table><tr><th>item</th><th>kind</th><th>result</th></tr>${index}</table>
${entries.filter((e) => e.result.pass).map((e) => `<details><summary>${esc(e.result.title)}</summary>${renderEntry(e, ctx, packetSlugs, null)}</details>`).join('')}</section>
<section id="checks"><h2>Checks and thresholds</h2><table><tr><th>code</th><th>rule</th><th>items failing</th></tr>${codes}</table><p class="small">${th}</p></section>
</main></body></html>
`;
}
