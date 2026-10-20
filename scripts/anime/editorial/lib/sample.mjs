// Run O1, lane E1a: the seeded draw of the review sample (S 4.3: a quarter of the questions of a batch).

import { hash32, rng } from './text.mjs';

/** Units a reviewer can sample: the questions of quiz and daily items, the facts of facts items. Ref is item#n, n from 1. */
export function unitsOf(entries) {
  const units = [];
  for (const e of entries) {
    const n = e.item.kind === 'facts' ? e.result.facts : e.item.kind === 'quiz' || e.item.kind === 'daily' ? e.result.questions : 0;
    for (let i = 1; i <= (n ?? 0); i += 1) units.push({ ref: `${e.item.ref}#${i}`, itemRef: e.item.ref, n: i, flagged: !e.result.pass });
  }
  return units;
}

/** The default seed: the batch name plus a hash of the creation time and the units, so each run draws afresh. */
export function defaultSeed(batch, createdAt, units) {
  return `${batch}-${hash32(`${createdAt}|${units.map((u) => u.ref).join(',')}`).toString(16).padStart(8, '0')}`;
}

/**
 * Draws ceil(fraction x all units) units from the units of items with no failing check (all of them when fewer).
 * Returns { refs, byEntry: Map(itemRef -> Set(n)), population, total, seed }.
 */
export function drawSample(entries, { fraction, seed }) {
  const units = unitsOf(entries);
  const pool = units.filter((u) => !u.flagged);
  const want = Math.min(Math.ceil(fraction * units.length), pool.length);
  const rand = rng(seed);
  const idx = pool.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i -= 1) { const j = Math.floor(rand() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  const chosen = new Set(idx.slice(0, want));
  const picked = pool.filter((_, i) => chosen.has(i));
  const byEntry = new Map();
  for (const u of picked) { if (!byEntry.has(u.itemRef)) byEntry.set(u.itemRef, new Set()); byEntry.get(u.itemRef).add(u.n); }
  return { refs: picked.map((u) => u.ref), byEntry, population: pool.length, total: units.length, seed };
}
