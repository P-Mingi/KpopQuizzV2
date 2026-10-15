// Render the Monday report as an e-mail and send it through Resend (SEO Mission 3, part C).
//
// Resend is called by hand over its REST API (POST https://api.resend.com/emails, bearer
// RESEND_API_KEY): no new dependency. The recipient is the owner only: SEO_REPORT_TO must hold
// exactly one address, set by the owner in Vercel; nothing is hard coded, and a list (comma,
// semicolon, several "@") is refused rather than sent. SEO_REPORT_FROM is the sender, an
// address of a domain verified in Resend.
//
// Every value is escaped at the sink: queries come from search engines and URLs from link
// reports, so none of them is trusted HTML.

import type { ReportModel } from './report';
import type { FetchLike } from './google-auth';

export const RESEND_URL = 'https://api.resend.com/emails';

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

export function renderEmail(model: ReportModel): RenderedEmail {
  const text = model.lines.map((l) => l.text).join('\n');
  const paragraphs = model.lines
    .map((l) => `<p style="margin:0 0 8px;${l.red ? 'color:#b42318;font-weight:600;' : ''}">${escapeHtml(l.text)}</p>`)
    .join('\n');
  const html = [
    '<!doctype html>',
    '<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>',
    '<body style="margin:0;padding:16px;background:#ffffff;color:#111111;font:14px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif;">',
    paragraphs,
    '</body></html>',
  ].join('\n');
  return { subject: model.subject, text, html };
}

const EMAIL = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/;

/** The one recipient, or null when SEO_REPORT_TO is unset or holds anything but one address. */
export function reportRecipient(raw: string | undefined): string | null {
  const v = (raw ?? '').trim();
  return EMAIL.test(v) ? v : null;
}

/** "Name <address>" or a bare address; null when unusable. */
export function reportSender(raw: string | undefined): string | null {
  const v = (raw ?? '').trim();
  if (!v) return null;
  const m = /^[^<>]*<([^<>]+)>$/.exec(v);
  return EMAIL.test(m ? m[1]!.trim() : v) ? v : null;
}

export interface SendConfig {
  apiKey: string;
  from: string;
  to: string;
}

/** What is missing to send, named (never a value). Empty when everything is there. */
export function missingSendConfig(env: Record<string, string | undefined>): string[] {
  const missing: string[] = [];
  if (!(env.RESEND_API_KEY ?? '').trim()) missing.push('RESEND_API_KEY');
  if (!reportSender(env.SEO_REPORT_FROM)) missing.push('SEO_REPORT_FROM');
  if (!reportRecipient(env.SEO_REPORT_TO)) missing.push('SEO_REPORT_TO (one address)');
  return missing;
}

export function sendConfig(env: Record<string, string | undefined>): SendConfig | null {
  if (missingSendConfig(env).length > 0) return null;
  return { apiKey: env.RESEND_API_KEY!.trim(), from: reportSender(env.SEO_REPORT_FROM)!, to: reportRecipient(env.SEO_REPORT_TO)! };
}

export function buildResendRequest(cfg: SendConfig, email: RenderedEmail): { url: string; init: { method: string; headers: Record<string, string>; body: string } } {
  return {
    url: RESEND_URL,
    init: {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: cfg.from, to: [cfg.to], subject: email.subject, text: email.text, html: email.html }),
    },
  };
}

/** Send. The answer is a status line without the address or the key. */
export async function sendReportEmail(cfg: SendConfig, email: RenderedEmail, fetchImpl: FetchLike): Promise<{ ok: boolean; detail: string }> {
  const req = buildResendRequest(cfg, email);
  try {
    const res = await fetchImpl(req.url, req.init);
    let id = '';
    try {
      const json = (await res.json()) as { id?: unknown };
      id = typeof json?.id === 'string' ? json.id : '';
    } catch {
      id = '';
    }
    return res.status >= 200 && res.status < 300 ? { ok: true, detail: `sent (Resend id ${id || 'unknown'})` } : { ok: false, detail: `Resend HTTP ${res.status}` };
  } catch {
    return { ok: false, detail: 'Resend request failed (network)' };
  }
}
