// Run O1, lot (e), lane B7: the neutral notice of a scheduled deletion (apis.md 3.4), sent from the delete route with Resend. It
// says that the passport will be deleted on a date and links to the settings where the deletion is cancelled; it holds no name, no
// username and no list of what is deleted. Fail soft: no RESEND_API_KEY, or any error, means no notice and never blocks the deletion.
// The text is the hub.b7 copy; the HTML comes from the same renderer the Send Email Hook uses. The hub sends it from bunnyverse.org; the
// kpop build (NEXT_PUBLIC_NET_DELETION, owner decision of 2026-10-24) sends the same text under the KpopQuiz brand and links to
// kpopquiz.org/settings, because that is where the member signs in and cancels.
//
// Test sink (o1-dev and o1-scratch only): when O1_MAIL_SINK names a file AND the process was started through scripts/o1/env.sh
// (O1_ENV is dev or scratch, which env.sh refuses to set for production) AND it is not a Vercel production deployment, the mail
// is appended to that file as one JSON line and nothing leaves the machine. A production process has no O1_ENV, so the sink
// is inert there whatever O1_MAIL_SINK says.

import { COPY } from '@/copy/hub/b7';
import { siteUrl } from '@/lib/auth/site-base';
import { NETWORK, REGISTRY } from '@/lib/site/registry';

import { renderEmail } from './render';

import type { NetOriginEnv } from '@/lib/site/registry';
import type { SiteId } from '@/lib/site/types';
import type { MailBrand } from './render';

export type NoticeEnv = NetOriginEnv & {
  readonly RESEND_API_KEY?: string | undefined;
  readonly SEND_EMAIL_FROM_HUB?: string | undefined;
  readonly SEND_EMAIL_FROM_KPOP?: string | undefined;
  readonly O1_MAIL_SINK?: string | undefined;
  readonly O1_ENV?: string | undefined;
};

const ACCENT: Readonly<Record<'kpop' | 'hub', string>> = { kpop: '#E8458B', hub: '#2B2F3A' };

export function hubMailBrand(): MailBrand {
  return mailBrand('hub');
}

/** The brand of the notice: the hub's, or kpop's (the two sites that can start a deletion). */
export function mailBrand(site: SiteId = 'hub'): MailBrand {
  const id = site === 'kpop' ? 'kpop' : 'hub';
  const cfg = REGISTRY[id];
  return { id, name: cfg.brand.name, url: cfg.url, domain: cfg.domain, network: NETWORK.name, privacyPath: '/privacy', accent: ACCENT[id] };
}

/**
 * The settings page of `site` on this deployment, where the deletion is cancelled: the site's origin (NEXT_PUBLIC_NET_ORIGINS
 * outside production) with its basePath, so a link of anime is https://bunnyverse.org/anime/settings, never the hub's
 * /settings of the bare shared origin. kpop and the hub have no basePath: their link is the one of before.
 */
export function settingsLink(site: SiteId, env: NetOriginEnv): string {
  return siteUrl(site, env, '/settings');
}

/** `2026-10-28`: the UTC date the deletion runs (no time zone is guessed). */
export function noticeDate(runAfter: string): string {
  const t = new Date(runAfter);
  return Number.isNaN(t.getTime()) ? runAfter.slice(0, 10) : t.toISOString().slice(0, 10);
}

/** The sink file of this process, or null: see the header. */
export function mailSinkFile(env: NoticeEnv): string | null {
  const file = env.O1_MAIL_SINK?.trim();
  if (!file || (env.O1_ENV !== 'dev' && env.O1_ENV !== 'scratch') || env.VERCEL_ENV === 'production') return null;
  return file;
}

export async function sendDeletionNotice(
  to: string,
  runAfter: string,
  env: NoticeEnv = process.env as NoticeEnv,
  fetchImpl: typeof fetch = fetch,
  site: SiteId = 'hub',
): Promise<boolean> {
  const sink = mailSinkFile(env);
  const key = env.RESEND_API_KEY?.trim();
  if ((!key && !sink) || !to) return false;
  const brand = mailBrand(site);
  const mail = renderEmail({
    kind: 'deletionScheduled',
    brand,
    copy: COPY,
    link: settingsLink(brand.id, env),
    date: noticeDate(runAfter),
  });
  if (sink) {
    try {
      const { appendFile } = await import('node:fs/promises');
      await appendFile(sink, `${JSON.stringify({ at: new Date().toISOString(), site: brand.id, subject: mail.subject, date: noticeDate(runAfter), text: mail.text, html: mail.html })}\n`);
      return true;
    } catch {
      return false;
    }
  }
  try {
    const res = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: (brand.id === 'kpop' ? env.SEND_EMAIL_FROM_KPOP : env.SEND_EMAIL_FROM_HUB) ?? `${brand.name} <no-reply@${brand.domain}>`,
        to: [to],
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      }),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
