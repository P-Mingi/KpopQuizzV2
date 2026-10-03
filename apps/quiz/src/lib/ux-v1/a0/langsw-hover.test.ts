import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { buildUxStylesheet } from './stylesheet';

// F3 for A1, issue C1-001: the language switch keeps the prototype's look on hover.
// The prototype's `.langsw` rules (prototype.html) have no :hover: an off pill stays
// muted under the pointer. a0.css had `.ux-langsw > a:hover { color: ink }`.

const here = path.dirname(fileURLToPath(import.meta.url));
const STYLES = path.resolve(here, '../../../styles');

describe('C1-001: language switch hover', () => {
  it('v12 on: no hover rule on the language switch, the off pill is muted', () => {
    const on = buildUxStylesheet({ v12: true, stylesDir: STYLES });
    expect(on).toContain('.ux-langsw');
    expect(on).not.toMatch(/\.ux-langsw\s*>\s*(a|button):hover/);
    expect(on).toMatch(/\.ux-langsw\s*>\s*a\s*,\s*\.ux-langsw\s*>\s*button\s*\{[^}]*color:\s*var\(--ux-muted\)/);
  });

  it('the prototype has no hover rule either', () => {
    const proto = fs.readFileSync(path.resolve(here, '../../../../../../docs/design/growth-v12/prototype.html'), 'utf8');
    expect(proto).toContain('.langsw button{');
    expect(proto).not.toMatch(/\.langsw[^{]*:hover/);
  });

  it('v12 off: the language switch is not in the stylesheet at all (nothing changes for v11)', () => {
    const off = buildUxStylesheet({ v12: false, stylesDir: STYLES });
    expect(off).not.toContain('ux-langsw');
  });
});
