// Run O1, lot (e), lane B7: the branded emails (apis.md 3.4, copy-keys.md 1 and 3, the Send Email Hook).
//  - kpop: byte diff 0 against the text Supabase Auth sends today, for every action, directly and through the hook;
//  - anime and hub: their own brand, links to their own /auth/confirm, the keys of anime.b7 and hub.b7, no K-pop on anime;
//  - the Edge Function files: render.ts is a byte copy, the copy files and the brands equal the app's.
import { createHmac, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { COPY as ANIME_COPY } from '@/copy/anime/b7';
import { COPY as HUB_COPY } from '@/copy/hub/b7';
import { NETWORK, REGISTRY } from '@/lib/site/registry';

import { sendDeletionNotice } from './notice';
import {
  confirmLink, copyKeysFor, handleHook, kindForAction, nextFromRedirect, parseOrigins, renderEmail, renderKpop, siteFromRedirect,
  verifyLink, verifyWebhook,
} from './render';

import type { HookDeps, MailBrand, MailKind, MailSite, OutgoingMail } from './render';
// The Edge Function's own files (it cannot import from apps/quiz): compared here, never imported by the app.
import { BRANDS as EDGE_BRANDS } from '../../../../../../supabase/functions/send-email/brands';
import { COPY as EDGE_ANIME } from '../../../../../../supabase/functions/send-email/copy/anime';
import { COPY as EDGE_HUB } from '../../../../../../supabase/functions/send-email/copy/hub';

const EDGE_DIR = fileURLToPath(new URL('../../../../../../supabase/functions/send-email/', import.meta.url));
const APP_RENDER = fileURLToPath(new URL('./render.ts', import.meta.url));

const BRANDS = EDGE_BRANDS as Readonly<Record<MailSite, MailBrand>>;
const API = 'https://project.supabase.example';

// Today's kpopquiz.org text: the default Supabase Auth templates, written out here on purpose (not read from render.ts).
const TODAY = {
  signup: {
    subject: 'Confirm Your Signup',
    html: '<h2>Confirm your signup</h2>\n\n<p>Follow this link to confirm your user:</p>\n<p><a href="{url}">Confirm your mail</a></p>',
  },
  magiclink: {
    subject: 'Your Magic Link',
    html: '<h2>Magic Link</h2>\n\n<p>Follow this link to login:</p>\n<p><a href="{url}">Log In</a></p>',
  },
  recovery: {
    subject: 'Reset Your Password',
    html: '<h2>Reset Password</h2>\n\n<p>Follow this link to reset the password for your user:</p>\n<p><a href="{url}">Reset Password</a></p>',
  },
  invite: {
    subject: 'You have been invited',
    html: '<h2>You have been invited</h2>\n\n<p>You have been invited to create a user on https://kpopquiz.org. Follow this link to accept the invite:</p>\n<p><a href="{url}">Accept the invite</a></p>',
  },
  email_change: {
    subject: 'Confirm Email Change',
    html: '<h2>Confirm Change of Email</h2>\n\n<p>Follow this link to confirm the update of your email from old@example.test to new@example.test:</p>\n<p><a href="{url}">Change Email</a></p>',
  },
  reauthentication: {
    subject: 'Confirm reauthentication',
    html: '<h2>Confirm reauthentication</h2>\n\n<p>Enter the code: 123456</p>',
  },
} as const;

const KPOP_URL = `${API}/auth/v1/verify?token=hash-1&type=ACTION&redirect_to=https%3A%2F%2Fkpopquiz.org%2Fauth%2Fcallback`;

describe('kpop: today bytes', () => {
  it('renderKpop equals the default template text for every action (byte diff 0)', () => {
    for (const [action, t] of Object.entries(TODAY)) {
      const url = KPOP_URL.replace('ACTION', action);
      const out = renderKpop(action as keyof typeof TODAY, {
        confirmationUrl: url, email: 'old@example.test', newEmail: 'new@example.test', token: '123456', siteUrl: 'https://kpopquiz.org',
      });
      expect(out, action).not.toBeNull();
      expect(out!.subject).toBe(t.subject);
      expect(out!.html).toBe(t.html.replace('{url}', url));
      expect(out!.text).toBe('');
    }
  });

  it('the email OTP action renders as the magic link, an unknown action as nothing', () => {
    const v = { confirmationUrl: 'u', email: 'e', newEmail: 'n', token: 't', siteUrl: 's' };
    expect(renderKpop('email', v)).toEqual(renderKpop('magiclink', v));
    expect(renderKpop('nope' as 'email', v)).toBeNull();
  });

  it('the kpop link is the Supabase verify URL (what {{ .ConfirmationURL }} was), redirect encoded', () => {
    expect(verifyLink(API, 'hash-1', 'magiclink', 'https://kpopquiz.org/auth/callback'))
      .toBe(`${API}/auth/v1/verify?token=hash-1&type=magiclink&redirect_to=https%3A%2F%2Fkpopquiz.org%2Fauth%2Fcallback`);
    expect(verifyLink(API, 'hash-1', 'signup', null)).toBe(`${API}/auth/v1/verify?token=hash-1&type=signup`);
  });
});

describe('anime and hub renderers', () => {
  const kinds: MailKind[] = ['magicLink', 'signup', 'emailChange'];

  for (const site of ['anime', 'hub'] as const) {
    const copy = site === 'anime' ? ANIME_COPY : HUB_COPY;
    const brand = BRANDS[site];

    it(`${site}: link emails carry the brand, the button and the footer, and link to the site's /auth/confirm`, () => {
      for (const kind of kinds) {
        const link = `${brand.url}/auth/confirm?token_hash=abc&type=magiclink&next=%2F`;
        const out = renderEmail({ kind, brand, copy, link });
        expect(out.subject).toContain(brand.name);
        expect(out.html).toContain(brand.name);
        expect(out.html).toContain(`href="${link.replace(/&/g, '&amp;')}"`);
        expect(out.html).toContain(`${brand.url}/privacy`);
        expect(out.text).toContain(link);
        expect(out.html).not.toMatch(/\{[a-z]+\}/);
        if (site === 'anime') expect(out.html + out.subject + out.text).not.toMatch(/k-?pop/i);
        else expect(out.html).not.toContain('OtakuQuiz');
      }
    });

    it(`${site}: the rabbit of the network stands before the name, from the site's own address`, () => {
      const rabbit = `<img src="${brand.url}/mascot/mascot-default.png" width="28" height="28" alt="" style="vertical-align:middle;border:0;margin-right:8px">`;
      for (const kind of kinds) {
        const out = renderEmail({ kind, brand, copy, link: `${brand.url}/auth/confirm?token_hash=abc&type=magiclink&next=%2F` });
        expect(out.html).toContain(`color:${brand.accent}">${rabbit}${brand.name}</td></tr>`);
        expect(out.html.split('mascot-default.png')).toHaveLength(2);
        expect(out.text).not.toContain('mascot');
      }
    });

    it(`${site}: reauth shows the code and no link`, () => {
      const out = renderEmail({ kind: 'reauth', brand, copy, code: '654321' });
      expect(out.html).toContain('654321');
      expect(out.html).not.toContain('<a href="https://' + brand.domain + '/auth');
      expect(out.subject).toContain(brand.name);
    });

    it(`${site}: every value is escaped`, () => {
      const out = renderEmail({ kind: 'magicLink', brand, copy, link: 'https://x.test/?a=1&b="2"<script>' });
      expect(out.html).toContain('a=1&amp;b=&quot;2&quot;&lt;script&gt;');
      expect(out.html).not.toContain('<script>');
    });

    it(`${site}: a missing link, code or copy key throws instead of sending half an email`, () => {
      expect(() => renderEmail({ kind: 'magicLink', brand, copy })).toThrow();
      expect(() => renderEmail({ kind: 'reauth', brand, copy })).toThrow();
      expect(() => renderEmail({ kind: 'signup', brand, copy: {}, link: 'https://x.test' })).toThrow();
    });
  }

  it('the hub deletion notice is neutral: a date and a cancel link, no name and no list of data', () => {
    const out = renderEmail({ kind: 'deletionScheduled', brand: BRANDS.hub, copy: HUB_COPY, link: 'https://fandomverse.org/settings', date: '2026-10-28' });
    expect(out.subject).toBe('Your FandomVerse passport will be deleted');
    expect(out.html).toContain('2026-10-28');
    expect(out.html).toContain('href="https://fandomverse.org/settings"');
    expect(out.html).toContain('Cancel the deletion');
    expect(() => renderEmail({ kind: 'deletionScheduled', brand: BRANDS.anime, copy: ANIME_COPY, link: 'x', date: 'd' })).toThrow();
  });

  it('kpop is never rendered by renderEmail', () => {
    expect(() => renderEmail({ kind: 'magicLink', brand: BRANDS.kpop, copy: ANIME_COPY, link: 'x' })).toThrow();
  });
});

describe('copy keys', () => {
  it('anime.b7 and hub.b7 hold every key the renderer reads, hub adds the deletion keys', () => {
    for (const k of [...copyKeysFor('magicLink'), ...copyKeysFor('signup'), ...copyKeysFor('emailChange'), ...copyKeysFor('reauth'),
      'email.ignore', 'email.footerNetwork', 'email.footerPrivacy']) {
      expect(ANIME_COPY, k).toHaveProperty([k]);
      expect(HUB_COPY, k).toHaveProperty([k]);
    }
    for (const k of copyKeysFor('deletionScheduled')) expect(HUB_COPY, k).toHaveProperty([k]);
    expect(Object.keys(ANIME_COPY).some((k) => k.includes('deletionScheduled'))).toBe(false);
  });

  it('shape and rule 10: camelCase keys, English text, no en or em dash, no emoji, nothing K-pop on anime', () => {
    for (const copy of [ANIME_COPY, HUB_COPY]) {
      for (const [k, v] of Object.entries(copy)) {
        expect(k).toMatch(/^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+$/);
        expect(v).not.toMatch(/[–—]/);
        expect(v).not.toMatch(/\p{Extended_Pictographic}/u);
        expect(v.trim()).toBe(v);
      }
    }
    expect(JSON.stringify(ANIME_COPY)).not.toMatch(/k-?pop/i);
  });

  it('writes no brand or domain: the placeholders are used', () => {
    for (const copy of [ANIME_COPY, HUB_COPY]) {
      const all = JSON.stringify(copy);
      for (const word of ['OtakuQuiz', 'FandomVerse', 'fandomverse.org/anime', 'fandomverse.org']) expect(all).not.toContain(word);
    }
  });
});

describe('the Edge Function files follow the app', () => {
  it('render.ts is a byte copy of lib/passport/email/render.ts', () => {
    expect(readFileSync(`${EDGE_DIR}render.ts`, 'utf8')).toBe(readFileSync(APP_RENDER, 'utf8'));
  });

  it('copy/anime.ts and copy/hub.ts hold the same keys and strings as copy/anime/b7.ts and copy/hub/b7.ts', () => {
    expect({ ...EDGE_ANIME }).toEqual({ ...ANIME_COPY });
    expect({ ...EDGE_HUB }).toEqual({ ...HUB_COPY });
  });

  it('brands.ts mirrors the registry: name, url, domain, network name', () => {
    for (const id of ['kpop', 'anime', 'hub'] as const) {
      expect(BRANDS[id]).toMatchObject({ id, name: REGISTRY[id].brand.name, url: REGISTRY[id].url, domain: REGISTRY[id].domain, network: NETWORK.name });
    }
  });

  it('the function has an index.ts, a deploy note and no secret in the repo', () => {
    const index = readFileSync(`${EDGE_DIR}index.ts`, 'utf8');
    expect(index).toContain('Deno.serve');
    expect(index).not.toMatch(/whsec_[A-Za-z0-9+/=]{8,}/);
    expect(index).not.toMatch(/re_[A-Za-z0-9]{16,}/);
  });
});

describe('redirect and links', () => {
  it('the site comes from the origin of the redirect URL; anything unknown is kpop', () => {
    expect(siteFromRedirect('https://fandomverse.org/anime/auth/confirm?next=%2Fme', BRANDS)).toBe('anime');
    expect(siteFromRedirect('https://fandomverse.org/auth/confirm', BRANDS)).toBe('hub');
    expect(siteFromRedirect('https://kpopquiz.org/auth/callback', BRANDS)).toBe('kpop');
    expect(siteFromRedirect('https://evil.example/fandomverse.org/anime', BRANDS)).toBe('kpop');
    expect(siteFromRedirect('https://fandomverse.org.evil.example/anime/auth/confirm', BRANDS)).toBe('kpop');
    // OtakuQuiz is the folder /anime of fandomverse.org (2026-10-28): a path that only starts with the same letters is the hub's.
    expect(siteFromRedirect('https://fandomverse.org/animex/auth/confirm', BRANDS)).toBe('hub');
    expect(siteFromRedirect('https://fandomverse.org/anime', BRANDS)).toBe('anime');
    expect(siteFromRedirect(null, BRANDS)).toBe('kpop');
    expect(siteFromRedirect('not a url', BRANDS)).toBe('kpop');
  });

  it('a staging origin matches only when the function was given it', () => {
    const o = parseOrigins('anime=http://anime.localhost:3001, hub=http://hub.localhost:3002, bogus=http://x, anime2=y');
    expect(o).toEqual({ anime: 'http://anime.localhost:3001', hub: 'http://hub.localhost:3002' });
    expect(siteFromRedirect('http://anime.localhost:3001/auth/confirm', BRANDS, o)).toBe('anime');
    expect(siteFromRedirect('http://anime.localhost:3001/auth/confirm', BRANDS)).toBe('kpop');
  });

  it('the confirm link goes to /auth/confirm with the hashed token, the OTP type and a safe next', () => {
    expect(confirmLink('https://fandomverse.org/anime', 'h h', 'magiclink', 'https://fandomverse.org/anime/auth/confirm?next=%2Fquizzes'))
      .toBe('https://fandomverse.org/anime/auth/confirm?token_hash=h%20h&type=magiclink&next=%2Fquizzes');
    expect(confirmLink('https://fandomverse.org', 'h', 'signup', null)).toBe('https://fandomverse.org/auth/confirm?token_hash=h&type=signup&next=%2F');
    expect(confirmLink('https://fandomverse.org', 'h', 'recovery', null)).toBeNull();
    expect(nextFromRedirect('https://fandomverse.org/anime/auth/confirm?next=//evil.example')).toBe('/');
    expect(nextFromRedirect('https://fandomverse.org/anime/auth/confirm?next=%2Fa%5Cb')).toBe('/');
    expect(nextFromRedirect('https://fandomverse.org/anime/series/x?y=1', 'https://fandomverse.org/anime')).toBe('/series/x?y=1');
    expect(nextFromRedirect('https://kpopquiz.org/series/x?y=1')).toBe('/series/x?y=1');
    expect(confirmLink('https://fandomverse.org/anime', 'h', 'magiclink', 'https://fandomverse.org/anime/auth/confirm'))
      .toBe('https://fandomverse.org/anime/auth/confirm?token_hash=h&type=magiclink&next=%2F');
  });

  it('kindForAction maps the hook actions', () => {
    expect(kindForAction('magiclink')).toBe('magicLink');
    expect(kindForAction('email')).toBe('magicLink');
    expect(kindForAction('signup')).toBe('signup');
    expect(kindForAction('email_change')).toBe('emailChange');
    expect(kindForAction('reauthentication')).toBe('reauth');
    expect(kindForAction('recovery')).toBeNull();
    expect(kindForAction('invite')).toBeNull();
  });
});

describe('the hook, end to end', () => {
  const key = randomBytes(32);
  const secret = `v1,whsec_${key.toString('base64')}`;
  const NOW = 1_800_000_000;

  function sign(body: string, id = 'msg_1', ts = String(NOW)): { id: string; timestamp: string; signature: string } {
    const mac = createHmac('sha256', key).update(`${id}.${ts}.${body}`).digest('base64');
    return { id, timestamp: ts, signature: `v1,${mac}` };
  }

  function deps(sent: OutgoingMail[], over: Partial<HookDeps['env']> = {}, ok = true): HookDeps {
    return {
      brands: BRANDS,
      copies: { anime: ANIME_COPY, hub: HUB_COPY },
      env: { secret, supabaseUrl: API, origins: {}, from: { kpop: 'KpopQuiz <hello@kpopquiz.test>' }, ...over },
      nowSec: NOW,
      send: async (m) => { sent.push(m); return ok; },
    };
  }

  const payload = (action: string, redirect: string | null, extra: Record<string, unknown> = {}, user: Record<string, unknown> = {}): string =>
    JSON.stringify({
      user: { id: 'u1', email: 'fan@example.test', ...user },
      email_data: { token: '123456', token_hash: 'hash-1', redirect_to: redirect ?? '', email_action_type: action, site_url: 'https://kpopquiz.org', ...extra },
    });

  it('kpop: every action is today bytes, sent through the kpop sender', async () => {
    for (const [action, t] of Object.entries(TODAY)) {
      const body = payload(action, 'https://kpopquiz.org/auth/callback', {}, { new_email: 'new@example.test', email: 'old@example.test' });
      const sent: OutgoingMail[] = [];
      const res = await handleHook('POST', sign(body), body, deps(sent));
      expect(res.status, action).toBe(200);
      const url = `${API}/auth/v1/verify?token=hash-1&type=${action}&redirect_to=https%3A%2F%2Fkpopquiz.org%2Fauth%2Fcallback`;
      expect(sent).toHaveLength(1);
      expect(sent[0]!.subject).toBe(t.subject);
      expect(sent[0]!.html).toBe(t.html.replace('{url}', url));
      expect(sent[0]!.from).toBe('KpopQuiz <hello@kpopquiz.test>');
      expect(sent[0]!.text).toBeUndefined();
      // email_change goes to the new address when there is one token only
      expect(sent[0]!.to).toBe(action === 'email_change' ? 'new@example.test' : 'old@example.test');
    }
  });

  it('kpop without a sender configured fails closed (500), nothing is sent', async () => {
    const body = payload('magiclink', 'https://kpopquiz.org/auth/callback');
    const sent: OutgoingMail[] = [];
    const res = await handleHook('POST', sign(body), body, deps(sent, { from: {} }));
    expect(res.status).toBe(500);
    expect(sent).toEqual([]);
  });

  it('anime: a branded magic link to its own /auth/confirm', async () => {
    const body = payload('magiclink', 'https://fandomverse.org/anime/auth/confirm?next=%2Fseries');
    const sent: OutgoingMail[] = [];
    const res = await handleHook('POST', sign(body), body, deps(sent));
    expect(res.status).toBe(200);
    expect(sent).toHaveLength(1);
    expect(sent[0]!.from).toBe('OtakuQuiz <no-reply@fandomverse.org>');
    expect(sent[0]!.subject).toBe('Your OtakuQuiz link to sign in');
    expect(sent[0]!.html).toContain('href="https://fandomverse.org/anime/auth/confirm?token_hash=hash-1&amp;type=magiclink&amp;next=%2Fseries"');
    expect(sent[0]!.html + sent[0]!.text).not.toMatch(/k-?pop|supabase/i);
  });

  it('hub: signup and reauth; the code is shown, no link', async () => {
    const sent: OutgoingMail[] = [];
    const a = payload('signup', 'https://fandomverse.org/auth/confirm');
    expect((await handleHook('POST', sign(a), a, deps(sent))).status).toBe(200);
    expect(sent[0]!.subject).toBe('Confirm your FandomVerse account');
    expect(sent[0]!.html).toContain('https://fandomverse.org/auth/confirm?token_hash=hash-1&amp;type=signup');
    const b = payload('reauthentication', 'https://fandomverse.org/');
    expect((await handleHook('POST', sign(b), b, deps(sent))).status).toBe(200);
    expect(sent[1]!.html).toContain('123456');
  });

  it('anime email change with two tokens goes to both addresses, each with its own token', async () => {
    const body = payload('email_change', 'https://fandomverse.org/anime/auth/confirm', { token_hash_new: 'hash-new' }, { new_email: 'new@example.test' });
    const sent: OutgoingMail[] = [];
    expect((await handleHook('POST', sign(body), body, deps(sent))).status).toBe(200);
    expect(sent.map((m) => m.to)).toEqual(['fan@example.test', 'new@example.test']);
    expect(sent[0]!.html).toContain('token_hash=hash-1&amp;type=email_change');
    expect(sent[1]!.html).toContain('token_hash=hash-new&amp;type=email_change');
  });

  it('recovery and invite are not sent by anime or hub (400), nothing is sent', async () => {
    for (const action of ['recovery', 'invite']) {
      const body = payload(action, 'https://fandomverse.org/anime/auth/confirm');
      const sent: OutgoingMail[] = [];
      expect((await handleHook('POST', sign(body), body, deps(sent))).status).toBe(400);
      expect(sent).toEqual([]);
    }
  });

  it('refuses a wrong method, a missing, wrong or stale signature, and a malformed body', async () => {
    const body = payload('magiclink', 'https://fandomverse.org/anime/auth/confirm');
    const sent: OutgoingMail[] = [];
    expect((await handleHook('GET', sign(body), body, deps(sent))).status).toBe(405);
    expect((await handleHook('POST', { id: null, timestamp: null, signature: null }, body, deps(sent))).status).toBe(401);
    const bad = sign(body);
    expect((await handleHook('POST', { ...bad, signature: 'v1,AAAA' }, body, deps(sent))).status).toBe(401);
    expect((await handleHook('POST', sign(body), `${body} `, deps(sent))).status).toBe(401);
    expect((await handleHook('POST', sign(body, 'm', String(NOW - 301)), body, deps(sent))).status).toBe(401);
    const junk = '[1,2';
    expect((await handleHook('POST', sign(junk), junk, deps(sent))).status).toBe(400);
    const noEmail = JSON.stringify({ user: {}, email_data: { email_action_type: 'magiclink', token_hash: 'h' } });
    expect((await handleHook('POST', sign(noEmail), noEmail, deps(sent))).status).toBe(400);
    expect(sent).toEqual([]);
  });

  it('a failed send is 502 and the answer holds no address or link', async () => {
    const body = payload('magiclink', 'https://fandomverse.org/anime/auth/confirm');
    const res = await handleHook('POST', sign(body), body, deps([], {}, false));
    expect(res.status).toBe(502);
    expect(JSON.stringify(res.body)).not.toMatch(/example\.test|hash-1|auth\/confirm/);
  });

  it('an empty secret verifies nothing', async () => {
    expect(await verifyWebhook('', sign('{}'), '{}', NOW)).toBe(false);
  });
});

describe('the deletion notice (hub route)', () => {
  it('posts the neutral hub email to Resend with the key, to the member only; no key means no notice', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchImpl = (async (url: string, init: RequestInit) => { calls.push({ url, init }); return new Response('{}', { status: 200 }); }) as unknown as typeof fetch;
    expect(await sendDeletionNotice('fan@example.test', '2026-10-28T12:00:00.000Z', { RESEND_API_KEY: 're_test_key_value' }, fetchImpl)).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe('https://api.resend.com/emails');
    const sent = JSON.parse(String(calls[0]!.init.body)) as { to: string[]; subject: string; html: string; from: string };
    expect(sent.to).toEqual(['fan@example.test']);
    expect(sent.subject).toBe('Your FandomVerse passport will be deleted');
    expect(sent.html).toContain('2026-10-28');
    expect(sent.html).toContain('https://fandomverse.org/settings');
    expect(sent.from).toBe('FandomVerse <no-reply@fandomverse.org>');
    expect(await sendDeletionNotice('fan@example.test', '2026-10-28T12:00:00.000Z', {}, fetchImpl)).toBe(false);
    expect(calls).toHaveLength(1);
    const boom = (async () => { throw new Error('network'); }) as unknown as typeof fetch;
    expect(await sendDeletionNotice('fan@example.test', '2026-10-28T12:00:00.000Z', { RESEND_API_KEY: 'k' }, boom)).toBe(false);
  });
});
