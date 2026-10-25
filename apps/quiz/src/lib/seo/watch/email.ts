// An e-mail to the site owner, and to nobody else (SEO Mission 3: "aucun e-mail à quelqu'un
// d'autre que le propriétaire"). Sent through Resend's REST API with fetch (no new dependency).
// The recipient is never written in the code: the owner sets it.
//
//   RESEND_API_KEY          the Resend API key
//   SEO_ALERT_EMAIL_TO      the owner's address (one address; a list is refused)
//   SEO_ALERT_EMAIL_FROM    a sender on a domain verified in Resend, e.g. "KpopQuiz <alerts@...>"
//
// Missing any of the three = not configured: nothing is sent and the caller falls back to the
// Discord ops alert. Dry run (SEO_WATCH_DRY_RUN=1 or ?dry=1) sends nothing. The body carries
// URLs, counts and group names only, never user data.

import { isWatchDryRun } from './env';

import type { Env } from './env';

export type EmailOutcome = 'sent' | 'dry_run' | 'not_configured' | 'failed';

type PostFn = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{ ok: boolean; status: number }>;

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

/** One plain address, nothing that could fan out to several recipients. */
export function isSingleAddress(v: string | undefined): v is string {
  return !!v && /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(v.trim());
}

export function ownerEmailConfigured(env: Env = process.env): boolean {
  return !!env.RESEND_API_KEY && isSingleAddress(env.SEO_ALERT_EMAIL_TO) && !!(env.SEO_ALERT_EMAIL_FROM ?? '').trim();
}

export async function sendOwnerEmail(
  msg: { subject: string; text: string },
  opts: { env?: Env; dryRun?: boolean; post?: PostFn } = {},
): Promise<EmailOutcome> {
  const env = opts.env ?? process.env;
  if (opts.dryRun || isWatchDryRun(env)) {
    console.log(`[seo/email] dry run, not sent: ${msg.subject}`);
    return 'dry_run';
  }
  if (!ownerEmailConfigured(env)) return 'not_configured';
  const post: PostFn = opts.post ?? ((url, init) => fetch(url, init));
  try {
    const res = await post(RESEND_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.SEO_ALERT_EMAIL_FROM!.trim(),
        to: [env.SEO_ALERT_EMAIL_TO!.trim()],
        subject: msg.subject.slice(0, 200),
        text: msg.text.slice(0, 5000),
      }),
    });
    if (!res.ok) console.error(`[seo/email] Resend answered ${res.status}`);
    return res.ok ? 'sent' : 'failed';
  } catch {
    console.error('[seo/email] Resend request failed');
    return 'failed';
  }
}
