import { describe, expect, it } from 'vitest';

import {
  DESCRIPTION_MAX_RENDERED, DESCRIPTION_MIN_RENDERED, REDIRECT_SEEDS, TITLE_MAX_RENDERED, altTexts, applyBaseline, classifyRedirect,
  countH1, dashSnippets, decodeEntities, descriptionProblem, duplicates, extractCanonical, extractMetaDescription,
  extractMetaRobots, extractTitle, findingKey, imagesWithoutAlt, internalLinks, isDisallowed, isGenericRedirect, isNoindex,
  jsonLdDescriptions, jsonLdMismatches, jsonLdStrings, jsonLdVisibleClaims, keyWhere, noindexVerdict, parseBaseline, parseJsonLd,
  robotsDisallows, routeType, sameUrl, samplePaths, sitemapLocs, titleProblem, visibleText,
} from './prod-crawl';

const O = 'https://kpopquiz.org';
const EM = '\u2014';
const EN = '\u2013';

describe('HTML basics', () => {
  it('decodes named, decimal and hex entities', () => {
    expect(decodeEntities('Tom &amp; Jerry &#39;x&#x27; &quot;q&quot; &mdash; &#8211;')).toBe(`Tom & Jerry 'x' "q" ${EM} ${EN}`);
    expect(decodeEntities('&unknown; stays')).toBe('&unknown; stays');
  });

  it('visible text drops head, scripts, styles, templates and comments but keeps streamed blocks', () => {
    const html = '<html><head><title>T</title></head><body><h1>Hi</h1><script>var x="hidden"</script>'
      + '<style>.a{}</style><!-- note --><template id="B:0"></template><div hidden id="S:0"><p>Streamed</p></div></body></html>';
    expect(visibleText(html)).toBe('Hi Streamed');
  });

  it('reads the document title, never an SVG title', () => {
    expect(extractTitle('<svg><title>Icon</title></svg><title>Real &amp; title</title>')).toBe('Real & title');
    expect(extractTitle('<p>none</p>')).toBe('');
  });

  it('reads description, robots and canonical whatever the attribute order', () => {
    const html = '<meta content="A desc" name="description"/><meta name="robots" content="noindex, follow"/>'
      + '<link href="https://kpopquiz.org/a" rel="canonical"/>';
    expect(extractMetaDescription(html)).toBe('A desc');
    expect(extractMetaRobots(html)).toBe('noindex, follow');
    expect(extractCanonical(html)).toBe('https://kpopquiz.org/a');
  });

  it('noindex comes from meta robots or the X-Robots-Tag header, and "none" counts', () => {
    expect(isNoindex('index, follow', '')).toBe(false);
    expect(isNoindex('noindex', '')).toBe(true);
    expect(isNoindex('', 'noindex, nofollow')).toBe(true);
    expect(isNoindex('none', '')).toBe(true);
  });
});

describe('title and description bounds (rulebook 2.2, 2.3)', () => {
  it('a title of 60 characters with the suffix passes, 61 fails', () => {
    const sixty = `${'a'.repeat(TITLE_MAX_RENDERED - ' | KpopQuiz'.length)} | KpopQuiz`;
    expect(sixty.length).toBe(60);
    expect(titleProblem(sixty)).toBeNull();
    expect(titleProblem(`b${sixty}`)).toMatch(/61 characters/);
    expect(titleProblem('')).toBe('no <title>');
  });

  it('counts characters, not UTF-16 units', () => {
    expect(titleProblem(`${'\u{1F49C}'.repeat(60)}`)).toBeNull();
  });

  it('a description must hold 120 to 160 characters', () => {
    expect(descriptionProblem('x'.repeat(DESCRIPTION_MIN_RENDERED))).toBeNull();
    expect(descriptionProblem('x'.repeat(DESCRIPTION_MAX_RENDERED))).toBeNull();
    expect(descriptionProblem('x'.repeat(119))).toMatch(/119 characters, under 120/);
    expect(descriptionProblem('x'.repeat(161))).toMatch(/161 characters, over 160/);
    expect(descriptionProblem('')).toBe('no meta description');
  });

  it('finds values shared by several keys and ignores empty ones', () => {
    const m = new Map([['/a', 'same'], ['/b', 'same'], ['/c', 'other'], ['/d', ''], ['/e', '']]);
    expect(duplicates(m)).toEqual([['same', ['/a', '/b']]]);
  });
});

describe('headings, images, dashes', () => {
  it('counts H1 in the visible document only', () => {
    expect(countH1('<body><h1>A</h1></body>')).toBe(1);
    expect(countH1('<body><p>no heading</p></body>')).toBe(0);
    expect(countH1('<body><h1 class="x">A</h1><h1>B</h1></body>')).toBe(2);
    expect(countH1('<body><h1>A</h1><script>"<h1>in a string</h1>"</script><h10></h10></body>')).toBe(1);
  });

  it('an img needs an alt attribute; alt="" is the decorative case and passes', () => {
    const html = '<img src="/a.png" alt="A"><img src="/b.png" alt=""><img src="/c.png"><img alt src="/d.png">';
    expect(imagesWithoutAlt(html)).toEqual(['/c.png']);
    expect(altTexts(html)).toEqual(['A']);
  });

  it('finds em and en dashes, entity-encoded ones included, with context', () => {
    const text = visibleText(`<p>Plain - hyphen is fine</p><p>BTS &mdash; the best</p><p>2019${EN}2020</p>`);
    const found = dashSnippets(text);
    expect(found).toHaveLength(2);
    expect(found[0]).toMatch(/^em dash in ".*BTS \[EM\] the best/);
    expect(found[1]).toMatch(/^en dash in ".*2019\[EN\]2020/);
    expect(dashSnippets('K-pop Quiz - 450+ quizzes')).toEqual([]);
  });
});

describe('noindex allowlist (rulebook 9.2)', () => {
  it('allows the listed families', () => {
    for (const p of ['/search', '/create', '/create/quiz', '/login', '/auth/callback', '/profile/abc', '/u/someone', '/settings', '/onboarding', '/admin/seo', '/embed/q/x', '/leaderboard', '/pt/quizzes']) {
      expect(noindexVerdict(p).allowed, p).toBe(true);
    }
  });

  it('allows parameter variants (unbounded facets)', () => {
    expect(noindexVerdict('/quizzes', '?group=bts')).toEqual({ allowed: true, why: 'parameter variant (unbounded facet)' });
  });

  it('a noindexed hub is allowed only once the data says it is empty', () => {
    expect(noindexVerdict('/tuide-quiz')).toEqual({ allowed: false, hub: { kind: 'quiz', slug: 'tuide' } });
    expect(noindexVerdict('/blindtest/group-bts')).toEqual({ allowed: false, hub: { kind: 'blindtest', slug: 'bts' } });
  });

  it('anything else needs a written reason', () => {
    expect(noindexVerdict('/q/some-quiz')).toEqual({ allowed: false });
    expect(noindexVerdict('/s/share-card')).toEqual({ allowed: false });
  });
});

describe('redirects (rulebook 9.4)', () => {
  it('a missing or specific page sent home is a generic redirect', () => {
    expect(isGenericRedirect(`${O}/zz-not-a-page`, `${O}/`)).toBe(true);
    expect(isGenericRedirect(`${O}/games/sort-it`, `${O}/quizzes`)).toBe(true);
    expect(isGenericRedirect(`${O}/tier-list/new`, `${O}/quizzes`)).toBe(true);
    expect(isGenericRedirect(`${O}/battle?quiz=x`, `${O}/quizzes?quiz=x`)).toBe(true);
  });

  it('a hub rename, an exact successor or a host change is not', () => {
    expect(isGenericRedirect(`${O}/games`, `${O}/quizzes`)).toBe(false);
    expect(isGenericRedirect(`${O}/blind-test`, `${O}/blindtest`)).toBe(false);
    expect(isGenericRedirect(`${O}/blind-test/group-bts`, `${O}/blindtest/group-bts`)).toBe(false);
    expect(isGenericRedirect(`${O}/group/bts`, `${O}/bts-quiz`)).toBe(false);
    expect(isGenericRedirect(`https://www.kpopquiz.org/bts-quiz`, `${O}/bts-quiz`)).toBe(false);
  });

  it('classifies a redirect walk', () => {
    expect(classifyRedirect([{ url: `${O}/a`, status: 200, location: null }])).toEqual({ kind: 'none' });
    expect(classifyRedirect([
      { url: `${O}/group/bts`, status: 308, location: `${O}/bts-quiz` },
      { url: `${O}/bts-quiz`, status: 200, location: null },
    ])).toEqual({ kind: 'ok', to: `${O}/bts-quiz`, status: 308 });
    expect(classifyRedirect([
      { url: `${O}/a`, status: 301, location: `${O}/b` },
      { url: `${O}/b`, status: 308, location: `${O}/c` },
      { url: `${O}/c`, status: 200, location: null },
    ])).toEqual({ kind: 'chain', hops: 2, to: `${O}/c` });
    expect(classifyRedirect([
      { url: `${O}/zz`, status: 301, location: `${O}/` },
      { url: `${O}/`, status: 200, location: null },
    ])).toEqual({ kind: 'generic', to: `${O}/` });
    expect(classifyRedirect([
      { url: `${O}/a`, status: 301, location: `${O}/b` },
      { url: `${O}/b`, status: 301, location: `${O}/a` },
      { url: `${O}/a`, status: 0, location: null },
    ])).toEqual({ kind: 'loop' });
    expect(classifyRedirect([{ url: `${O}/a`, status: 301, location: `${O}/b` }])).toEqual({ kind: 'unfinished' });
  });

  it('every legacy seed states one expectation', () => {
    for (const s of REDIRECT_SEEDS) {
      const kinds = [s.to !== undefined, s.status !== undefined, s.probe === true].filter(Boolean).length;
      expect(kinds, s.path).toBe(1);
      expect(s.path.startsWith('/'), s.path).toBe(true);
    }
  });
});

describe('robots.txt', () => {
  const txt = 'User-Agent: *\nAllow: /\nAllow: /api/og/\nDisallow: /api/\nDisallow: /admin/\n\nUser-Agent: GPTBot\nDisallow: /private/\n\nUser-agent: Bingbot\nUser-agent: *\nDisallow: /tmp/ # trailing comment\n';
  it('reads the Disallow lines of every * group only', () => {
    expect(robotsDisallows(txt)).toEqual(['/api/', '/admin/', '/tmp/']);
  });
  it('matches by prefix', () => {
    expect(isDisallowed('/api/stats/live', ['/api/'])).toBe(true);
    expect(isDisallowed('/apis', ['/api/'])).toBe(false);
  });
});

describe('links, templates, sampling', () => {
  it('keeps same-site page links only, normalized to the canonical host', () => {
    const html = '<a href="/bts-quiz">a</a><a href="https://www.kpopquiz.org/groups/">b</a><a href="#top">c</a>'
      + '<a href="mailto:x@y.z">d</a><a href="https://other.example/x">e</a><a href="/logo.png">f</a><a href="/q/x?ref=1#a">g</a>';
    expect(internalLinks(html, O).sort()).toEqual([`${O}/bts-quiz`, `${O}/groups`, `${O}/q/x?ref=1`]);
  });

  it('names templates', () => {
    expect(routeType('/')).toBe('home');
    expect(routeType('/q/abc')).toBe('q/*');
    expect(routeType('/bts-quiz')).toBe('group-quiz');
    expect(routeType('/bts-trivia')).toBe('group-trivia');
    expect(routeType('/which-bts-member-are-you')).toBe('which-member');
    expect(routeType('/bts-name-all-members')).toBe('name-all');
    expect(routeType('/about')).toBe('static');
  });

  it('samples one URL per template first, then spreads the rest', () => {
    const paths = ['/', '/about', '/q/a', '/q/b', '/q/c', '/q/d', '/bts-quiz', '/ive-quiz', '/articles/x'];
    const s = samplePaths(paths, 6);
    expect(s).toHaveLength(6);
    expect(new Set(s.map(routeType))).toEqual(new Set(['home', 'static', 'q/*', 'group-quiz', 'articles/*']));
    expect(samplePaths(paths, 100)).toEqual(paths);
  });

  it('reads sitemap locations', () => {
    expect(sitemapLocs('<url><loc>https://kpopquiz.org</loc></url><url><loc> https://kpopquiz.org/a?x=1&amp;y=2 </loc></url>'))
      .toEqual(['https://kpopquiz.org', 'https://kpopquiz.org/a?x=1&y=2']);
  });

  it('compares canonicals by origin and path, trailing slash ignored', () => {
    expect(sameUrl('https://kpopquiz.org', 'https://kpopquiz.org/')).toBe(true);
    expect(sameUrl('https://kpopquiz.org/a/', 'https://kpopquiz.org/a')).toBe(true);
    expect(sameUrl('https://www.kpopquiz.org/a', 'https://kpopquiz.org/a')).toBe(false);
    expect(sameUrl('https://kpopquiz.org/a', 'https://kpopquiz.org/b')).toBe(false);
  });
});

describe('JSON-LD (rulebook 7)', () => {
  const ld = (o: unknown): string => `<script type="application/ld+json">${JSON.stringify(o)}</script>`;

  it('reports a block that does not parse, and walks @graph and nested nodes', () => {
    const html = `${ld({ '@graph': [{ '@type': 'WebSite', name: 'KpopQuiz' }, { '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: 'Q?', acceptedAnswer: { '@type': 'Answer', text: 'A.' } }] }] })}`
      + '<script type="application/ld+json">{"@type": "Article",}</script>';
    const p = parseJsonLd(html);
    expect(p.errors).toHaveLength(1);
    expect(p.errors[0]).toMatch(/^unparseable JSON-LD/);
    expect(p.nodes.map((n) => n['@type'])).toEqual(['WebSite', 'FAQPage', 'Question', 'Answer']);
  });

  it('FAQ, breadcrumb, headline and list items must be on the page; markup and punctuation do not matter', () => {
    const nodes = parseJsonLd(ld([
      { '@type': 'Article', headline: 'BTS Trivia: 113 Facts' },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: O }, { '@type': 'ListItem', position: 2, name: 'BTS Quiz' }] },
      { '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: 'How many?', acceptedAnswer: { '@type': 'Answer', text: 'There are 29 quizzes.' } }] },
      { '@type': 'ItemList', name: 'Trending', itemListElement: [{ '@type': 'ListItem', position: 1, url: `${O}/q/a`, name: 'Quiz A' }] },
      { '@type': 'Organization', name: 'Not checked' },
      { '@type': 'SiteNavigationElement', name: 'Main Navigation', hasPart: [{ '@type': 'WebPage', name: 'Quizzes', url: `${O}/quizzes` }] },
    ])).nodes;
    const claims = jsonLdVisibleClaims(nodes);
    expect(claims.map((c) => c.where)).toEqual(['Article headline', 'breadcrumb', 'breadcrumb', 'FAQ question', 'FAQ answer', 'ItemList name', 'list item', 'navigation item']);
    const page = visibleText('<nav>Home / BTS Quiz / Quizzes</nav><h1>BTS Trivia - 113 facts</h1><h2>How many?</h2><p>There are <a href="/x">29</a> quizzes .</p><h2>Trending</h2><a>Quiz A</a>');
    expect(jsonLdMismatches(claims, page)).toEqual([]);
    expect(jsonLdMismatches(claims, page.replace('Quiz A', 'Quiz B')).map((c) => c.text)).toEqual(['Quiz A']);
  });

  it('collects descriptions and the strings worth a count check, never URLs', () => {
    const nodes = parseJsonLd(ld({ '@type': 'Dataset', name: 'Stats', description: '458 quizzes and 73.9K plays', url: `${O}/stats`, image: `${O}/x.png`, creator: { '@type': 'Organization', name: 'KpopQuiz' } })).nodes;
    expect(jsonLdDescriptions(nodes)).toEqual(['458 quizzes and 73.9K plays']);
    const s = jsonLdStrings(nodes);
    expect(s).toContain('458 quizzes and 73.9K plays');
    expect(s).not.toContain('https://');
    expect(s.match(/KpopQuiz/g)).toHaveLength(1);
  });
});

describe('findings baseline', () => {
  const f = (rule: string, where: string, detail: string) => ({ key: findingKey(rule, where, detail), message: `${rule} on ${where}` });

  it('builds and reads stable keys', () => {
    expect(findingKey('counts', '/groups', 'body: 93 groups')).toBe('counts|/groups|body: 93 groups');
    expect(keyWhere('host|https://www.kpopquiz.org/|serves 200')).toBe('https://www.kpopquiz.org/');
    expect(keyWhere('redirect|/battle?quiz=illit-quiz|not exact successor')).toBe('/battle?quiz=illit-quiz');
  });

  it('a finding fails only when the baseline does not list it', () => {
    const entries = [{ key: 'noindex|/live|noindex', reason: 'owner decision pending: noindex on purpose?' }];
    const r = applyBaseline([f('noindex', '/live', 'noindex'), f('noindex', '/community', 'noindex')], entries, new Set(['/live', '/community']));
    expect(r.fresh.map((x) => x.key)).toEqual(['noindex|/community|noindex']);
    expect(r.known.map((x) => [x.finding.key, x.reason])).toEqual([['noindex|/live|noindex', 'owner decision pending: noindex on purpose?']]);
    expect(r.fixed).toEqual([]);
  });

  it('an entry that no longer occurs on a graded page is fixed; on an ungraded page it is unchecked', () => {
    const entries = [
      { key: 'description|/articles|over 160', reason: 'owner decision pending: shorten it' },
      { key: 'title|/q/far-away|over 60', reason: 'owner decision pending: shorter title' },
    ];
    const r = applyBaseline([], entries, new Set(['/articles']));
    expect(r.fixed.map((e) => e.key)).toEqual(['description|/articles|over 160']);
    expect(r.unchecked.map((e) => e.key)).toEqual(['title|/q/far-away|over 60']);
  });

  it('a changed detail is a new finding (the wrong number moved, so it is looked at again)', () => {
    const entries = [{ key: 'counts|/groups|body: 93 groups', reason: 'count definition mismatch to settle' }];
    const r = applyBaseline([f('counts', '/groups', 'body: 94 groups')], entries, new Set(['/groups']));
    expect(r.fresh).toHaveLength(1);
    expect(r.fixed.map((e) => e.key)).toEqual(['counts|/groups|body: 93 groups']);
  });

  it('reads entries grouped per check type in families that share a reason', () => {
    const p = parseBaseline({
      _readme: ['ignored'],
      noindex: [{ reason: 'owner decision pending: noindex on purpose?', keys: ['noindex|/live|noindex', 'noindex|/community|noindex'] }],
      host: [{ reason: 'owner click pending: www redirect', keys: ['host|https://www.kpopquiz.org/|serves 200'] }],
    });
    expect(p.errors).toEqual([]);
    expect(p.entries.map((e) => e.key)).toEqual(['noindex|/live|noindex', 'noindex|/community|noindex', 'host|https://www.kpopquiz.org/|serves 200']);
    expect(p.entries[1]!.reason).toBe('owner decision pending: noindex on purpose?');
  });

  it('rejects families without a reason or keys, malformed keys, misfiled keys and duplicates', () => {
    expect(parseBaseline([]).errors).toEqual(['the baseline must be an object of check types']);
    const p = parseBaseline({
      noindex: [
        { reason: 'owner decision pending', keys: ['noindex|/live|noindex', 'noindex|/live|noindex', 'no-pipes', 'title|/x|over 60'] },
        { reason: '', keys: ['noindex|/a|noindex'] },
        { reason: 'owner decision pending', keys: [] },
      ],
      h1: 'not a list',
    });
    expect(p.entries.map((e) => e.key)).toEqual(['noindex|/live|noindex']);
    expect(p.errors).toHaveLength(6);
  });
});
