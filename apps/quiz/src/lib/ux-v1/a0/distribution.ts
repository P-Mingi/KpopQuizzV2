// "How everyone came out" (SYSTEM.md 5.2): the share of results per outcome.
// Real data only: a row whose share is not a real number is dropped, and the
// caller hides the whole block when nothing is left. The printed label is the
// real share; the bar is scaled to the largest share so small shares stay
// readable (the scale changes the drawing, never the number).

export interface DistributionInput {
  id: string;
  label: string;
  /** Share of all results, 0 to 100. */
  pct: number;
}

export interface DistributionRow extends DistributionInput {
  /** Bar width in percent of the track (largest share = 100). */
  width: number;
  /** "16%". */
  text: string;
  /** The viewer's own result. */
  me: boolean;
}

export function distributionRows(items: readonly DistributionInput[], meId?: string | null): DistributionRow[] {
  const real = items.filter((r) => Number.isFinite(r.pct) && r.pct >= 0 && r.pct <= 100);
  const sorted = [...real].sort((a, b) => b.pct - a.pct);
  const max = sorted[0]?.pct ?? 0;
  return sorted.map((r) => ({
    ...r,
    width: max > 0 ? Math.round((r.pct / max) * 100) : 0,
    text: `${Math.round(r.pct)}%`,
    me: meId != null && r.id === meId,
  }));
}
