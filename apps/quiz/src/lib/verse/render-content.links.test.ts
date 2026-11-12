// FLAW-2 sweep (integrator fix, 2026-11-12): the second Verse renderer (TipTap JSON to HTML, used by the
// public Verse pages and the community posts) builds its anchors as an HTML string. Its escaper covers
// & < > and ", and every attribute is double quoted, so a stored value cannot leave the attribute; these
// tests pin that, and pin the link rule: a link that a browser would send to ANOTHER host while it looks
// like a site path (`//host`, `/\host`, a tab or line break inside) renders as plain text.
import { describe, expect, it } from 'vitest';

import { renderTipTapJSON } from './render-content';

const linked = (href: unknown, text = 'see') => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text, marks: [{ type: 'link', attrs: { href } }] }] }],
});
const mention = (id: unknown) => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'mention', attrs: { id, label: 'BTS' } }] }],
});
/** every href attribute of the rendered HTML, as written. */
const hrefs = (html: string): string[] => [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]!);
/** every attribute NAME of every tag: an injected `onmouseover` would show here. */
const attrNames = (html: string): string[] => [...html.matchAll(/<[a-z]+((?:\s+[a-z-]+="[^"]*")*)\s*>/g)]
  .flatMap((m) => [...m[1]!.matchAll(/([a-z-]+)="/g)].map((a) => a[1]!));

describe('render-content links', () => {
  it('renders a link to another host in disguise as plain text', () => {
    for (const bad of ['//evil.example', '/\\evil.example', '/\\/evil.example', '/\t/evil.example', '/\n/evil.example', '/x\\y', 'javascript:alert(1)', 'data:text/html,x']) {
      const html = renderTipTapJSON(linked(bad));
      expect(html, JSON.stringify(bad)).not.toContain('<a ');
      expect(html).toContain('see');
      expect(renderTipTapJSON(mention(bad)), JSON.stringify(bad)).not.toContain('<a ');
    }
  });

  it('keeps the links it rendered before', () => {
    expect(hrefs(renderTipTapJSON(linked('/verse/bts/wiki/army-bomb')))).toEqual(['/verse/bts/wiki/army-bomb']);
    expect(renderTipTapJSON(linked('/verse/bts/wiki/army-bomb'))).toContain('class="verse-link"');
    expect(hrefs(renderTipTapJSON(linked('https://kpopquiz.org/verse/bts')))).toEqual(['/verse/bts']);
    const out = renderTipTapJSON(linked('https://www.soompi.com/article/x'));
    expect(hrefs(out)).toEqual(['https://www.soompi.com/article/x']);
    expect(out).toContain('rel="nofollow noopener"');
    expect(hrefs(renderTipTapJSON(mention('/verse/bts')))).toEqual(['/verse/bts']);
  });

  it('cannot be broken out of an attribute by a quote', () => {
    for (const attack of ['https://x/"onmouseover="alert(1)', `/a"onmouseover="alert(1)`, `https://x/it's"here`]) {
      const html = renderTipTapJSON(linked(attack, '"><img src=x onerror=alert(1)>'));
      expect(attrNames(html).every((n) => ['href', 'class', 'rel', 'target'].includes(n)), html).toBe(true);
      expect(html).not.toContain('<img');
      for (const h of hrefs(html)) expect(h).not.toContain('"');
    }
  });
});
