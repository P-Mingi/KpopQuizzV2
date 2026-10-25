// SEO Mission 3, part D (monitoring): the switches every monitoring job reads.
//
//   SEO_WATCH_DRY_RUN=1      nothing leaves the server: no e-mail, no Discord post, no IndexNow
//                            enqueue or ping, no write. The jobs still read, compute and return
//                            what they would have sent. A cron URL with ?dry=1 does the same for
//                            one manual run.
//   SEO_SPIKE_INDEXNOW=0     a play spike still e-mails the owner but does not enqueue the hub
//                            for IndexNow (see spike-job.ts for why this switch exists).
//
// Env values are read with direct property access so the same code works in the middleware
// (edge) and in route handlers.

const TRUE = /^(1|true|yes|on)$/i;
const FALSE = /^(0|false|no|off)$/i;

export type Env = Record<string, string | undefined>;

export function isWatchDryRun(env: Env = process.env): boolean {
  return TRUE.test((env.SEO_WATCH_DRY_RUN ?? '').trim());
}

/** The IndexNow helper's own dry-run switch (the same name the IndexNow outbox branch reads). */
export function isIndexNowDryRun(env: Env = process.env): boolean {
  return TRUE.test((env.INDEXNOW_DRY_RUN ?? '').trim());
}

/** On unless the owner sets SEO_SPIKE_INDEXNOW to 0, false, no or off. */
export function spikeIndexNowOn(env: Env = process.env): boolean {
  return !FALSE.test((env.SEO_SPIKE_INDEXNOW ?? '').trim());
}

/** A cron request that asks for a dry run (?dry=1), on top of the env switch. */
export function dryRunRequested(url: string, env: Env = process.env): boolean {
  if (isWatchDryRun(env)) return true;
  try {
    return TRUE.test(new URL(url).searchParams.get('dry') ?? '');
  } catch {
    return false;
  }
}

/** The User-Agent of every monitoring request: browser-compatible, names the site, nothing personal. */
export const WATCH_USER_AGENT = 'Mozilla/5.0 (compatible; kpopquiz.org link check)';

export const SITE_ORIGIN = 'https://kpopquiz.org';
