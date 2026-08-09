// MOBILE-RAIL C: a compact, horizontally scrollable key-facts strip shown ONLY on mobile
// (< 960px, CSS-gated), right under the hero. It is a SECOND presentation of fact rows the
// caller already computed for the fact sheet (no new fetch): the first few rows as pills.
import type { FactSection } from '@/lib/verse/tree/factrail';

/** Flatten fact sections to pill rows, dropping any keys the caller wants hidden
 * (e.g. 'name' on a member page, which is already the page title), capped to `limit`. */
export function factStripRows(sections: FactSection[] | null, opts?: { hideKeys?: string[]; limit?: number }): { key: string; dt: string; dd: string }[] {
  if (!sections) return [];
  const hide = new Set(opts?.hideKeys ?? []);
  return sections
    .flatMap((s) => s.rows)
    .filter((r) => !hide.has(r.key))
    .slice(0, opts?.limit ?? 5)
    .map((r) => ({ key: r.key, dt: r.dt, dd: r.dd }));
}

export function FactStrip({ rows }: { rows: { key: string; dt: string; dd: string }[] }): React.ReactElement | null {
  if (!rows.length) return null;
  return (
    <div className="vh2-factstrip" role="list" aria-label="Key facts">
      {rows.map((r) => (
        <span className="vh2-fpill" role="listitem" key={r.key}>
          <span className="k">{r.dt}</span><b>{r.dd}</b>
        </span>
      ))}
    </div>
  );
}
