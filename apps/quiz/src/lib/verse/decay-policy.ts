// W4.9 - role-decay policy: pure helpers + thresholds, safe to import from client code
// (no server dependency). The job that actually demotes lives in decay.ts (server-only).

export const CURATOR_FLAG_DAYS = 60;    // shown as "inactive" in the member manager
export const CURATOR_DECAY_DAYS = 120;  // auto-demoted curator -> contributor

const DAY = 86400000;

/** Days since a member last did anything (contributed, or joined if never). */
export function inactiveDays(row: { last_contrib_date: string | null; joined_at: string }): number {
  const last = row.last_contrib_date ?? row.joined_at;
  return Math.floor((Date.now() - new Date(last).getTime()) / DAY);
}

export function isStaleCurator(row: { role: string; last_contrib_date: string | null; joined_at: string }): boolean {
  return row.role === 'curator' && inactiveDays(row) >= CURATOR_FLAG_DAYS;
}
