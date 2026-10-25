import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import BannedPage from '../../app/(site)/banned/page';
import TermsPage from '../../app/(site)/terms/page';

import { CONTACT_EMAIL, organizationJsonLd } from './org';

// hello@kpopquiz.org is the only routed mailbox of the site (owner, 2026-10-25): contact@ and
// support@ bounce, so no page, schema or text may send people there.

const SRC = join(__dirname, '../..');
// Built from parts so this file does not match its own search.
const DEAD = new RegExp(`\\b(${['con', 'tact'].join('')}|${['sup', 'port'].join('')})@kpopquiz\\.org`, 'i');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (name === 'node_modules' || name.startsWith('.')) return [];
    return statSync(p).isDirectory() ? files(p) : /\.(tsx?|mts|json|md)$/.test(name) ? [p] : [];
  });
}

describe('the contact address is hello@kpopquiz.org', () => {
  it('is the site address and the Organization email', () => {
    expect(CONTACT_EMAIL).toBe('hello@kpopquiz.org');
    expect(organizationJsonLd().email).toBe('hello@kpopquiz.org');
  });

  it('is the address of the terms and of the suspended account page', () => {
    expect(renderToStaticMarkup(TermsPage())).toContain('href="mailto:hello@kpopquiz.org"');
    expect(renderToStaticMarkup(BannedPage())).toContain('hello@kpopquiz.org');
  });

  it('no file under apps/quiz/src names a mailbox that bounces', () => {
    const hits = files(SRC).filter((f) => DEAD.test(readFileSync(f, 'utf8')));
    expect(hits).toEqual([]);
  });
});
