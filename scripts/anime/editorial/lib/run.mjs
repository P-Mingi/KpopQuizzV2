// Run O1, lane E1a: runs the checks on files and folders and gathers the report.

import { realpathSync } from 'node:fs';
import { checkItem } from './checks.mjs';
import { CODES } from './thresholds.mjs';
import { buildContext, collectFiles, expandItems, relPath } from './load.mjs';

/** The result of a file that could not be read as one of the four kinds. */
function fileFailure(file, kind, message) {
  const checks = Object.keys(CODES).map((code) => ({ code, name: CODES[code], pass: code !== 'C1', na: code !== 'C1', notes: code === 'C1' ? [{ path: '', message }] : [], warnings: [] }));
  return { ref: file, file, kind, title: file, slug: null, pass: false, checks, warnings: 0 };
}

/**
 * options: { dataDir, inspiration, allowDraftFacts, now, thresholds, contractDir }
 * Returns { ok, ctx, entries: [{ item, result }], files: [{ file, kind, skipped, items }], summary }.
 */
export function runChecks(paths, options = {}) {
  const targets = collectFiles(paths);
  const ctx = buildContext(targets, options);
  const files = [];
  const entries = [];
  for (const t of targets) {
    const rec = ctx.files.get(realpathSync(t.path));
    const rel = relPath(t.path);
    if (rec.parseError) {
      const result = fileFailure(rel, 'unknown', `not valid JSON: ${rec.parseError}`);
      files.push({ file: rel, kind: 'unknown', skipped: false, items: [result] });
      entries.push({ item: { kind: 'unknown', file: rel, ref: rel, data: null }, result });
      continue;
    }
    if (!rec.kind) {
      if (!t.explicit) { files.push({ file: rel, kind: 'unknown', skipped: true, items: [] }); continue; }
      const result = fileFailure(rel, 'unknown', 'not a series, facts, quiz draft or daily bank file');
      files.push({ file: rel, kind: 'unknown', skipped: false, items: [result] });
      entries.push({ item: { kind: 'unknown', file: rel, ref: rel, data: null }, result });
      continue;
    }
    const items = expandItems(t.path, rec.kind, rec.data);
    const results = items.map((item) => {
      const result = checkItem(item, ctx);
      entries.push({ item, result });
      return result;
    });
    files.push({ file: rel, kind: rec.kind, skipped: false, items: results });
  }
  const results = entries.map((e) => e.result);
  const byCode = {};
  for (const x of results) for (const c of x.checks) if (!c.pass) byCode[c.code] = (byCode[c.code] ?? 0) + 1;
  const summary = {
    files: files.filter((f) => !f.skipped).length,
    skipped: files.filter((f) => f.skipped).length,
    items: results.length,
    passed: results.filter((x) => x.pass).length,
    failed: results.filter((x) => !x.pass).length,
    warnings: results.reduce((n, x) => n + x.warnings, 0),
    failed_by_code: byCode,
  };
  return { ok: summary.failed === 0, ctx, entries, files, summary };
}

