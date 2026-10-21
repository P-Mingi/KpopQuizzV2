// Run O1, lot (e), lane B7: the neutral notice of a scheduled deletion (apis.md 3.4), sent from the hub's delete route with Resend. It
// says that the passport will be deleted on a date and links to the settings where the deletion is cancelled; it holds no name, no
// username and no list of what is deleted. Fail soft: no RESEND_API_KEY, or any error, means no notice and never blocks the deletion.
// The text is the hub.b7 copy; the HTML comes from the same renderer the Send Email Hook uses.

import { COPY } from '@/copy/hub/b7';
import { NETWORK, REGISTRY, netOrigin } from '@/lib/site/registry';

import { renderEmail } from './render';

import type { NetOriginEnv } from '@/lib/site/registry';
import type { MailBrand } from './render';

export type NoticeEnv = NetOriginEnv & {
  readonly RESEND_API_KEY?: string | undefined;
  readonly SEND_EMAIL_FROM_HUB?: string | undefined;
};

export function hubMailBrand(): MailBrand {
  const hub = REGISTRY.hub;
  return {
    id: 'hub', name: hub.brand.name, url: hub.url, domain: hub.domain, network: NETWORK.name, privacyPath: '/privacy', accent: '#2B2F3A',
  };
}

/** `2026-10-28`: the UTC date the deletion runs (no time zone is guessed). */
export function noticeDate(runAfter: string): string {
  const t = new Date(runAfter);
  return Number.isNaN(t.getTime()) ? runAfter.slice(0, 10) : t.toISOString().slice(0, 10);
}

export async function sendDeletionNotice(
  to: string,
  runAfter: string,
  env: NoticeEnv = process.env as NoticeEnv,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const key = env.RESEND_API_KEY?.trim();
  if (!key || !to) return false;
  const brand = hubMailBrand();
  const mail = renderEmail({
    kind: 'deletionScheduled',
    brand,
    copy: COPY,
    link: `${netOrigin('hub', env)}/settings`,
    date: noticeDate(runAfter),
  });
  try {
    const res = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.SEND_EMAIL_FROM_HUB ?? `${brand.name} <no-reply@${brand.domain}>`,
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
