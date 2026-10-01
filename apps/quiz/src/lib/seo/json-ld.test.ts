import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { jsonLdString } from './json-ld';

describe('jsonLdString', () => {
  it('keeps a hostile quiz title inside the JSON', () => {
    const ld = {
      '@type': 'ItemList',
      itemListElement: [{ '@type': 'ListItem', position: 1, name: '</script><script>alert(1)</script>' }],
    };
    const out = jsonLdString(ld);
    expect(out.toLowerCase()).not.toContain('</script');
    expect(out).not.toMatch(/[<>&]/);
    expect(JSON.parse(out)).toEqual(ld);
  });

  it('escapes &, the HTML comment opener and the JS line separators, and parses back', () => {
    const ld = { name: 'Tom & Jerry <!-- x --> \u2028\u2029 "quoted" \\ back' };
    const out = jsonLdString(ld);
    expect(out).not.toMatch(/[<>&\u2028\u2029]/);
    expect(JSON.parse(out)).toEqual(ld);
  });

  it('is byte-identical to JSON.stringify when nothing needs escaping', () => {
    const ld = { '@context': 'https://schema.org', '@type': 'WebSite', name: 'KpopQuiz', n: [1, 2, null] };
    expect(jsonLdString(ld)).toBe(JSON.stringify(ld));
  });
});

// Guard: no ld+json block (or any other dangerouslySetInnerHTML) is fed by a bare
// JSON.stringify anywhere in src.
describe('ld+json sinks', () => {
  const src = fileURLToPath(new URL('../../', import.meta.url));
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(join(dir, e.name)) : /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [join(dir, e.name)] : [],
    );

  it('never pairs dangerouslySetInnerHTML with a bare JSON.stringify', () => {
    const offenders = walk(src).filter((f) => /__html:\s*JSON\.stringify\(/.test(readFileSync(f, 'utf8')));
    expect(offenders.map((f) => f.slice(src.length))).toEqual([]);
  });

  it('every file that writes an ld+json script uses the escaping helper', () => {
    const offenders = walk(src).filter((f) => {
      const s = readFileSync(f, 'utf8');
      return s.includes('type="application/ld+json"') && !/jsonLdString|jsonLdScript/.test(s);
    });
    expect(offenders.map((f) => f.slice(src.length))).toEqual([]);
  });
});
