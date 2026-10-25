// SEO monitoring alerts. The repo's ops channel, reused as is: the Discord webhook in
// DISCORD_ALERT_WEBHOOK_URL that lib/industry/alert.ts and lib/verse/alert.ts already post to
// from the Vercel crons (one ops channel, not a parallel system; the nightly seo-gates.yml
// workflow posts to the same channel through its DISCORD_ALERT_WEBHOOK secret). Fail soft: no
// webhook = the message only goes to the logs; a failed post is swallowed. The webhook URL is
// never logged. Messages carry URLs, counts and group names only, never user data.

import { isWatchDryRun } from './env';

import type { Env } from './env';

export type AlertOutcome = 'sent' | 'dry_run' | 'no_webhook' | 'failed';

type PostFn = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{ ok: boolean }>;

export async function seoAlert(
  context: string,
  detail: string,
  opts: { env?: Env; dryRun?: boolean; post?: PostFn } = {},
): Promise<AlertOutcome> {
  const env = opts.env ?? process.env;
  const message = `:warning: [seo/${context}] ${detail}`.slice(0, 1900);
  if (opts.dryRun || isWatchDryRun(env)) {
    console.log(`[seo/${context}] dry run, alert not sent: ${detail}`);
    return 'dry_run';
  }
  const webhook = env.DISCORD_ALERT_WEBHOOK_URL;
  if (!webhook) {
    console.error(`[seo/${context}] ${detail} (no DISCORD_ALERT_WEBHOOK_URL; alert not sent)`);
    return 'no_webhook';
  }
  const post: PostFn = opts.post ?? ((url, init) => fetch(url, init));
  try {
    const res = await post(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message, allowed_mentions: { parse: [] } }),
    });
    return res.ok ? 'sent' : 'failed';
  } catch {
    console.error(`[seo/${context}] ${detail} (alert post failed)`);
    return 'failed';
  }
}
