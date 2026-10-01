// P3 group alerts ("Notify me" on an empty group hub). The table comes from
// docs/pending-migrations/v11-p3-group-quiz-alerts.sql (owner-run, not applied):
// every caller treats a missing table as "not live" and writes nothing.

export const ALERTS_TABLE = 'group_quiz_alerts';

/** Postgres "undefined table" (42P01) or PostgREST "not in the schema cache"
 *  (PGRST205 / PGRST202): the pending migration has not been applied. */
export function isMissingTable(error: { code?: string | null; message?: string | null } | null | undefined): boolean {
  if (!error) return false;
  const code = error.code ?? '';
  if (code === '42P01' || code === 'PGRST205' || code === 'PGRST202') return true;
  const msg = (error.message ?? '').toLowerCase();
  return msg.includes('does not exist') || msg.includes('schema cache');
}

/** A positive integer group id from a query string or a JSON body, else null. */
export function parseGroupId(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : NaN;
  return Number.isInteger(n) && n > 0 && n < 2_147_483_647 ? n : null;
}

/** The hub's Notify me states, from GET /api/ux-v1/p3/notify. */
export interface AlertState {
  live: boolean;
  signedIn: boolean;
  subscribed: boolean;
}
