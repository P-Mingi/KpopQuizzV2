// FLAW-2 (integrator fix, 2026-11-12): a stored link could break out of the editor's href attribute
// (`https://x/"onmouseover="...` went through an escaper that left quotes alone, into innerHTML). Two sides:
//   SAVE   - clampBlocks (the clamp savePage runs) drops or normalises every attack href;
//   RENDER - the editor's DOM builder (lib/verse/tree/runs) re-checks a RAW stored value and builds with
//            createElement / setAttribute / text nodes only, so no value can become an element or an attribute.
// The repo has no DOM library (and takes no new dependency): the builder runs against a minimal document
// that records what it is asked to build and throws if anything tries innerHTML.
import { describe, expect, it } from 'vitest';

import { clampBlocks, safeHref } from './blocks';
import type { RunLink } from './blocks';
import { appendListItems, appendRuns, appendTableRows, linkElement } from './runs';

const QUOTE_BREAK = 'https://x/"onmouseover="alert(1)';
const BACKSLASH = '/\\evil.example';
const PROTOCOL_RELATIVE = '//evil.example';
const JS = 'javascript:alert(1)';
const BOTH_QUOTES = `https://x/it's"here`;   // a value with ' and "
const BOTH_QUOTES_PATH = `/a'b"c`;
const ATTACK_HREFS = [QUOTE_BREAK, BACKSLASH, PROTOCOL_RELATIVE, JS, BOTH_QUOTES, BOTH_QUOTES_PATH];
const HTML_TEXT = ['<img src=x onerror=alert(1)>', '"><script>alert(1)</script>', `it's "quoted" & <b>`];

// ------------------------------------------------------------------ the rule
describe('safeHref', () => {
  it('normalises an https link and refuses everything else', () => {
    expect(safeHref(QUOTE_BREAK)).toBe('https://x/%22onmouseover=%22alert(1)');
    expect(safeHref(BOTH_QUOTES)).toBe("https://x/it's%22here");
    expect(safeHref('  HTTPS://Example.COM/a b  ')).toBe('https://example.com/a%20b');
    for (const bad of [BACKSLASH, PROTOCOL_RELATIVE, JS, BOTH_QUOTES_PATH, 'JavaScript:alert(1)', 'data:text/html,<script>alert(1)</script>',
      'http://x/', 'https:\\\\evil.example', 'https://evil.example\\@good', '/\\/evil', 'vbscript:x', '', '   ', 'x']) {
      expect(safeHref(bad), bad).toBeNull();
    }
    expect(safeHref(undefined)).toBeNull();
    expect(safeHref(42)).toBeNull();
  });

  it('keeps a clean site path, refuses a query, a fragment or a quote in it', () => {
    expect(safeHref('/verse/bts/butter')).toBe('/verse/bts/butter');
    expect(safeHref('/a-b_c.d~e/%2Fx')).toBe('/a-b_c.d~e/%2Fx');
    for (const bad of ['/x?y=1', '/x#top', '/x y', '/x"y', "/x'y", '/x<y', '/%zz', '/x\u0000']) expect(safeHref(bad), bad).toBeNull();
  });

  it('refuses a link over 300 characters rather than cutting it', () => {
    expect(safeHref(`https://x/${'a'.repeat(290)}`)).toHaveLength(300);
    expect(safeHref(`https://x/${'a'.repeat(291)}`)).toBeNull();
    expect(safeHref(`/${'a'.repeat(300)}`)).toBeNull();
  });
});

// ------------------------------------------------------------------ SAVE side
describe('SAVE: the clamp savePage runs drops or normalises every attack href', () => {
  const linkOf = (href: string): unknown => {
    const { body } = clampBlocks({ version: 1, blocks: [{ id: 'p1', type: 'paragraph', content: [{ text: 'click', link: { href } }] }] });
    return body.blocks[0]?.content?.[0];
  };

  it('normalises the https ones, so a quote can never close the attribute', () => {
    expect(linkOf(QUOTE_BREAK)).toEqual({ text: 'click', link: { href: 'https://x/%22onmouseover=%22alert(1)' } });
    expect(linkOf(BOTH_QUOTES)).toEqual({ text: 'click', link: { href: "https://x/it's%22here" } });
  });

  it.each([BACKSLASH, PROTOCOL_RELATIVE, JS, BOTH_QUOTES_PATH])('drops %s and keeps the text', (href) => {
    expect(linkOf(href)).toEqual({ text: 'click' });
  });

  it('clamps the list rows the same way, and a page link needs a real slug', () => {
    const { body } = clampBlocks({ version: 1, blocks: [{
      id: 'l1', type: 'list',
      items: [...ATTACK_HREFS.map((href) => [{ text: 'x', link: { href } as RunLink }]), [{ text: 'y', link: { toSlug: 'a" onmouseover="alert(1)' } }]],
    }] });
    const hrefs = (body.blocks[0]?.items ?? []).map((row) => row[0]?.link?.href ?? null);
    expect(hrefs).toEqual(['https://x/%22onmouseover=%22alert(1)', null, null, null, "https://x/it's%22here", null, null]);
    expect(body.blocks[0]?.items?.[6]?.[0]).toEqual({ text: 'y' });
  });

  it('keeps table cells as plain strings (they are text at every sink)', () => {
    const { body } = clampBlocks({ version: 1, blocks: [{ id: 't1', type: 'table', rows: [HTML_TEXT, [QUOTE_BREAK, JS, 'z']] }] });
    expect(body.blocks[0]?.rows).toEqual([HTML_TEXT, [QUOTE_BREAK, JS, 'z']]);
  });
});

// ------------------------------------------------------------------ a minimal document
class FakeText {
  readonly nodeType = 3;
  constructor(readonly data: string) {}
  get textContent(): string { return this.data; }
}
class FakeElement {
  readonly nodeType = 1;
  readonly attrs = new Map<string, string>();
  childNodes: Array<FakeElement | FakeText> = [];
  constructor(readonly tag: string, readonly ownerDocument: FakeDocument) {}
  setAttribute(name: string, value: string): void { this.attrs.set(name, String(value)); }
  getAttribute(name: string): string | null { return this.attrs.get(name) ?? null; }
  appendChild<T extends FakeElement | FakeText>(c: T): T { this.childNodes.push(c); return c; }
  replaceChildren(...nodes: Array<FakeElement | FakeText>): void { this.childNodes = nodes; }
  get textContent(): string { return this.childNodes.map((c) => c.textContent).join(''); }
  set textContent(v: string) { this.childNodes = [new FakeText(String(v))]; }
  // a string parsed into the DOM is exactly what FLAW-2 forbids.
  set innerHTML(_v: string) { throw new Error('innerHTML used'); }
  set outerHTML(_v: string) { throw new Error('outerHTML used'); }
  insertAdjacentHTML(): void { throw new Error('insertAdjacentHTML used'); }
}
class FakeDocument {
  createElement(tag: string): FakeElement { return new FakeElement(tag.toLowerCase(), this); }
  createTextNode(text: string): FakeText { return new FakeText(text); }
}
const fresh = (tag: string): FakeElement => new FakeDocument().createElement(tag);
const asEl = (e: FakeElement): Element => e as unknown as Element;

const all = (n: FakeElement): FakeElement[] => [n, ...n.childNodes.flatMap((c) => (c instanceof FakeElement ? all(c) : []))];
const texts = (n: FakeElement): string[] => n.childNodes.flatMap((c) => (c instanceof FakeText ? [c.data] : texts(c)));
// the HTML a browser would serialise for this tree (the innerHTML getter): text escapes & < >, attributes & ".
const escText = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s: string): string => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const serialise = (n: FakeElement | FakeText): string => (n instanceof FakeText ? escText(n.data)
  : `<${n.tag}${[...n.attrs].map(([k, v]) => ` ${k}="${escAttr(v)}"`).join('')}>${n.childNodes.map(serialise).join('')}</${n.tag}>`);

const ALLOWED_TAGS = new Set(['p', 'ul', 'tbody', 'strong', 'em', 'u', 'mark', 'a', 'li', 'tr', 'th', 'td']);
const ALLOWED_ATTRS = new Set(['href', 'data-slug', 'class', 'contenteditable']);
/** Nothing in the tree is a script, an unknown element or an unknown attribute, and every href is a safe one. */
function expectInert(root: FakeElement): void {
  for (const el of all(root)) {
    expect(ALLOWED_TAGS.has(el.tag), el.tag).toBe(true);
    for (const [name, value] of el.attrs) {
      expect(ALLOWED_ATTRS.has(name), name).toBe(true);
      if (name === 'href') {
        expect(safeHref(value)).toBe(value);
        expect(value).not.toMatch(/["\s<>\\]/);
      }
    }
  }
  // the serialised HTML holds no tag the builder did not make (every `<` of a value is text, escaped).
  const tags = [...serialise(root).matchAll(/<([a-z]+)[\s>]/g)].map((m) => m[1]!);
  expect(tags.every((t) => ALLOWED_TAGS.has(t))).toBe(true);
  expect(serialise(root)).not.toMatch(/<script|\son[a-z]+="/i);
}

// ------------------------------------------------------------------ RENDER side: the editor's DOM builder
describe('RENDER: the editor builds a RAW stored body with the DOM, never a string', () => {
  it('runs: an attack href is normalised or the link is dropped; the text is kept as text', () => {
    const p = fresh('p');
    appendRuns(asEl(p), ATTACK_HREFS.map((href, i) => ({ text: `t${i}`, marks: ['b'], link: { href } })));
    expectInert(p);
    const links = all(p).filter((e) => e.tag === 'a');
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['https://x/%22onmouseover=%22alert(1)', "https://x/it's%22here"]);
    expect(links.every((a) => [...a.attrs.keys()].sort().join() === 'class,href')).toBe(true);
    expect(texts(p)).toEqual(['t0', 't1', 't2', 't3', 't4', 't5']);
    expect(p.childNodes.filter((c) => c instanceof FakeElement).map((c) => (c as FakeElement).tag)).toEqual(['a', 'strong', 'strong', 'strong', 'a', 'strong']);
  });

  it('runs: HTML in the text stays characters, marks wrap it in the same order as before', () => {
    const p = fresh('p');
    appendRuns(asEl(p), HTML_TEXT.map((text) => ({ text, marks: ['b', 'i', 'u', 'mark'] })));
    expectInert(p);
    expect(texts(p)).toEqual(HTML_TEXT);
    expect(serialise(p)).toContain('<mark><u><em><strong>&lt;img src=x onerror=alert(1)&gt;</strong></em></u></mark>');
  });

  it('runs: a page link keeps a real slug only; junk runs and junk fields are skipped', () => {
    const p = fresh('p');
    appendRuns(asEl(p), [
      { text: 'ok', link: { toSlug: 'butter-album' } },
      { text: 'bad', link: { toSlug: 'x" onmouseover="alert(1)' } },
      { text: 'both', link: { toSlug: '//evil', href: 'https://x/' } },
      null, 'raw <b>string</b>', { text: 5 }, { text: 'm', marks: 'b', link: 'https://x/' },
    ]);
    expectInert(p);
    const links = all(p).filter((e) => e.tag === 'a');
    expect(links.map((a) => [a.getAttribute('data-slug'), a.getAttribute('href')])).toEqual([['butter-album', null]]);
    expect(texts(p)).toEqual(['ok', 'bad', 'both', '', 'm']);
  });

  it('list rows: every row is built the same way, an empty list keeps one row', () => {
    const ul = fresh('ul');
    appendListItems(asEl(ul), [...ATTACK_HREFS.map((href) => [{ text: 'x', link: { href } }]), HTML_TEXT.map((text) => ({ text }))]);
    expectInert(ul);
    expect(ul.childNodes).toHaveLength(ATTACK_HREFS.length + 1);
    expect(all(ul).filter((e) => e.tag === 'a').map((a) => a.getAttribute('href'))).toEqual(['https://x/%22onmouseover=%22alert(1)', "https://x/it's%22here"]);
    expect(texts(ul).slice(-3)).toEqual(HTML_TEXT);
    const empty = fresh('ul');
    appendListItems(asEl(empty), undefined);
    expect(serialise(empty)).toBe('<ul><li></li></ul>');
  });

  it('table cells: a cell is text, whatever it holds; the first row is the header', () => {
    const body = fresh('tbody');
    appendTableRows(asEl(body), [HTML_TEXT, [QUOTE_BREAK, JS, { not: 'a string' }]]);
    expectInert(body);
    expect(texts(body)).toEqual([...HTML_TEXT, QUOTE_BREAK, JS, '']);
    expect(all(body).filter((e) => e.tag === 'th')).toHaveLength(3);
    expect(all(body).filter((e) => e.tag === 'td')).toHaveLength(3);
    expect(all(body).filter((e) => e.tag === 'th' || e.tag === 'td').every((c) => c.getAttribute('contenteditable') === 'true')).toBe(true);
    const blank = fresh('tbody');
    appendTableRows(asEl(blank), []);
    expect(serialise(blank)).toBe('<tbody><tr><th contenteditable="true"></th><th contenteditable="true"></th></tr><tr><td contenteditable="true"></td><td contenteditable="true"></td></tr></tbody>');
  });

  it('linkElement: the toolbar Link and the [[ picker get the same rule', () => {
    const doc = new FakeDocument() as unknown as Document;
    for (const href of [BACKSLASH, PROTOCOL_RELATIVE, JS, BOTH_QUOTES_PATH, 'http://x/']) expect(linkElement(doc, { href }), href).toBeNull();
    const a = linkElement(doc, { href: QUOTE_BREAK }) as unknown as FakeElement;
    expect([...a.attrs]).toEqual([['href', 'https://x/%22onmouseover=%22alert(1)'], ['class', 'ed-link']]);
    const page = linkElement(doc, { toSlug: 'butter' }) as unknown as FakeElement;
    expect([...page.attrs]).toEqual([['data-slug', 'butter'], ['class', 'ed-link']]);
    expect(linkElement(doc, { toSlug: 'a"b' })).toBeNull();
    expect(linkElement(doc, undefined)).toBeNull();
  });
});

// ------------------------------------------------------------------ the block page link (ORCH sweep)
describe('the block page link', () => {
  it('keeps a real page slug and drops anything else at the save', () => {
    const body = (to_slug: unknown) => clampBlocks({ version: 1, blocks: [{ id: 'l', type: 'link', to_slug, label: 'Go' }] }).body.blocks;
    expect(body('army-bomb')).toEqual([{ id: 'l', type: 'link', to_slug: 'army-bomb', label: 'Go' }]);
    for (const bad of ['../../api/x', '//evil.example', '/\\evil.example', 'a"b', 'javascript:alert(1)', 'Army Bomb', '']) {
      expect(body(bad), JSON.stringify(bad)).toEqual([]);
    }
  });
});
