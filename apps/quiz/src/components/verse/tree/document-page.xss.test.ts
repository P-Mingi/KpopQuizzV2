// FLAW-2 (integrator fix, 2026-11-12): the READER sink of a tree page. A stored body that never went
// through the clamp (a raw row) is rendered by the document page: the attack hrefs are normalised or
// dropped, the text, list and table cells stay text, and no value creates an attribute, an event handler
// or a script. Server render only (react-dom/server), no database.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { safeHref } from '@/lib/verse/tree/blocks';

import { DocumentPage } from './document-page';

import type { PageRow } from '@/lib/verse/tree/types';

const QUOTE_BREAK = 'https://x/"onmouseover="alert(1)';
const BACKSLASH = '/\\evil.example';
const PROTOCOL_RELATIVE = '//evil.example';
const JS = 'javascript:alert(1)';
const BOTH_QUOTES = `https://x/it's"here`;
const BOTH_QUOTES_PATH = `/a'b"c`;
const ATTACK_HREFS = [QUOTE_BREAK, BACKSLASH, PROTOCOL_RELATIVE, JS, BOTH_QUOTES, BOTH_QUOTES_PATH];
const HTML_TEXT = ['<img src=x onerror=alert(1)>', '"><script>alert(1)</script>', `it's "quoted" & <b>`];

const decode = (s: string): string => s.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
/** Every start tag of the markup with its attributes (values decoded). */
function startTags(html: string): Array<{ name: string; attrs: Array<[string, string]> }> {
  return [...html.matchAll(/<([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^\s=>"'/]+(?:="[^"]*")?)*)\s*\/?>/g)].map((m) => ({
    name: m[1]!.toLowerCase(),
    attrs: [...m[2]!.matchAll(/\s+([^\s=>"'/]+)(?:="([^"]*)")?/g)].map((a): [string, string] => [a[1]!.toLowerCase(), decode(a[2] ?? '')]),
  }));
}

function render(blocks: Record<string, unknown>[]): string {
  const page: PageRow = {
    id: 1, space_id: 1, parent_id: null, slug: 'p', type: 'article', title: 'T', status: 'published',
    blocks: { version: 1, blocks: blocks.map((b, i) => ({ id: `b${i}`, type: String(b.type), ...b })) },
    entity_kind: null, entity_id: null, is_stub: false, created_by: 'u', published_at: '2026-11-12T00:00:00Z',
    created_at: '2026-11-12T00:00:00Z', updated_at: '2026-11-12T00:00:00Z',
  };
  return renderToStaticMarkup(createElement(DocumentPage, {
    spaceSlug: 'bts', page, crumbs: [], facts: null, revisionCount: 1, updatedAt: '2026-11-12T00:00:00Z', existingSlugs: ['butter'],
  }));
}

function expectInert(html: string): ReturnType<typeof startTags> {
  const tags = startTags(html);
  // every `<` that opens a tag was read by the parser above: nothing slipped past it.
  expect(tags).toHaveLength((html.match(/<[a-zA-Z]/g) ?? []).length);
  expect(tags.some((t) => t.name === 'script' || t.name === 'img' || t.name === 'iframe')).toBe(false);
  for (const t of tags) {
    for (const [name, value] of t.attrs) {
      expect(name.startsWith('on'), `${t.name} ${name}`).toBe(false);
      if (name === 'href') expect(/^javascript:|^data:|^\/\/|^\/\\|\\/i.test(value), value).toBe(false);
    }
  }
  return tags;
}

describe('RENDER: the reader document page of a raw stored body', () => {
  it('a run link is normalised or dropped; the link text stays', () => {
    const html = render([{ type: 'paragraph', content: ATTACK_HREFS.map((href, i) => ({ text: `click${i}`, link: { href } })) }]);
    const tags = expectInert(html);
    const links = tags.filter((t) => t.name === 'a' && t.attrs.some(([n]) => n === 'target'));
    expect(links.map((t) => Object.fromEntries(t.attrs).href)).toEqual(['https://x/%22onmouseover=%22alert(1)', "https://x/it's%22here"]);
    for (const l of links) expect(Object.fromEntries(l.attrs)).toEqual({ href: safeHref(Object.fromEntries(l.attrs).href), target: '_blank', rel: 'noopener noreferrer nofollow' });
    for (let i = 0; i < ATTACK_HREFS.length; i += 1) expect(html).toContain(`click${i}`);
    expect(html).not.toContain('evil.example');
    expect(html).not.toMatch(/javascript:/i);
  });

  it('list rows: the same rule in every row, HTML in the text stays text', () => {
    const html = render([{ type: 'list', items: [...ATTACK_HREFS.map((href) => [{ text: 'row', link: { href } }]), HTML_TEXT.map((text) => ({ text, marks: ['b'] }))] }]);
    const tags = expectInert(html);
    const hrefs = tags.filter((t) => t.name === 'a').map((t) => Object.fromEntries(t.attrs).href).filter((h) => h?.startsWith('https://x/'));
    expect(hrefs).toEqual(['https://x/%22onmouseover=%22alert(1)', "https://x/it's%22here"]);
    expect(tags.filter((t) => t.name === 'li' && t.attrs.length === 0).length).toBeGreaterThanOrEqual(ATTACK_HREFS.length + 1);
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('table cells: text, whatever they hold', () => {
    const html = render([{ type: 'table', rows: [HTML_TEXT, [QUOTE_BREAK, JS, BOTH_QUOTES]] }]);
    const tags = expectInert(html);
    expect(tags.filter((t) => t.name === 'th')).toHaveLength(3);
    expect(tags.filter((t) => t.name === 'td')).toHaveLength(3);
    expect(tags.filter((t) => t.name === 'th' || t.name === 'td').every((t) => t.attrs.length === 0)).toBe(true);
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('https://x/&quot;onmouseover=&quot;alert(1)');
  });

  it('a page link needs a real slug; a solid and a ghost link still render', () => {
    const html = render([{ type: 'paragraph', content: [
      { text: 'solid', link: { toSlug: 'butter' } },
      { text: 'ghost', link: { toSlug: 'dynamite' } },
      { text: 'bad', link: { toSlug: 'x" onmouseover="alert(1)' } },
      { text: 'dots', link: { toSlug: '../../evil' } },
    ] }]);
    const tags = expectInert(html);
    const hrefs = tags.filter((t) => t.name === 'a').map((t) => Object.fromEntries(t.attrs).href);
    expect(hrefs).toContain('/verse/bts/butter');
    expect(hrefs).toContain('/verse/bts/new?slug=dynamite');
    expect(hrefs.some((h) => h?.includes('evil') || h?.includes('onmouseover'))).toBe(false);
    expect(html).toContain('bad');
    expect(html).toContain('dots');
  });

  it('a clean stored body renders its links as before (https and /path)', () => {
    const html = render([{ type: 'paragraph', content: [
      { text: 'ext', link: { href: 'https://example.com/a' } },
      { text: 'int', link: { href: '/verse/bts/butter' } },
    ] }]);
    expect(html).toContain('<a href="https://example.com/a" target="_blank" rel="noopener noreferrer nofollow">ext</a>');
    expect(html).toContain('<a href="/verse/bts/butter">int</a>');
  });
});
