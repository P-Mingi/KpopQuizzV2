// FLAW-2 sweep (integrator fix, 2026-11-12): every place under components/verse and app/(site)/verse where a
// STRING becomes DOM (dangerouslySetInnerHTML, innerHTML, outerHTML, insertAdjacentHTML, execCommand
// insertHTML / createLink, document.write, createContextualFragment) is pinned here. What remains is a
// static string, a JSON-LD block through lib/seo/json-ld (jsonLdString), or the output of the TipTap
// renderer lib/verse/render-content (it escapes every text and attribute value at the sink and drops any
// href that is not http(s) or a path). The tree editor and the link preview card have none left: they
// build with the DOM. A new sink fails this test until it is reviewed and added.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('../../', import.meta.url));
const ROOTS = ['components/verse', 'app/(site)/verse'];
const SINK = /dangerouslySetInnerHTML=|\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML\(|['"]insertHTML['"]|['"]createLink['"]|document\.write\(|createContextualFragment\(/g;

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [p] : [];
  });
const files = ROOTS.flatMap((r) => walk(join(SRC, r))).map((p) => relative(SRC, p)).sort();
const text = (f: string): string => readFileSync(join(SRC, f), 'utf8');

// file -> number of string-to-DOM sinks it may hold, and why each is safe.
const ALLOWED: Record<string, number> = {
  'app/(site)/verse/[slug]/essays/[id]/page.tsx': 1,       // renderTipTapJSON(essay)
  'app/(site)/verse/layout.tsx': 1,                         // NAV_PREF_SCRIPT, a static string
  'app/(site)/verse/page.tsx': 1,                           // jsonLdString
  'app/(site)/verse/tag/[tag]/page.tsx': 1,                 // jsonLdString
  'components/verse/builder/hero-editor.tsx': 1,            // static CSS
  'components/verse/builder/inline-text-editor.tsx': 1,     // PHONE_TOOLBAR_CSS, static CSS
  'components/verse/builder/library-drawer.tsx': 1,         // static CSS
  'components/verse/builder/style-panel.tsx': 1,            // static CSS
  'components/verse/editor/section-surface.tsx': 3,         // renderTipTapJSON / splitTipTapForFold
  'components/verse/era-spine.tsx': 3,                      // renderTipTapJSON / splitTipTapForFold
  'components/verse/pages/wiki-leaf.tsx': 3,                // splitTipTapForFold
  'components/verse/presentation/canonical-modules.tsx': 1, // splitTipTapForFold
};

describe('string-to-DOM sinks under the Verse', () => {
  it('only the reviewed sinks remain (the tree editor and the link preview card have none)', () => {
    const found: Record<string, number> = {};
    for (const f of files) {
      const n = (text(f).match(SINK) ?? []).length;
      if (n) found[f] = n;
    }
    expect(found).toEqual(ALLOWED);
    expect(found['components/verse/tree/page-editor.tsx']).toBeUndefined();
    expect(found['components/verse/pages/link-previews.tsx']).toBeUndefined();
  });

  it('each dangerouslySetInnerHTML takes a static string, jsonLdString, or the render-content output', () => {
    const bad: string[] = [];
    for (const f of Object.keys(ALLOWED)) {
      const src = text(f);
      const uses = (src.match(/dangerouslySetInnerHTML=/g) ?? []).length;
      const read = [...src.matchAll(/dangerouslySetInnerHTML=\{\{\s*__html:\s*(.+?)\s*\}\}/g)];
      if (read.length !== uses) bad.push(`${f}: ${uses - read.length} sink(s) this check cannot read`);
      for (const m of read) {
        const expr = m[1]!;
        const literal = /^'[^'$`\\]*'$/.test(expr);
        const constant = /^[A-Z][A-Z0-9_]*$/.test(expr) && new RegExp(`const ${expr} = (\`[^\`$]*\`|'[^']*');`).test(src);
        const jsonLd = /^jsonLdString\([\w.]+\)$/.test(expr) && src.includes("from '@/lib/seo/json-ld'");
        const prose = /^(html|split\.previewHtml|split\.restHtml)$/.test(expr) && src.includes("from '@/lib/verse/render-content'");
        if (!(literal || constant || jsonLd || prose)) bad.push(`${f}: ${expr}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
