import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { COPY } from '@/copy/hub/h1';
import { DELETION_GRACE_DAYS, HANDOFF_LOG_DAYS, KEEP_QUIZZES_DEFAULT, leavableSites } from '@/lib/passport/deletion/policy';
import { PASSPORT_SECONDS, TX_COOKIE_NAMES } from '@/lib/passport/types';
import { NETWORK, REGISTRY } from '@/lib/site/registry';
import { SITE_IDS } from '@/lib/site/types';

import { HUB_EMAIL, ht, MIN_AGE } from './copy';
import { PRIVACY_NOTICE, PRIVACY_PAGE, PRIVACY_SECTIONS, signInItems } from './network-page';

import type { RecordedQuery } from '../test-recorder';

// Lot (d), H1: the final network privacy policy (owner's answers of 2026-10-24, docs/o1/briefs/H1-privacy.md). One text, the keys
// privacy.* of copy/hub/h1.ts; the page of the hub and of the anime build is the same markup. The numbers come from the code and the SQL
// (lib/passport/deletion/policy.test.ts pins them), the cookies from docs/o1/contracts/cookies.md.

vi.mock('next/cache', () => ({ unstable_cache: <T extends (...a: never[]) => unknown>(fn: T) => fn }));
vi.mock('@/lib/supabase/server', () => ({ createPublicReadClient: () => ({}), createServiceRoleClient: () => ({}) }));

const ROOT = join(__dirname, '../../../../../..');
const COOKIES = readFileSync(join(ROOT, 'docs/o1/contracts/cookies.md'), 'utf8');
const KEYS = Object.keys(COPY).filter((k) => k.startsWith('privacy.')) as (keyof typeof COPY)[];
const DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
const CONTROLLER = '[NOM OU SOCIÉTÉ, PAYS, ADRESSE POSTALE]';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

interface Env { site?: 'hub' | 'anime'; indexing?: '1' | ''; launch?: string }

/** The page of a build with this env, rendered; `text` is the markup as plain text (tags gone, entities decoded). */
async function render(env: Env = {}) {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', env.site ?? 'hub');
  if (env.indexing !== undefined) vi.stubEnv('NET_INDEXING', env.indexing);
  if (env.launch !== undefined) vi.stubEnv('NET_LAUNCH_DATE', env.launch);
  const page = await import('@/app/sites/[site]/privacy/page');
  const html = renderToStaticMarkup(page.default());
  const text = html
    .replace(/<\/?(?:a|span)\b[^>]*>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
  return { page, html, text };
}

const norm = (s: string): string => s.replace(/\s+/g, ' ');

describe('the keys', () => {
  it('are all on the page or in the notice, and none is missing from the lists', () => {
    const listed = new Set<string>([
      ...Object.values(PRIVACY_PAGE), ...PRIVACY_NOTICE, 'privacy.notice.link', 'privacy.notice.full',
      'privacy.account.google', 'privacy.account.discord', 'privacy.account.email', 'privacy.account.or',
      ...PRIVACY_SECTIONS.flatMap((s) => [s.title, ...s.blocks.flatMap((b) => (b.kind === 'p' ? [b.key] : b.kind === 'list' ? b.keys : []))]),
    ]);
    expect([...listed].sort()).toEqual([...KEYS].sort());
  });

  it('keep the plain voice: no dash, no emoji, every placeholder filled', () => {
    for (const k of KEYS) {
      expect(COPY[k], k).not.toMatch(DASHES);
      expect(COPY[k], k).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(ht(k, { date: '1 January 2027' }), k).not.toMatch(/[{}]/);
    }
  });

  it('write no site name, domain or number the registry or the code decides', () => {
    const copy = KEYS.map((k) => COPY[k]).join('\n');
    for (const s of Object.values(REGISTRY)) {
      expect(copy.includes(s.brand.name), s.brand.name).toBe(false);
      expect(copy.includes(s.domain), s.domain).toBe(false);
    }
    expect(copy).not.toMatch(/\b(?:10|60|90|7|15) (?:minutes|seconds|days)\b|under 15\b/);
  });
});

// Point 1: the date, the draft and the launch.
describe('point 1: closed is a draft, open is the policy', () => {
  it('closed: the draft banner, no date, noindex, nofollow', async () => {
    const { page, html, text } = await render({ indexing: '', launch: '2026-11-01' });
    expect(html).toContain('data-hub-draft');
    expect(html).toContain('<strong>Draft</strong>');
    expect(text).toContain(ht('privacy.draftBanner'));
    expect(text).not.toContain('In force since');
    expect(page.generateMetadata().robots).toEqual({ index: false, follow: false });
    expect(html.match(/<h1\b/g)).toHaveLength(1);
  });

  it('closed with no launch date at all: still a draft, and the metadata does not fail', async () => {
    const { page } = await render({ indexing: '' });
    expect(() => page.generateMetadata()).not.toThrow();
  });

  it('open: no banner, the date of NET_LAUNCH_DATE, indexable, canonical on the hub', async () => {
    const { page, html, text } = await render({ indexing: '1', launch: '2026-11-01' });
    expect(html).not.toContain('data-hub-draft');
    expect(text).not.toContain('Draft for the owner');
    expect(text).toContain('In force since 1 November 2026.');
    const meta = page.generateMetadata();
    expect(meta.robots).toEqual({ index: true, follow: true });
    expect(meta.alternates?.canonical).toBe(`${NETWORK.url}/privacy`);
    expect(meta.title).toBe(ht('privacy.metaTitle'));
    expect(meta.description).toBe(ht('privacy.metaDescription'));
  });

  it('open on the anime build: the same', async () => {
    const { page, html, text } = await render({ site: 'anime', indexing: '1', launch: '2026-11-01' });
    expect(html).not.toContain('data-hub-draft');
    expect(text).toContain('In force since 1 November 2026.');
    expect(page.generateMetadata().robots).toEqual({ index: true, follow: true });
  });

  it('open with a missing or wrong date: the build fails with a clear message', async () => {
    for (const launch of [undefined, '', 'tomorrow', '2026-02-30', '24/10/2026', '2026-1-5']) {
      const { page } = await render({ indexing: '1', ...(launch === undefined ? {} : { launch }) });
      expect(() => page.generateMetadata(), String(launch)).toThrow(/NET_LAUNCH_DATE is missing or not a date[\s\S]*YYYY-MM-DD/);
    }
  });

  it('reads and prints a date as the calendar says', async () => {
    vi.resetModules();
    const m = await import('@/lib/site/indexing');
    expect(m.parseLaunchDate('2026-10-24')).toBe('2026-10-24');
    expect(m.parseLaunchDate(' 2026-10-24 ')).toBe('2026-10-24');
    expect(m.parseLaunchDate('2028-02-29')).toBe('2028-02-29');
    expect(m.parseLaunchDate('2027-02-29')).toBeNull();
    expect(m.formatLaunchDate('2026-10-24')).toBe('24 October 2026');
    expect(m.formatLaunchDate('2026-01-05')).toBe('5 January 2026');
    expect(m.formatLaunchDate(undefined)).toBeNull();
    expect(m.launchDateOrThrow(false, undefined)).toBeNull();
    expect(m.launchDateOrThrow(true, '2026-10-24')).toBe('2026-10-24');
  });

  async function hubSitemap(indexing: '1' | '', launch?: string): Promise<{ path: string; lastModified?: Date | undefined }[]> {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'hub');
    vi.stubEnv('NET_INDEXING', indexing);
    if (launch !== undefined) vi.stubEnv('NET_LAUNCH_DATE', launch);
    const { recordingDb } = await import('../test-recorder');
    const { sitemapEntriesFor } = await import('../root-files');
    const { REGISTRY: reg } = await import('../registry');
    const db = recordingDb();
    const entries = await sitemapEntriesFor(reg.hub, db);
    expect(db.queries as RecordedQuery[]).toHaveLength(0);
    return entries;
  }

  it('the sitemap of the hub: not listed while closed, listed with the launch date once open', async () => {
    expect((await hubSitemap('', '2026-11-01')).map((e) => e.path)).toEqual(['/']);
    const open = await hubSitemap('1', '2026-11-01');
    expect(open.map((e) => e.path)).toEqual(['/', '/privacy']);
    expect(open[1]!.lastModified?.toISOString()).toBe('2026-11-01T00:00:00.000Z');
  });
});

// Point 2: the controller, one key.
describe('point 2: the controller', () => {
  it('prints the placeholder line exactly, from the one key privacy.controller', async () => {
    expect(COPY['privacy.controller']).toBe(CONTROLLER);
    expect(KEYS.filter((k) => COPY[k].includes('NOM OU SOCI'))).toEqual(['privacy.controller']);
    const { text } = await render();
    expect(text).toContain(`${ht('privacy.who.p3')} ${CONTROLLER}`);
    expect(text.split(CONTROLLER)).toHaveLength(2);
  });
});

// Point 3: the three sites by name, origins from the registry.
describe('point 3: the three sites', () => {
  it('names KpopQuiz, OtakuQuiz and FanQuiz with their domains, from the registry', async () => {
    const { text } = await render();
    const names = SITE_IDS.map((id) => `${REGISTRY[id].brand.name} (${REGISTRY[id].domain})`);
    expect(names).toEqual(['KpopQuiz (kpopquiz.org)', 'OtakuQuiz (otakuquiz.org)', 'FanQuiz (fanquiz.org)']);
    expect(text).toContain(`three fan quiz sites: ${names[0]}, ${names[1]} and ${names[2]}.`);
  });
});

// Point 4: sign-in methods.
describe('point 4: how you sign in, per site, from the registry', () => {
  it('KpopQuiz: Google, Discord, email link; OtakuQuiz and FanQuiz: Google, email link', async () => {
    const items = signInItems();
    expect(items.map((i) => i.text)).toEqual([
      'KpopQuiz: Google, Discord or an email link',
      'OtakuQuiz: Google or an email link',
      'FanQuiz: Google or an email link',
    ]);
    const { text } = await render();
    for (const i of items) expect(text).toContain(i.text);
    for (const id of SITE_IDS) {
      const providers = REGISTRY[id].auth.providers;
      const line = items.find((i) => i.id === id)!.text;
      expect(line.includes('Discord'), id).toBe(providers.includes('discord'));
      expect(line.includes('Google'), id).toBe(providers.includes('google'));
      expect(line.includes('email link'), id).toBe(providers.includes('email'));
    }
  });
});

// Point 5: the shared block line.
describe('point 5: the sites you joined line', () => {
  it('reads the same key on the home and on the privacy page', () => {
    expect(COPY['shares.seesSites']).toBe('The sites you joined, only if you choose to show them');
    const src = (rel: string): string => readFileSync(join(__dirname, '../../..', rel), 'utf8');
    expect(src('lib/site/hub/network-page.ts')).toContain("'shares.seesSites'");
    expect(src('components/hub/hub-shares.tsx')).toContain('SHARES_SEES');
    expect(src('components/hub/hub-privacy.tsx')).toContain('<HubShares />');
    expect(src('app/sites/[site]/home-hub.tsx')).toContain('<HubShares />');
  });
  it('is printed on the page', async () => {
    const { text } = await render();
    expect(text).toContain('The sites you joined, only if you choose to show them');
  });
});

// Point 6: the jump values, from the code.
describe('point 6: the jump values', () => {
  it('prints the ticket, the code, the log and the hashed address from the constants', async () => {
    const { text } = await render();
    expect(PASSPORT_SECONDS.ticket).toBe(600);
    expect(PASSPORT_SECONDS.code).toBe(60);
    expect(HANDOFF_LOG_DAYS).toBe(90);
    expect(text).toContain(`a ticket that lasts ${PASSPORT_SECONDS.ticket / 60} minutes`);
    expect(text).toContain(`valid for ${PASSPORT_SECONDS.code} seconds`);
    expect(text).toContain(`delete the log after ${HANDOFF_LOG_DAYS} days`);
    expect(text).toContain('a hashed IP address');
  });
});

// Point 7, 8: KpopQuiz profile, audience measurement.
describe('points 7 and 8', () => {
  it('says the bio, banner and favourite groups of KpopQuiz belong to the account profile', async () => {
    const { text } = await render();
    expect(text).toContain('On KpopQuiz, your bio, banner and favourite groups belong to your account profile. The other sites do not show them.');
  });
  it('names Vercel Web Analytics: no cookie, anonymous events, no personal data, no advertising', async () => {
    const { text } = await render();
    expect(text).toContain('Vercel Web Analytics');
    expect(text).toContain('sets no cookie');
    expect(text).toContain('keeps no personal data');
    expect(text).toContain('anonymous events');
    expect(text).toContain('We show no advertising');
  });
});

// Points 9 and 10: cookies, both ways.
describe('points 9 and 10: the cookies of cookies.md and the page match', () => {
  /** The names of the first column of the tables of sections 6 and 7, the reserved ones left out (never set in the run). */
  function contractNames(): string[] {
    const sections = [COOKIES.split('## 6. ')[1]!.split('\n## ')[0]!, COOKIES.split('## 7. ')[1]!.split('\n## ')[0]!];
    const names: string[] = [];
    for (const sec of sections) {
      for (const line of sec.split('\n')) {
        if (!line.startsWith('| `')) continue;
        const cells = line.split('|').map((c) => c.trim());
        if (/reserved/i.test(cells.join(' '))) continue;
        names.push(...[...cells[1]!.matchAll(/`([^`]+)`/g)].map((m) => m[1]!));
      }
    }
    return names;
  }

  const LIST = PRIVACY_SECTIONS.find((s) => s.title === 'privacy.cookies.title')!.blocks.flatMap((b) => (b.kind === 'list' ? b.keys : []));
  /** The name a list item starts with: up to the first " (" or ":". */
  const pageName = (text: string): string => /^(.+?)(?: \(|:)/.exec(text)![1]!;

  it('reads the contract', () => {
    expect(contractNames().sort()).toEqual([
      '__Host-pp_tx', 'anime.spoiler.v1', 'fq.net.caps.v1', 'fq.net.via', 'kq_sl', 'nq_anon', 'pp_tx', 'preferred_locale',
      'sb-<project ref>-auth-token', 'theme', 'verse_nav', 'world',
    ]);
    expect(TX_COOKIE_NAMES).toEqual({ https: '__Host-pp_tx', devHttp: 'pp_tx' });
  });

  it('every cookie of cookies.md is on the page', async () => {
    const { text } = await render();
    for (const n of contractNames()) expect(text.includes(n), `${n} missing from the page`).toBe(true);
  });

  it('every cookie the page lists is in cookies.md', async () => {
    const known = new Set(contractNames());
    const listed = LIST.map((k) => pageName(COPY[k]));
    expect(listed).toHaveLength(11);
    for (const n of listed) expect(known.has(n), `${n} is not in cookies.md`).toBe(true);
    expect(new Set(listed).size).toBe(listed.length);
    // the reserved cookie is not listed: it is never set
    expect(KEYS.map((k) => COPY[k]).join(' ')).not.toContain('pp_seeded');
  });

  it('says it uses no advertising, tracking or third party analytics cookie', () => {
    expect(COPY['privacy.cookies.intro']).toContain('no advertising cookies, no tracking cookies and no third party analytics cookies');
  });
});

// Point 11: services and hosting.
describe('point 11: services and hosting', () => {
  it('names Resend, the EU hosting and the standard contractual clauses', async () => {
    const { text } = await render();
    expect(text).toContain('Resend: sending the sign-in emails');
    expect(text).toContain('Supabase in Ireland and Vercel servers in Dublin');
    expect(text).toContain('standard contractual clauses of the European Commission');
    expect(text).toContain('Discord: sign-in on KpopQuiz only');
    expect(text).toContain('We do not sell your data.');
  });
});

// Points 12 and 13: deletion, pinned to the code (policy.test.ts pins the constants to the SQL).
describe('points 12 and 13: deleting', () => {
  it('says the grace days and the default for the quizzes that the code says', async () => {
    const { text } = await render();
    expect(KEEP_QUIZZES_DEFAULT).toBe(true);
    expect(text).toContain(`Your data is deleted after ${DELETION_GRACE_DAYS} days, and you can cancel before then.`);
    expect(text).toContain('The quizzes you published are kept under "deleted user" unless you ask to remove them too.');
    expect(text).toContain(`signed in within the last ${PASSPORT_SECONDS.freshSignIn / 60} minutes`);
  });
  it('lists the sites you can leave from the code, and not KpopQuiz', async () => {
    const { text } = await render();
    const leave = leavableSites().map((id) => REGISTRY[id].brand.name);
    expect(leave).toEqual(['OtakuQuiz']);
    expect(text).toContain(`You can leave ${leave.join(' and ')}.`);
    expect(text).toContain('you cannot leave KpopQuiz');
  });
  it('says how to delete a KpopQuiz only account', async () => {
    const { text } = await render();
    expect(text).toContain('If you only have a KpopQuiz account, open KpopQuiz Settings and choose "Delete my account".');
  });
});

// Points 14 to 18.
describe('points 14 to 18', () => {
  it('rights: access, rectification, erasure, restriction, objection, portability, the CNIL, one month', async () => {
    const { text } = await render();
    for (const w of ['access your data', 'correct it', 'erase it', 'restrict how we use it', 'object to its use', 'portable form', 'complain to the CNIL', 'We answer within one month']) {
      expect(text, w).toContain(w);
    }
  });
  it('minimum age 15, from the one constant', async () => {
    const { text } = await render();
    expect(MIN_AGE).toBe(15);
    expect(text).toContain('not for children under 15');
    expect(text).not.toMatch(/under 13/);
  });
  it('contact: contact@fanquiz.org, as a mailto link', async () => {
    const { html, text } = await render();
    expect(HUB_EMAIL).toBe('contact@fanquiz.org');
    expect(html).toContain('href="mailto:contact@fanquiz.org"');
    expect(text).toContain('Questions about privacy, or a request about your data: contact@fanquiz.org.');
  });
  it('retention, export, French law, changes', async () => {
    const { text } = await render();
    expect(text).toContain('We keep your play history as long as your account exists.');
    expect(text).toContain('Write to contact@fanquiz.org and we send you an export.');
    expect(text).toContain('French law applies to this policy.');
    expect(text).toContain('We tell you about important changes with a banner and by email.');
  });
  it('the anime build serves the same markup as the hub', async () => {
    const hub = await render({ site: 'hub', indexing: '1', launch: '2026-11-01' });
    const anime = await render({ site: 'anime', indexing: '1', launch: '2026-11-01' });
    expect(norm(anime.html).replace(/anime-h1-/g, 'hub-h1-')).toBe(norm(hub.html));
    expect(anime.html).toContain('anime-h1-policy');
    expect(anime.html).not.toContain('hub-h1-');
    expect(hub.html).not.toContain('anime-h1-');
  });
});

describe('the wiring', () => {
  it('NET_LAUNCH_DATE is registered beside NET_INDEXING, apart from the flag table', async () => {
    const { O1_VALUE_ENVS } = await import('@/lib/site/indexing');
    const { O1_FLAGS } = await import('@/lib/site/registry');
    expect(O1_VALUE_ENVS).toEqual([{ name: 'NET_LAUNCH_DATE', scope: 'server', lane: 'L1' }]);
    expect(O1_FLAGS.map((f) => f.name)).not.toContain('NET_LAUNCH_DATE');
    expect(O1_FLAGS.map((f) => f.name)).toContain('NET_INDEXING');
  });

  it('the anime sheet repeats only rules the hub sheet has (the anime build reads only its own folder)', () => {
    const styles = join(__dirname, '../../../styles/sites');
    const hub = readFileSync(join(styles, 'hub/h1.css'), 'utf8').split('\n');
    const anime = readFileSync(join(styles, 'anime/h1.css'), 'utf8').split('\n').filter((l) => l.startsWith('html.ux-v1[data-site="anime"] .'));
    expect(anime.length).toBeGreaterThan(8);
    for (const l of anime) expect(hub, l.slice(0, 70)).toContain(l.replace('data-site="anime"', 'data-site="hub"').replace(/anime-h1-/g, 'hub-h1-').replace(/--anime-gap/g, '--hub-gap'));
  });
});
