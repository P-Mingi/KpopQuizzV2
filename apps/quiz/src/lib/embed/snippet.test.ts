import { describe, expect, it } from 'vitest';

import { EMBED_CREDIT_HELP, PUBLIC_EMBED_PARTNER, buildEmbedSnippet, embedCreditText, sanitizePartner } from './snippet';

// SEO Mission 3, part F.1 (rulebook section 13.1): the paste snippet carries a visible
// credit link OUTSIDE the iframe, anchor "Quiz: {Title} on kpopquiz.org", never hidden,
// never keyword-stuffed, and a partner may mark it nofollow.

const base = { slug: 'bts-members-real-names', title: 'BTS members real names', partner: 'nolae' };

/** The markup before the iframe opens: what the partner's own DOM shows. */
const beforeFrame = (html: string): string => html.slice(0, html.indexOf('<iframe'));

describe('buildEmbedSnippet', () => {
  it('puts the credit link before the iframe, with the exact anchor text', () => {
    const html = buildEmbedSnippet(base);
    const outside = beforeFrame(html);
    expect(outside).toContain('<a href="https://kpopquiz.org/q/bts-members-real-names?utm_source=nolae&utm_medium=embed&utm_campaign=widget">Quiz: BTS members real names on kpopquiz.org</a>');
    // exactly one link in the partner DOM, and it is not inside the frame or the script
    expect(html.match(/<a /g)).toHaveLength(1);
    expect(html.indexOf('<a ')).toBeLessThan(html.indexOf('<iframe'));
    expect(html.indexOf('<a ')).toBeLessThan(html.indexOf('<script'));
  });

  it('never hides the link', () => {
    const outside = beforeFrame(buildEmbedSnippet(base));
    expect(outside).not.toMatch(/display:\s*none|visibility:\s*hidden|font-size:\s*0|opacity:\s*0|hidden/i);
  });

  it('the anchor is the title plus the site, no extra keywords', () => {
    const html = buildEmbedSnippet({ ...base, title: 'Stray Kids basics' });
    const anchor = /<a [^>]*>([^<]*)<\/a>/.exec(html)?.[1];
    expect(anchor).toBe(embedCreditText('Stray Kids basics'));
    expect(anchor).toBe('Quiz: Stray Kids basics on kpopquiz.org');
  });

  it('is followed by default and nofollow only on request', () => {
    expect(buildEmbedSnippet(base)).not.toContain('nofollow"');
    const nf = buildEmbedSnippet({ ...base, nofollow: true });
    expect(beforeFrame(nf)).toMatch(/<a href="[^"]+" rel="nofollow">Quiz: /);
  });

  it('carries the help text as a comment', () => {
    expect(buildEmbedSnippet(base).split('\n')[0]).toBe(`<!-- kpopquiz.org quiz embed. ${EMBED_CREDIT_HELP} -->`);
    expect(EMBED_CREDIT_HELP).toBe('Keep the credit link so readers can find more quizzes. You may mark it nofollow if your site requires it.');
  });

  it('frames the noindex embed route with the partner and theme', () => {
    const html = buildEmbedSnippet({ ...base, theme: 'dark' });
    expect(html).toContain('src="https://kpopquiz.org/embed/q/bts-members-real-names?partner=nolae&theme=dark"');
    expect(html).toContain('title="BTS members real names - K-pop quiz"');
  });

  it('escapes the title at the sink', () => {
    const html = buildEmbedSnippet({ ...base, title: 'A "quiz" <script>alert(1)</script> & more' });
    expect(html).not.toContain('<script>alert(1)');
    expect(html).toContain('Quiz: A &quot;quiz&quot; &lt;script&gt;alert(1)&lt;/script&gt; &amp; more on kpopquiz.org');
  });

  it('cannot be broken out of by the slug or the partner key', () => {
    const html = buildEmbedSnippet({ ...base, slug: 'x"><img src=x onerror=1>', partner: 'Nolae"><b>' });
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<b>');
    expect(html).toContain('utm_source=nolaeb&');
  });

  it('falls back to a neutral partner key', () => {
    expect(buildEmbedSnippet({ ...base, partner: '!!!' })).toContain('utm_source=partner&');
    expect(sanitizePartner('My Site.com')).toBe('mysitecom');
    expect(sanitizePartner(PUBLIC_EMBED_PARTNER)).toBe(PUBLIC_EMBED_PARTNER);
  });

  it('contains no em or en dash', () => {
    const html = buildEmbedSnippet(base);
    expect(html).not.toMatch(/[\u2013\u2014]/);
  });
});
