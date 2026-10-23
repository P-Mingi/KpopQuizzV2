import { describe, expect, it } from 'vitest';

import { buildResendRequest, escapeHtml, missingSendConfig, RESEND_URL, renderEmail, reportRecipient, reportSender, sendConfig, sendReportEmail } from './email';

import type { FetchLike } from './google-auth';

const MODEL = {
  subject: 'kpopquiz.org SEO, semaine du 5 oct.: 1 ligne rouge',
  redCount: 1,
  lines: [
    { text: 'Google, semaine du 5 oct.: 80 clics' },
    { text: 'Rouge: <script>alert(1)</script> & "x"', red: true },
  ],
};

describe('renderEmail', () => {
  const e = renderEmail(MODEL);

  it('one paragraph per line, the text version one line per line', () => {
    expect(e.subject).toBe(MODEL.subject);
    expect(e.text).toBe('Google, semaine du 5 oct.: 80 clics\nRouge: <script>alert(1)</script> & "x"');
    expect(e.html.match(/<p /g)).toHaveLength(2);
    expect(e.html).toContain('<html lang="fr">');
  });

  it('escapes every value at the sink', () => {
    expect(e.html).not.toContain('<script>');
    expect(e.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;x&quot;');
    expect(escapeHtml(`'`)).toBe('&#39;');
  });

  it('shows red lines in red', () => {
    expect(e.html).toMatch(/<p style="[^"]*color:#b42318[^"]*">Rouge:/);
  });
});

describe('recipient and sender', () => {
  it('accepts exactly one address for SEO_REPORT_TO', () => {
    expect(reportRecipient(' owner@example.com ')).toBe('owner@example.com');
    expect(reportRecipient('a@example.com,b@example.com')).toBeNull();
    expect(reportRecipient('a@example.com; b@example.com')).toBeNull();
    expect(reportRecipient('a@example.com b@example.com')).toBeNull();
    expect(reportRecipient('Owner <owner@example.com>')).toBeNull();
    expect(reportRecipient('')).toBeNull();
    expect(reportRecipient(undefined)).toBeNull();
  });

  it('accepts "Name <address>" or an address for SEO_REPORT_FROM', () => {
    expect(reportSender('KpopQuiz SEO <seo@example.com>')).toBe('KpopQuiz SEO <seo@example.com>');
    expect(reportSender('seo@example.com')).toBe('seo@example.com');
    expect(reportSender('KpopQuiz')).toBeNull();
  });

  it('names what is missing, never a value', () => {
    expect(missingSendConfig({})).toEqual(['RESEND_API_KEY', 'SEO_REPORT_FROM', 'SEO_REPORT_TO (one address)']);
    expect(missingSendConfig({ RESEND_API_KEY: 're_x', SEO_REPORT_FROM: 'seo@example.com', SEO_REPORT_TO: 'a@example.com,b@example.com' })).toEqual(['SEO_REPORT_TO (one address)']);
    expect(sendConfig({ RESEND_API_KEY: 're_x', SEO_REPORT_FROM: 'seo@example.com', SEO_REPORT_TO: 'owner@example.com' })).toEqual({ apiKey: 're_x', from: 'seo@example.com', to: 'owner@example.com' });
  });
});

describe('Resend request', () => {
  const cfg = { apiKey: 're_test', from: 'KpopQuiz SEO <seo@example.com>', to: 'owner@example.com' };

  it('posts JSON to the emails endpoint with one recipient', () => {
    const req = buildResendRequest(cfg, renderEmail(MODEL));
    expect(req.url).toBe(RESEND_URL);
    expect(req.init.method).toBe('POST');
    expect(req.init.headers.Authorization).toBe('Bearer re_test');
    const body = JSON.parse(req.init.body) as Record<string, unknown>;
    expect(body.to).toEqual(['owner@example.com']);
    expect(body.from).toBe(cfg.from);
    expect(Object.keys(body).sort()).toEqual(['from', 'html', 'subject', 'text', 'to']);
  });

  it('reports the status without the address or the key (fake fetch, nothing sent)', async () => {
    const ok: FetchLike = async () => ({ status: 200, ok: true, json: async () => ({ id: 'abc' }), text: async () => '' });
    await expect(sendReportEmail(cfg, renderEmail(MODEL), ok)).resolves.toEqual({ ok: true, detail: 'sent (Resend id abc)' });
    const refused: FetchLike = async () => ({ status: 403, ok: false, json: async () => ({ message: 'domain not verified' }), text: async () => '' });
    const r = await sendReportEmail(cfg, renderEmail(MODEL), refused);
    expect(r).toEqual({ ok: false, detail: 'Resend HTTP 403' });
    const down: FetchLike = async () => {
      throw new Error('getaddrinfo ENOTFOUND');
    };
    await expect(sendReportEmail(cfg, renderEmail(MODEL), down)).resolves.toEqual({ ok: false, detail: 'Resend request failed (network)' });
  });
});
