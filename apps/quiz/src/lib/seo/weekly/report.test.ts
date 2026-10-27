import { describe, expect, it } from 'vitest';

import { buildReport, cannibalisation, fr, MAX_LINES, newQueriesWithoutTarget, pageDrops, pathOf, refreshCandidates } from './report';
import { gatherWeeklyInput, linkSummary, parseNightly, githubRepo, checkLinkedUrls } from './report-data';
import { CALENDAR_MD, memoryWeeklyReader, SAMPLE_LINKS, SAMPLE_ROWS, TARGETS_MD } from './fixtures';
import { parseTargets } from './targets';

import type { EngineWeeks, WeeklyInput } from './report';
import type { FetchLike } from './google-auth';

const targets = parseTargets(TARGETS_MD);

const engine = (over: Partial<EngineWeeks>): EngineWeeks => ({ engine: 'google', status: 'ok', current: null, previous: null, seenBefore: null, ...over });

const baseInput = (over: Partial<WeeklyInput> = {}): WeeklyInput => ({
  today: '2026-10-12',
  engines: [engine({ status: 'no_key' }), engine({ engine: 'bing', status: 'no_key' })],
  links: { status: 'no_key', totalDomains: 0, newDomains: [], firstPull: false },
  linkedUrlProblems: null,
  nightly: { status: 'success' },
  indexnowAlerts: 0,
  targets: null,
  calendar: null,
  partnerLog: false,
  siteUrl: 'https://kpopquiz.org',
  ...over,
});

// Real e-mail clients and the owner's rule: no em dash or en dash anywhere.
const DASHES = /[\u2013\u2014]/;

describe('helpers', () => {
  it('pathOf folds a URL to its path', () => {
    expect(pathOf('https://kpopquiz.org/bts-quiz/?x=1#games')).toBe('/bts-quiz');
    expect(pathOf('https://kpopquiz.org/')).toBe('/');
    expect(pathOf('/q/abc/')).toBe('/q/abc');
  });

  it('fr writes thousands with a space', () => {
    expect(fr(1234567)).toBe('1 234 567');
    expect(fr(999)).toBe('999');
  });
});

describe('red line: top-20 page down more than 30 %', () => {
  const e = engine({
    current: { week: '2026-10-05', pages: [{ page: 'https://kpopquiz.org/a', clicks: 13, impressions: 0 }, { page: 'https://kpopquiz.org/b', clicks: 15, impressions: 0 }, { page: 'https://kpopquiz.org/c', clicks: 1, impressions: 0 }], queries: [], queryPages: [] },
    previous: { week: '2026-09-28', pages: [{ page: 'https://kpopquiz.org/a', clicks: 20, impressions: 0 }, { page: 'https://kpopquiz.org/b', clicks: 20, impressions: 0 }, { page: 'https://kpopquiz.org/c', clicks: 19, impressions: 0 }], queries: [] },
  });

  it('flags a fall of more than 30 % from 20 clicks, not a fall of exactly 25 %, nor a page under the floor', () => {
    expect(pageDrops(e)).toEqual([{ path: '/a', prev: 20, cur: 13, pct: 35 }]);
  });
});

describe('cannibalisation and new queries', () => {
  const cur = {
    week: '2026-10-05',
    pages: [],
    queries: [{ query: 'bts quiz', clicks: 10, impressions: 300 }, { query: 'kpop lightstick names', clicks: 1, impressions: 80 }, { query: 'stray kids test', clicks: 1, impressions: 90 }, { query: 'old query', clicks: 0, impressions: 200 }],
    queryPages: [
      { query: 'bts quiz', page: 'https://kpopquiz.org/bts-quiz', clicks: 9, impressions: 250 },
      { query: 'bts quiz', page: 'https://kpopquiz.org/q/bts-quiz-hard', clicks: 1, impressions: 40 },
      { query: 'bts quiz', page: 'https://kpopquiz.org/q/tiny', clicks: 0, impressions: 10 },
      { query: 'kpop lightstick names', page: 'https://kpopquiz.org/trivia', clicks: 0, impressions: 40 },
      { query: 'kpop lightstick names', page: 'https://kpopquiz.org/', clicks: 0, impressions: 40 },
    ],
  };

  it('two URLs over 10 impressions and 10 % on a cluster query', () => {
    expect(cannibalisation(engine({ current: cur }), targets)).toEqual([{ query: 'bts quiz', paths: ['/bts-quiz', '/q/bts-quiz-hard'], impressions: 300, engine: 'google' }]);
  });

  it('new queries: unseen in the 4 weeks before, no cluster, 30 impressions or more', () => {
    const e = engine({ current: cur, seenBefore: new Set(['old query']) });
    expect(newQueriesWithoutTarget(e, targets)).toEqual([{ query: 'kpop lightstick names', impressions: 80, engine: 'google' }]);
  });
});

describe('refresh candidates', () => {
  it('ranks pages by clicks lost over all engines', () => {
    const g = engine({ current: { week: 'w', pages: [{ page: '/a', clicks: 5, impressions: 0 }], queries: [], queryPages: [] }, previous: { week: 'v', pages: [{ page: '/a', clicks: 10, impressions: 0 }, { page: '/b', clicks: 2, impressions: 0 }], queries: [] } });
    const b = engine({ engine: 'bing', current: { week: 'w', pages: [{ page: '/b', clicks: 0, impressions: 0 }], queries: [], queryPages: [] }, previous: { week: 'v', pages: [{ page: '/b', clicks: 30, impressions: 0 }], queries: [] } });
    expect(refreshCandidates([g, b])).toEqual([{ path: '/b', loss: 32 }, { path: '/a', loss: 5 }]);
  });
});

describe('buildReport', () => {
  it('with nothing connected: a short, honest e-mail', () => {
    const m = buildReport(baseInput({ indexnowAlerts: null, nightly: { status: 'unknown' } }));
    expect(m.redCount).toBe(0);
    expect(m.subject).toBe('kpopquiz.org SEO, semaine du 5 oct.: rien d\'urgent');
    const text = m.lines.map((l) => l.text);
    expect(text[0]).toBe('Semaine du 5 oct.: pas encore de données de recherche.');
    expect(text).toContain('Lignes rouges: aucune. Rien d\'urgent cette semaine.');
    expect(text.find((t) => t.startsWith('Non branché:'))).toContain('Search Console (clé absente)');
    expect(text.find((t) => t.startsWith('Non branché:'))).toContain('TARGETS.md');
    expect(text.find((t) => t.startsWith('Non branché:'))).toContain('CALENDAR.md');
    expect(text.at(-1)).toBe('Détail et import Bing AI du mois: https://kpopquiz.org/admin/seo/import');
    expect(text.some((t) => t.startsWith('Cannibalisation'))).toBe(false);
  });

  it('red lines: nightly, IndexNow, linked URLs; never more than 15 lines', () => {
    const m = buildReport(baseInput({
      nightly: { status: 'failure', date: '2026-10-11', url: 'https://github.com/o/r/actions/runs/1' },
      indexnowAlerts: 2,
      linkedUrlProblems: [{ url: 'https://kpopquiz.org/q/old-slug', status: '404' }],
    }));
    expect(m.redCount).toBe(3);
    expect(m.subject).toContain('3 lignes rouges');
    const red = m.lines.filter((l) => l.red).map((l) => l.text);
    expect(red).toEqual([
      'Rouge: contrôles de nuit en échec (11 oct.): https://github.com/o/r/actions/runs/1',
      'Rouge: IndexNow, 2 alertes en 7 jours: https://kpopquiz.org/admin/seo/indexnow',
      'Rouge: URL qui ont reçu un lien, en erreur: /q/old-slug (404)',
    ]);
    expect(m.lines.length).toBeLessThanOrEqual(MAX_LINES);
  });

  it('a stale nightly run is a red line too', () => {
    const m = buildReport(baseInput({ nightly: { status: 'stale', date: '2026-10-01' } }));
    expect(m.lines.filter((l) => l.red).map((l) => l.text)).toEqual(['Rouge: aucun contrôle de nuit depuis le 1 oct.']);
  });

  it('end to end from sample rows: every section, at most 15 lines, no dashes', async () => {
    const fake: FetchLike = async (url) => {
      if (url.startsWith('https://api.github.com/')) return { status: 200, ok: true, json: async () => ({ workflow_runs: [{ conclusion: 'success', created_at: '2026-10-12T04:40:00Z', html_url: 'https://github.com/o/r/actions/runs/2' }] }), text: async () => '' };
      if (url.endsWith('/q/old-slug')) return { status: 404, ok: false, json: async () => ({}), text: async () => '' };
      return { status: 200, ok: true, json: async () => ({}), text: async () => '' };
    };
    const input = await gatherWeeklyInput({
      reader: memoryWeeklyReader(SAMPLE_ROWS, SAMPLE_LINKS, [], 0),
      env: { GSC_SERVICE_ACCOUNT_JSON: '{}', BING_WEBMASTER_API_KEY: 'k', SEO_GITHUB_REPO: 'o/r' },
      today: '2026-10-12',
      fetchImpl: fake,
      readTargets: async () => TARGETS_MD,
      readCalendar: async () => CALENDAR_MD,
    });
    const m = buildReport(input);
    const text = m.lines.map((l) => l.text);
    expect(m.lines.length).toBeLessThanOrEqual(MAX_LINES);
    expect(m.subject).toBe('kpopquiz.org SEO, semaine du 5 oct.: 2 lignes rouges');
    expect(text).toEqual([
      'Google, semaine du 5 oct.: 80 clics (-16 %) · Bing, semaine du 5 oct.: 640 clics (+5 %)',
      'Rouge: URL qui ont reçu un lien, en erreur: /q/old-slug (404)',
      'Rouge: page du top 20 en baisse de plus de 30 %: /bts-quiz -43 % sur Google (70 -> 40 clics)',
      'Hausses (clics): "bts quiz" +40 (Bing), "kpop games" +18 (Bing), "stray kids quiz" +7 (Google)',
      'Baisses (clics): "quiz bts" -30 (Bing), "bts quiz" -24 (Google)',
      'Cannibalisation: "bts quiz" sur /bts-quiz et /q/bts-quiz-hard (Google)',
      'Requêtes nouvelles sans page cible: "kpop lightstick names" 75 impr. (Google)',
      'Liens (Bing): 1 nouveau domaine: blog.example.org. Intégrations: aucun journal partner= pour l\'instant.',
      'À rafraîchir (clics perdus): /bts-quiz (-30)',
      'Dans les 14 jours: 26 oct. ILLIT, mini album',
      'Détail et import Bing AI du mois: https://kpopquiz.org/admin/seo/import',
    ]);
    expect(text.some((t) => DASHES.test(t))).toBe(false);
  });
});

describe('report data helpers', () => {
  it('parseNightly: success, failure, stale, unreadable', () => {
    const run = (conclusion: string, created: string) => ({ workflow_runs: [{ conclusion, created_at: created, html_url: 'https://github.com/o/r/actions/runs/9' }] });
    expect(parseNightly(run('success', '2026-10-12T04:40:00Z'), '2026-10-12').status).toBe('success');
    expect(parseNightly(run('failure', '2026-10-12T04:40:00Z'), '2026-10-12')).toEqual({ status: 'failure', date: '2026-10-12', url: 'https://github.com/o/r/actions/runs/9' });
    expect(parseNightly(run('success', '2026-10-01T04:40:00Z'), '2026-10-12').status).toBe('stale');
    expect(parseNightly({ message: 'API rate limit exceeded' }, '2026-10-12').status).toBe('unknown');
  });

  it('githubRepo: explicit, else what Vercel deploys from', () => {
    expect(githubRepo({ SEO_GITHUB_REPO: 'a/b' })).toBe('a/b');
    expect(githubRepo({ VERCEL_GIT_REPO_OWNER: 'o', VERCEL_GIT_REPO_SLUG: 'r' })).toBe('o/r');
    expect(githubRepo({ SEO_GITHUB_REPO: 'not a repo' })).toBeNull();
  });

  it('linkSummary: new domains are the ones first seen on the latest pull', () => {
    expect(linkSummary(SAMPLE_LINKS)).toEqual({ status: 'ok', totalDomains: 2, newDomains: ['blog.example.org'], firstPull: false });
    expect(linkSummary([SAMPLE_LINKS[0]!])).toEqual({ status: 'ok', totalDomains: 1, newDomains: ['example.com'], firstPull: true });
  });

  it('checkLinkedUrls: only our host, 200/301/308 fine, anything else listed', async () => {
    const calls: string[] = [];
    const fake: FetchLike = async (url, init) => {
      calls.push(url);
      expect(init?.redirect).toBe('manual');
      expect(init?.headers?.['User-Agent']).toBe('Mozilla/5.0');
      const status = url.endsWith('/gone') ? 410 : url.endsWith('/moved') ? 301 : 200;
      return { status, ok: status === 200, json: async () => ({}), text: async () => '' };
    };
    const out = await checkLinkedUrls(['https://kpopquiz.org/ok', 'https://kpopquiz.org/gone', 'https://www.kpopquiz.org/moved', 'https://other.example.com/x'], fake);
    expect(out).toEqual([{ url: 'https://kpopquiz.org/gone', status: '410' }]);
    expect(calls).toHaveLength(3);
  });
});
