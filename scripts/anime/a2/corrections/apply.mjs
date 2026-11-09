#!/usr/bin/env node
// node scripts/anime/a2/corrections/apply.mjs [--write]  : puts every correction of the specs into scripts/anime/a2/data/*.json (idempotent). Run it after the collectors
// (onepiece.mjs, dragonball.mjs, review.mjs, allseries.mjs, review-all.mjs, dragonball-final.mjs): it is the last step of the pipeline, so a regeneration keeps every fix.
import { L21 } from './spec-l21.mjs';
import { clone, ensureNewChars, load, save, setState } from './engine.mjs';

export async function allItems() {
  const items = [...L21];
  try { const m = await import('./spec-l22.mjs'); items.push(...m.L22); } catch (e) { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; }
  return items;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const D = load();
  const items = await allItems();
  try { ensureNewChars(D, (await import('./spec-l22.mjs')).NEW_CHARS); } catch (e) { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; }
  let set = 0;
  let already = 0;
  for (const it of items) { if (setState(D, it, 'new') === 'set') set++; else already++; }
  if (process.argv.includes('--write')) save(D);
  console.log(`${items.length} corrections: ${set} applied now, ${already} already in the data${process.argv.includes('--write') ? ' (written)' : ' (not written)'}`);
}
export { clone };
