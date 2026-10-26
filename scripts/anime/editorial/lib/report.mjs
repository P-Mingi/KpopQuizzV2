// Run O1, lane E1a: the text and JSON forms of a check report.

import { relPath } from './load.mjs';

const loc = (n) => (n.q ? `q${n.q}` : n.fact ? `fact ${n.fact}` : '');

export function toJson(report) {
  const { ctx } = report;
  return {
    tool: 'e1a-check',
    ok: report.ok,
    thresholds: ctx.thresholds,
    data_dir: relPath(ctx.dataDir),
    inspiration_titles: ctx.inspiration.length,
    allow_draft_facts: ctx.allowDraftFacts,
    summary: report.summary,
    files: report.files.map((f) => ({
      file: f.file, kind: f.kind, skipped: f.skipped,
      items: f.items.map((x) => ({
        ref: x.ref, title: x.title, slug: x.slug, pass: x.pass, questions: x.questions, facts: x.facts, characters: x.characters, themes: x.themes, profiles: x.profiles, warnings: x.warnings,
        checks: x.checks,
      })),
    })),
  };
}

export function toText(report) {
  const lines = [];
  for (const f of report.files) {
    if (f.skipped) continue;
    for (const x of f.items) {
      const size = x.questions !== undefined ? `${x.questions} questions` : x.facts !== undefined ? `${x.facts} facts` : x.characters !== undefined ? `${x.characters} characters` : '';
      lines.push(`${x.pass ? 'PASS' : 'FAIL'} ${x.ref} (${f.kind}${size ? `, ${size}` : ''}) ${x.title}`);
      for (const c of x.checks) {
        for (const n of c.notes) lines.push(`  ${c.code} FAIL ${loc(n) ? `${loc(n)} ` : ''}${n.path ? `${n.path}: ` : ''}${n.message}`);
        for (const w of c.warnings) lines.push(`  ${c.code} warn ${loc(w) ? `${loc(w)} ` : ''}${w.path ? `${w.path}: ` : ''}${w.message}`);
      }
    }
  }
  const s = report.summary;
  const codes = Object.entries(s.failed_by_code).map(([c, n]) => `${c} x${n}`).join(', ');
  lines.push(`${report.ok ? 'OK' : 'FAILED'}: ${s.files} files, ${s.items} items, ${s.passed} pass, ${s.failed} fail, ${s.warnings} warnings${s.skipped ? `, ${s.skipped} files skipped (not a content file)` : ''}${codes ? `; failing checks: ${codes}` : ''}`);
  return lines.join('\n');
}
