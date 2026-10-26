// Run O1, lane E1a: the registry of the checks and the run of all of them on one item.

import { c1, c2, c3 } from './checks-a.mjs';
import { c4, c5, c6 } from './checks-b.mjs';
import { c7, c8, c9 } from './checks-c.mjs';
import { c10, c11, c12, c13, c14 } from './checks-d.mjs';
import { questionsOf } from './checks-base.mjs';
import { itemSlug, itemTitle, normalizeFactsFile } from './load.mjs';

export const CHECKS = [
  ['C1', c1], ['C2', c2], ['C3', c3], ['C4', c4], ['C5', c5], ['C6', c6], ['C7', c7],
  ['C8', c8], ['C9', c9], ['C10', c10], ['C11', c11], ['C12', c12], ['C13', c13], ['C14', c14],
];

/** Runs C1 to C14 on one item; a check that throws fails with the error, so a bad file never hides. */
export function checkItem(item, ctx) {
  const results = CHECKS.map(([code, fn]) => {
    try { return fn(item, ctx).toJSON(); } catch (e) {
      return { code, name: '', pass: false, na: false, notes: [{ path: '', message: `the check crashed: ${e instanceof Error ? e.message : String(e)}` }], warnings: [] };
    }
  });
  const pass = results.every((x) => x.pass);
  const counts = item.kind === 'facts' ? { facts: normalizeFactsFile(item.data, item.abs ?? item.file).facts.length }
    : item.kind === 'series' ? { characters: (item.data?.characters ?? []).length, themes: (item.data?.themes ?? []).length }
      : item.kind === 'personality' ? { questions: questionsOf(item).length, profiles: (item.data?.profiles ?? []).length }
        : { questions: questionsOf(item).length };
  return {
    ref: item.ref, file: item.file, kind: item.kind, title: itemTitle(item), slug: itemSlug(item), ...counts,
    pass, checks: results, warnings: results.reduce((n, x) => n + x.warnings.length, 0),
  };
}
