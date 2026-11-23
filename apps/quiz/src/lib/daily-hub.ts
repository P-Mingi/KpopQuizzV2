// Audit 01 P2-9: the daily hub page at /daily. Server flag DAILY_HUB=1 (off by default): off, /daily redirects to today's quiz exactly as
// before (now through /daily/play); on, it is a page with the quiz and the blindtest (and a link to Kpopdle where the hub serves it), the streak and a countdown.
export function dailyHubOn(env: Record<string, string | undefined> = process.env): boolean {
  return env['DAILY_HUB'] === '1';
}

// SEO-LAUNCH-1 (lane C, owner 2026-11-23): this page owns the cluster "daily kpop quiz" (docs/seo/TARGETS.md). "Kpopdle" is not in its title, H1 or description: that name belongs to
// bunnyverse.org/kpopdle, and a second page on kpopquiz.org was competing for it. The page still links to Kpopdle in its list of games.
export const DAILY_HUB_TITLE = 'Daily K-pop quiz and blindtest';
export const DAILY_HUB_H1 = DAILY_HUB_TITLE;
export const DAILY_HUB_DESCRIPTION = 'Play the daily K-pop quiz and the daily blindtest. One shared set a day for every fan, with your streak and a countdown to the next.';

/** The answer block (kpopquiz-seo section 3): what the page is, and one number with its date and denominator. Real data or no number. */
export function dailyHubAnswer(f: { date: string; questions: number | null }): string {
  const day = new Date(`${f.date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const count = f.questions && f.questions > 0 ? ` On ${day}, the daily K-pop quiz has ${f.questions} questions.` : '';
  return `The daily K-pop quiz is one quiz that every fan plays on the same day. It changes at midnight UTC.${count} The daily blindtest asks you to guess songs from short clips. Play them, keep your streak, and come back tomorrow.`;
}
