// Audit 01 P2-10: the daily quiz reminder by email. Pure helpers + the mail, with every side effect injected (a test never sends).
//
// Rules (owner, 2026-11-09): signed-in accounts only, "15 or older" confirmed at sign-up of the reminder (the privacy policy: not
// directed at children under 15), double opt-in, an hour the player chooses, at most one a day, none once the daily is played,
// one-click unsubscribe (List-Unsubscribe + List-Unsubscribe-Post), NO open or click tracking (plain links to our own pages, no
// pixel, no redirect). Behind the server flag DAILY_REMINDERS=1 (off by default); without the L27 table there is no reminder UI.
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import { esc } from '@/lib/passport/email/render';

export const REMINDERS_TABLE = 'daily_reminders';

export function remindersEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env['DAILY_REMINDERS'] === '1';
}

/** A link token (24 random bytes, base64url) and the sha256 hex of it that the table keeps. */
export function newToken(): string {
  return randomBytes(24).toString('base64url');
}
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * The unsubscribe token of an account: an HMAC of its id under a server secret, so every mail ever sent keeps a working one-click
 * link (nothing to store, nothing to rotate per mail). No secret configured = no token = the reminder cannot be sent.
 */
export function unsubscribeToken(userId: string, secret: string | undefined): string | null {
  if (!secret) return null;
  return createHmac('sha256', secret).update(`daily-reminder-unsub:${userId}`).digest('base64url');
}
export function unsubscribeValid(userId: string, token: string, secret: string | undefined): boolean {
  const want = unsubscribeToken(userId, secret);
  if (!want || want.length !== token.length) return false;
  return timingSafeEqual(Buffer.from(want), Buffer.from(token));
}

export function parseHour(v: unknown): number | null {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 23 ? v : null;
}

/** Can this request subscribe? Only with the "15 or older" box ticked. */
export function maySubscribe(body: { age15?: unknown }): boolean {
  return body.age15 === true;
}

export interface ReminderRow {
  hour_utc: number;
  confirmed_at: string | null;
  last_sent_on: string | null;
}

/** Is a reminder due now: confirmed, the chosen hour, not sent today, and the daily not played today. */
export function isDue(row: ReminderRow, now: Date, playedToday: boolean): boolean {
  if (!row.confirmed_at || playedToday) return false;
  if (row.hour_utc !== now.getUTCHours()) return false;
  return row.last_sent_on !== now.toISOString().slice(0, 10);
}

export interface ReminderMail { subject: string; html: string; text: string; headers: Record<string, string> }

/**
 * The reminder: calm, one line of purpose, a plain link to the daily, the unsubscribe link. No streak threat, no pixel.
 * `origin` is the site's origin; the unsubscribe URL carries the player's token.
 */
export function reminderMail(brandName: string, origin: string, unsubscribeUrl: string): ReminderMail {
  const play = `${origin}/daily?from=nav`;
  const text = [`Today's ${brandName} quiz of the day is ready.`, '', `Play it: ${play}`, '', `You get this email because you asked for a daily reminder. Stop it in one click: ${unsubscribeUrl}`].join('\n');
  const html = `<p>Today's ${esc(brandName)} quiz of the day is ready.</p><p><a href="${esc(play)}">Play the quiz of the day</a></p><p style="color:#666;font-size:12px">You get this email because you asked for a daily reminder. <a href="${esc(unsubscribeUrl)}">Unsubscribe in one click</a>.</p>`;
  return {
    subject: `Your ${brandName} quiz of the day`,
    html,
    text,
    headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  };
}

/** The double opt-in mail: one link, nothing else. */
export function confirmMail(brandName: string, confirmUrl: string): ReminderMail {
  const text = [`Confirm your daily reminder from ${brandName}.`, '', `Confirm: ${confirmUrl}`, '', 'If you did not ask for it, ignore this email: nothing starts without the link.'].join('\n');
  const html = `<p>Confirm your daily reminder from ${esc(brandName)}.</p><p><a href="${esc(confirmUrl)}">Confirm the reminder</a></p><p style="color:#666;font-size:12px">If you did not ask for it, ignore this email: nothing starts without the link.</p>`;
  return { subject: `Confirm your ${brandName} daily reminder`, html, text, headers: {} };
}

export type MailEnv = Record<string, string | undefined>

/** Sends through Resend (the existing sender). Fail soft: false on no key or any error. The address is never logged. */
export async function sendMail(to: string, mail: ReminderMail, fromName: string, domain: string, env: MailEnv, fetchImpl: typeof fetch): Promise<boolean> {
  const key = env['RESEND_API_KEY']?.trim();
  if (!key || !to) return false;
  try {
    const res = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env['SEND_EMAIL_FROM_KPOP'] ?? `${fromName} <no-reply@${domain}>`,
        to: [to],
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        headers: mail.headers,
      }),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** The table is not there yet (L27 not applied): the routes then answer "not available" and the settings show nothing. */
export function tableMissing(error: { code?: string; message?: string } | null | undefined): boolean {
  return !!error && (error.code === '42P01' || error.code === 'PGRST205' || /daily_reminders/.test(error.message ?? ''));
}
