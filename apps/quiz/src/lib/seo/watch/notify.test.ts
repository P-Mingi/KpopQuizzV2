import { describe, expect, it, vi } from 'vitest';

import { seoAlert } from './alert';
import { isSingleAddress, ownerEmailConfigured, sendOwnerEmail } from './email';
import { dryRunRequested, isWatchDryRun, spikeIndexNowOn } from './env';

// No test reaches the network: every post is a mock.

const MAIL_ENV = { RESEND_API_KEY: 're_test', SEO_ALERT_EMAIL_TO: 'owner@example.com', SEO_ALERT_EMAIL_FROM: 'KpopQuiz <alerts@example.com>' };

describe('sendOwnerEmail', () => {
  it('sends one message to the one configured address', async () => {
    const post = vi.fn(async () => ({ ok: true, status: 200 }));
    expect(await sendOwnerEmail({ subject: 'S', text: 'T' }, { env: MAIL_ENV, post })).toBe('sent');
    const [url, init] = post.mock.calls[0]! as unknown as [string, { body: string; headers: Record<string, string> }];
    expect(url).toBe('https://api.resend.com/emails');
    expect(JSON.parse(init.body)).toEqual({ from: 'KpopQuiz <alerts@example.com>', to: ['owner@example.com'], subject: 'S', text: 'T' });
    expect(init.headers.Authorization).toBe('Bearer re_test');
  });

  it('not configured (any variable missing, or a list of recipients): nothing is sent', async () => {
    const post = vi.fn(async () => ({ ok: true, status: 200 }));
    for (const env of [
      { ...MAIL_ENV, RESEND_API_KEY: undefined },
      { ...MAIL_ENV, SEO_ALERT_EMAIL_TO: undefined },
      { ...MAIL_ENV, SEO_ALERT_EMAIL_FROM: '' },
      { ...MAIL_ENV, SEO_ALERT_EMAIL_TO: 'a@example.com, b@example.com' },
    ]) expect(await sendOwnerEmail({ subject: 'S', text: 'T' }, { env, post })).toBe('not_configured');
    expect(post).not.toHaveBeenCalled();
  });

  it('dry run sends nothing even when configured', async () => {
    const post = vi.fn(async () => ({ ok: true, status: 200 }));
    expect(await sendOwnerEmail({ subject: 'S', text: 'T' }, { env: { ...MAIL_ENV, SEO_WATCH_DRY_RUN: '1' }, post })).toBe('dry_run');
    expect(await sendOwnerEmail({ subject: 'S', text: 'T' }, { env: MAIL_ENV, post, dryRun: true })).toBe('dry_run');
    expect(post).not.toHaveBeenCalled();
  });

  it('a refused or failed request is reported, never thrown', async () => {
    expect(await sendOwnerEmail({ subject: 'S', text: 'T' }, { env: MAIL_ENV, post: async () => ({ ok: false, status: 422 }) })).toBe('failed');
    expect(await sendOwnerEmail({ subject: 'S', text: 'T' }, { env: MAIL_ENV, post: async () => { throw new Error('down'); } })).toBe('failed');
  });

  it('address checks', () => {
    expect(isSingleAddress('owner@example.com')).toBe(true);
    expect(isSingleAddress('a@example.com;b@example.com')).toBe(false);
    expect(isSingleAddress('not-an-address')).toBe(false);
    expect(ownerEmailConfigured(MAIL_ENV)).toBe(true);
  });
});

describe('seoAlert: the existing Discord ops webhook', () => {
  it('posts to DISCORD_ALERT_WEBHOOK_URL with mentions disabled', async () => {
    const post = vi.fn(async () => ({ ok: true }));
    expect(await seoAlert('linked-urls', '1 failing', { env: { DISCORD_ALERT_WEBHOOK_URL: 'https://discord.example/hook' }, post })).toBe('sent');
    const [url, init] = post.mock.calls[0]! as unknown as [string, { body: string }];
    expect(url).toBe('https://discord.example/hook');
    expect(JSON.parse(init.body)).toEqual({ content: ':warning: [seo/linked-urls] 1 failing', allowed_mentions: { parse: [] } });
  });

  it('no webhook, or dry run: nothing is posted', async () => {
    const post = vi.fn(async () => ({ ok: true }));
    expect(await seoAlert('x', 'y', { env: {}, post })).toBe('no_webhook');
    expect(await seoAlert('x', 'y', { env: { DISCORD_ALERT_WEBHOOK_URL: 'https://d.example', SEO_WATCH_DRY_RUN: 'true' }, post })).toBe('dry_run');
    expect(post).not.toHaveBeenCalled();
  });
});

describe('switches', () => {
  it('dry run from the env or from ?dry=1', () => {
    expect(isWatchDryRun({ SEO_WATCH_DRY_RUN: 'yes' })).toBe(true);
    expect(isWatchDryRun({})).toBe(false);
    expect(dryRunRequested('https://kpopquiz.org/api/cron/seo-spikes?dry=1', {})).toBe(true);
    expect(dryRunRequested('https://kpopquiz.org/api/cron/seo-spikes', {})).toBe(false);
  });

  it('IndexNow on spikes stays on unless explicitly turned off', () => {
    expect(spikeIndexNowOn({})).toBe(true);
    expect(spikeIndexNowOn({ SEO_SPIKE_INDEXNOW: '0' })).toBe(false);
    expect(spikeIndexNowOn({ SEO_SPIKE_INDEXNOW: 'off' })).toBe(false);
  });
});
