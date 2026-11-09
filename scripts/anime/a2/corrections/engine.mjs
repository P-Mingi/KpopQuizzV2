// The corrections engine (lot O1, audit 06): applies the specs (spec-l21.mjs, spec-l22.mjs, spec-l23.mjs) to the collected data (scripts/anime/a2/data/*.json), so that
// gen-sql.mjs and gen-l13.mjs, run again, write the corrected values, and derives the guarded SQL files L21, L22, L23 from the same specs.
//   node scripts/anime/a2/corrections/apply.mjs [--write]    patch the data files (idempotent); without --write: only check
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { columnsOf, factsOf, l04Characters, sourcesOf } from '../gen-sql.mjs';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const A2 = path.resolve(HERE, '..');
export const ROOT = path.resolve(A2, '../../..');
export const LAUNCH = path.join(ROOT, 'docs/pending-migrations/multisite/launch');
const DATA = path.join(A2, 'data');
const FILES = { op: 'one-piece.json', db: 'dragon-ball.json', all: 'all-series.json' };

export const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
export const jq = (o) => `${q(JSON.stringify(o))}`;
export const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function load() {
  const D = Object.fromEntries(Object.entries(FILES).map(([k, f]) => [k, JSON.parse(readFileSync(path.join(DATA, f), 'utf8'))]));
  return D;
}
export function save(D) {
  // the same serialisation as the collectors (JSON.stringify(x, null, 1) + newline, no banned dash)
  for (const [k, f] of Object.entries(FILES)) writeFileSync(path.join(DATA, f), `${JSON.stringify(D[k], null, 1)}\n`);
}
export const clone = (o) => JSON.parse(JSON.stringify(o));

export const gameKey = (game) => (game === 'otakudle-one-piece' ? 'op' : 'db');
export const seriesOf = (game) => (game === 'otakudle-one-piece' ? 'one-piece' : 'dragon-ball');

// ---------------------------------------------------------------- where an item lives in the data
export function characterOf(D, item) {
  if (item.game) {
    const ch = D[gameKey(item.game)].characters.find((c) => c.slug === item.slug);
    if (!ch) throw new Error(`${item.id}: no character ${item.slug} in the ${item.game} data`);
    // a Dragon Ball voice actor lives in the all-series data (gen-sql reads it there)
    if (item.game === 'otakudle-dragon-ball' && item.kind === 'hint' && item.col === 'voice_actor_ja') {
      const s = D.all.series.find((x) => x.slug === 'dragon-ball');
      const c2 = s.characters.find((c) => c.slug === item.slug);
      if (!c2) throw new Error(`${item.id}: no character ${item.slug} in the all-series Dragon Ball data`);
      return c2;
    }
    return ch;
  }
  const s = D.all.series.find((x) => x.slug === item.series);
  const ch = s?.characters.find((c) => c.slug === item.slug);
  if (!ch) throw new Error(`${item.id}: no character ${item.series}/${item.slug} in the all-series data`);
  return ch;
}
/** A character that the pool did not hold yet (spec-l22 NEW_CHARS): added with empty fields, so that the items can set them. */
export function ensureNewChars(D, chars) {
  for (const n of chars) {
    const s = D.all.series.find((x) => x.slug === n.series);
    if (!s) throw new Error(`ensureNewChars: no series ${n.series}`);
    if (s.characters.some((c) => c.slug === n.slug)) continue;
    const empty = () => ({ value: null, status: 'none', sources: [] });
    s.characters.push({ series: n.series, slug: n.slug, name: n.name, in_site_data: true, ids: n.ids, fields: { gender: empty(), species: empty(), role_at_debut: empty(), first_appearance: empty(), voice_actor_ja: empty() } });
  }
}
export const fieldKey = (item) => (item.game ? item.col : item.col);

// A data value as the field holds it: gen-sql turns 'no bounty' into {"v":0,"l":"No bounty"}, null into {"v":null}.
function correctionEntry(item, ch) {
  const s = item.src;
  if (s === 'stored') return null;
  if (s.own) return { source: 'correction', id: item.id, url: ch.ids.fandom_url, raw: s.raw, value: item.new };
  return { source: 'correction', id: item.id, url: s.url, raw: s.raw, value: item.new, ref: s.ref, read: s.read };
}

/** Sets the item to its new (or old) state in D (mutates D). Returns 'set', 'already' or throws when the data is neither. */
export function setState(D, item, state) {
  const ch = characterOf(D, item);
  const f = ch.fields[fieldKey(item)];
  if (!f) throw new Error(`${item.id}: ${item.slug} has no field ${fieldKey(item)}`);
  const want = state === 'new' ? item.new : item.old;
  const other = state === 'new' ? item.old : item.new;
  const had = f.value;
  if (!same(had, want) && !same(had, other)) throw new Error(`${item.id}: ${item.slug}.${fieldKey(item)} holds ${JSON.stringify(had)}, expected ${JSON.stringify(item.old)} (audited) or ${JSON.stringify(item.new)} (corrected)`);
  f.value = want;
  f.sources = (f.sources ?? []).filter((x) => !(x.source === 'correction' && x.id === item.id));
  if (state === 'new') {
    const e = correctionEntry(item, ch);
    if (e) f.sources.push(e);
    f.corrections = [...(f.corrections ?? []).filter((x) => x.id !== item.id), { id: item.id, from: item.old, to: item.new, why: item.why }];
    if (f.status === 'none' && want !== null) f.status = 'single';
  } else {
    f.corrections = (f.corrections ?? []).filter((x) => x.id !== item.id);
    if (f.corrections.length === 0) delete f.corrections;
  }
  return same(had, want) ? 'already' : 'set';
}

export function stateOf(D, items, state) {
  const c = clone(D);
  for (const it of items) setState(c, it, state);
  return c;
}

// ---------------------------------------------------------------- the facts of the two games, for a given data
export function gameContext(D) {
  const cols = columnsOf(readFileSync(path.join(ROOT, 'docs/pending-migrations/multisite/024-dle-series-games.sql'), 'utf8'));
  const dbSeries = D.all.series.find((s) => s.slug === 'dragon-ball');
  const voices = new Map(dbSeries.characters.filter((c) => c.fields?.voice_actor_ja).map((c) => [c.slug, { ...c.fields.voice_actor_ja, ch: c }]));
  return { cols, voices };
}
const present = (v) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0);

/** { attrs, hints, target, sources: Map(field|source -> row) } of one character of a game. */
export function gameFacts(D, ctx, game, slug) {
  const ch = D[gameKey(game)].characters.find((c) => c.slug === slug);
  const extra = game === 'otakudle-dragon-ball' ? ctx.voices.get(slug) : undefined;
  const { attrs, hintDefs, hints, isComplete } = factsOf(game, ch, ctx.cols[game], extra);
  const series = seriesOf(game);
  const sources = new Map();
  const stored = [
    ...ctx.cols[game].map((c) => [c.key, ch.fields[c.key === 'debut_series' || c.key === 'debut_saga' ? c.key : c.key], attrs[c.key].v, ch]),
    ...Object.entries(hintDefs).filter(([, h]) => h.value !== null).map(([k, h]) => [k, h.field, h.value, h.ch]),
  ];
  for (const [key, dataField, v, owner] of stored) {
    if (!present(v) && v !== 0) continue;
    for (const s of sourcesOf(dataField, owner)) sources.set(`${series}.${key}|${s.source}`, { field: `${series}.${key}`, source: s.source, ref: s.ref, url: s.url, read: s.read ?? null });
  }
  return { attrs, hints, target: isComplete, sources };
}

export { columnsOf, l04Characters, sourcesOf };
