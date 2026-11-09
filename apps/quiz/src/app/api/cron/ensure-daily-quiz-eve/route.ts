/**
 * Audit 01 P0-4: the 23:50 UTC run of ensure-daily-quiz, which publishes tomorrow's quiz before the day changes (the handler picks
 * today or tomorrow from the clock: before noon UTC today, after noon tomorrow). vercel.json keeps one path per cron
 * (vercel-config.test.ts), so this path serves the same handler, with the same Bearer CRON_SECRET check. The 00:05 run stays on
 * /api/cron/ensure-daily-quiz as the idempotent safety net and the slot of the nightly dle maintenance.
 */
export const dynamic = 'force-dynamic';

export { GET } from '../ensure-daily-quiz/route';
