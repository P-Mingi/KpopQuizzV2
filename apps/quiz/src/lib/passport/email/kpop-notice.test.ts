// Run O1, lot (e), lane B7 (owner decision of 2026-10-24): the "deletion scheduled" email of a kpop member, and the test sink.
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { COPY } from '@/copy/hub/b7';

import { mailSinkFile, noticeDate, sendDeletionNotice } from './notice';
import { renderEmail } from './render';

const calls: Array<{ url: string; body: { from: string; to: string[]; subject: string; html: string; text: string } }> = [];
const okFetch = (async (url: string, init: RequestInit) => { calls.push({ url, body: JSON.parse(String(init.body)) }); return new Response('{}', { status: 200 }); }) as unknown as typeof fetch;

describe('the notice of a kpop member', () => {
  it('KpopQuiz brand, links to kpopquiz.org/settings, the date seven days out, the kpop sender', async () => {
    calls.length = 0;
    expect(await sendDeletionNotice('k@example.test', '2026-10-31T12:00:00.000Z', { RESEND_API_KEY: 're_test_key_value' }, okFetch, 'kpop')).toBe(true);
    const sent = calls[0]!.body;
    expect(sent.to).toEqual(['k@example.test']);
    expect(sent.subject).toBe('Your KpopQuiz passport will be deleted');
    expect(sent.html).toContain('2026-10-31');
    expect(sent.html).toContain('https://kpopquiz.org/settings');
    expect(sent.html).not.toContain('fanquiz.org/settings');
    expect(sent.text).toContain('Cancel the deletion: https://kpopquiz.org/settings');
    expect(sent.from).toBe('KpopQuiz <no-reply@kpopquiz.org>');
    calls.length = 0;
    await sendDeletionNotice('k@example.test', '2026-10-31T12:00:00.000Z', { RESEND_API_KEY: 'k', SEND_EMAIL_FROM_KPOP: 'KpopQuiz <hello@kpopquiz.org>' }, okFetch, 'kpop');
    expect(calls[0]!.body.from).toBe('KpopQuiz <hello@kpopquiz.org>');
  });

  it('the hub notice is unchanged (default site)', async () => {
    calls.length = 0;
    await sendDeletionNotice('f@example.test', '2026-10-31T12:00:00.000Z', { RESEND_API_KEY: 'k' }, okFetch);
    expect(calls[0]!.body.subject).toBe('Your FanQuiz passport will be deleted');
    expect(calls[0]!.body.html).toContain('https://fanquiz.org/settings');
  });

  it('the renderer: kpop renders deletionScheduled only; anime still does not; kpop sign-in emails still go to renderKpop', () => {
    const kpop = { id: 'kpop' as const, name: 'KpopQuiz', url: 'https://kpopquiz.org', domain: 'kpopquiz.org', network: 'FanQuiz', privacyPath: '/privacy', accent: '#E8458B' };
    const m = renderEmail({ kind: 'deletionScheduled', brand: kpop, copy: COPY, link: 'https://kpopquiz.org/settings', date: '2026-10-31' });
    expect(m.subject).toBe('Your KpopQuiz passport will be deleted');
    expect(() => renderEmail({ kind: 'magicLink', brand: kpop, copy: COPY, link: 'x' })).toThrow();
    expect(() => renderEmail({ kind: 'reauth', brand: kpop, copy: COPY })).toThrow();
    expect(() => renderEmail({ kind: 'deletionScheduled', brand: { ...kpop, id: 'anime' }, copy: COPY, link: 'x', date: 'd' })).toThrow();
  });

  it('noticeDate is the UTC day', () => {
    expect(noticeDate('2026-10-31T23:30:00.000Z')).toBe('2026-10-31');
  });
});

describe('the test sink', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'o1-b7-sink-'));

  it('writes one JSON line and sends nothing, on a dev or scratch process that is not a production deployment', async () => {
    const file = path.join(dir, 'a.jsonl');
    calls.length = 0;
    expect(await sendDeletionNotice('k@example.test', '2026-10-31T12:00:00.000Z', { O1_MAIL_SINK: file, O1_ENV: 'dev' }, okFetch, 'kpop')).toBe(true);
    expect(calls).toEqual([]);
    const lines = readFileSync(file, 'utf8').trim().split('\n').map((l) => JSON.parse(l) as { subject: string; date: string; site: string; text: string });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ subject: 'Your KpopQuiz passport will be deleted', date: '2026-10-31', site: 'kpop' });
    expect(JSON.stringify(lines[0])).not.toContain('example.test');
  });

  it('is inert when O1_ENV is not dev or scratch, or on a Vercel production deployment, or without a file', async () => {
    const file = path.join(dir, 'b.jsonl');
    for (const env of [{ O1_MAIL_SINK: file }, { O1_MAIL_SINK: file, O1_ENV: 'offline' }, { O1_MAIL_SINK: file, O1_ENV: 'dev', VERCEL_ENV: 'production' }, { O1_ENV: 'dev' }]) {
      expect(mailSinkFile(env), JSON.stringify(env)).toBeNull();
    }
    // no key and no usable sink: no notice
    expect(await sendDeletionNotice('k@example.test', '2026-10-31T12:00:00.000Z', { O1_MAIL_SINK: file }, okFetch, 'kpop')).toBe(false);
    // a key and an inert sink: the real sender is used
    calls.length = 0;
    expect(await sendDeletionNotice('k@example.test', '2026-10-31T12:00:00.000Z', { O1_MAIL_SINK: file, RESEND_API_KEY: 'k', VERCEL_ENV: 'production' }, okFetch, 'kpop')).toBe(true);
    expect(calls).toHaveLength(1);
    expect(existsSync(file)).toBe(false);
  });
});
