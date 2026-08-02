import Link from 'next/link';
import { SectionHeader } from '@/components/verse/primitives/section-header';

import { getCollectionProgress } from '@/lib/verse/photocards';

/** W5.2 - photocard collection progress on the passport. Min-gated: renders nothing
 * until the user owns at least one card, so a fresh profile stays uncluttered. Server
 * component; shows total owned + a per-group owned/total bar for the groups collected. */
export async function PhotocardCollectionCard({ userId }: { userId: string }): Promise<React.ReactElement | null> {
  const prog = await getCollectionProgress(userId);
  if (prog.owned === 0) return null;

  const groups = prog.perGroup.filter((g) => g.total > 0).slice(0, 6);

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-card)', padding: 16, marginTop: 14, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>
      <div className="mb-3 flex items-baseline justify-between">
        <SectionHeader kicker="Photocard collection" as="h2" />
        <span className="text-xs text-tertiary tabular-nums">
          {prog.owned} owned{prog.wanted > 0 ? ` · ${prog.wanted} wanted` : ''}
        </span>
      </div>

      {groups.length > 0 ? (
        <ul className="flex flex-col gap-2.5">
          {groups.map((g) => {
            const pct = g.total > 0 ? Math.round((Math.min(g.owned, g.total) / g.total) * 100) : 0;
            const complete = g.owned >= g.total;
            return (
              <li key={g.groupId}>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <Link href={`/verse/${g.slug}/photocards`} className="truncate text-[13px] font-semibold text-primary hover:underline">{g.name}</Link>
                  <span className="flex-shrink-0 text-[11px] tabular-nums" style={{ color: complete ? 'var(--text-accent)' : 'var(--txt3)' }}>{g.owned}/{g.total}{complete ? ' · full set' : ''}</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: 'var(--text-accent)' }} />
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
